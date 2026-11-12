/** Video file types the site accepts, by extension. QuickTime (.mov) is what phones and Macs record. */
const VIDEO_TYPES: Record<string, string> = {
	mp4: 'video/mp4',
	m4v: 'video/x-m4v',
	mov: 'video/quicktime',
	qt: 'video/quicktime',
	webm: 'video/webm',
	ogv: 'video/ogg'
};

/** For a file input: some pickers do not list .mov under "video/*", so the extensions are named too. */
export const VIDEO_ACCEPT = ['video/*', ...Object.keys(VIDEO_TYPES).map((e) => '.' + e)].join(',');

function extension(name: string) {
	const dot = name.lastIndexOf('.');
	return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * The content type to store a picked video under, or null when the file is not a video.
 * Windows and some Android browsers report no type at all for .mov, so the extension decides then.
 */
export function videoContentType(file: { name: string; type: string }): string | null {
	if (file.type.startsWith('video/')) return file.type;
	if (file.type && file.type !== 'application/octet-stream') return null;
	return VIDEO_TYPES[extension(file.name)] ?? null;
}

const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com']);
const DRIVE_ID = /^[A-Za-z0-9_-]{10,}$/;

/**
 * The file id inside a Google Drive link to one file, or null for anything else
 * (a folder, a Docs/Sheets document, another site).
 */
export function driveFileId(link: string): string | null {
	let url: URL;
	try {
		url = new URL(link.trim());
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' || !DRIVE_HOSTS.has(url.hostname)) return null;

	// /file/d/<id>/view, /file/u/1/d/<id>/preview
	const inPath = url.pathname.match(/^\/file\/(?:u\/\d+\/)?d\/([^/]+)/);
	// /open?id=<id>, /uc?id=<id>&export=download
	const id = inPath ? inPath[1] : /^\/(open|uc)$/.test(url.pathname) ? url.searchParams.get('id') : null;
	return id && DRIVE_ID.test(id) ? id : null;
}

/** The address that shows a Drive file in Drive's own player, for an iframe. */
export function drivePreviewUrl(link: string): string | null {
	const id = driveFileId(link);
	return id ? `https://drive.google.com/file/d/${id}/preview` : null;
}

export type VideoCodec = 'h264' | 'hevc' | 'other';

const HEVC = new Set(['hvc1', 'hev1', 'dvh1', 'dvhe']);
const H264 = new Set(['avc1', 'avc3']);
const NOT_VIDEO = new Set(['mp4a', 'tmcd', 'mebx', 'text', 'tx3g', 'alac', 'lpcm', 'sowt', 'twos', 'ac-3', 'ec-3', 'Opus', 'fLaC']);
const MAX_MOOV = 32 * 1024 * 1024;

/**
 * Which video codec an MP4 or QuickTime file uses, read from its index ("moov") without loading
 * the picture data. null when the file is not that kind of file or the index cannot be found.
 * HEVC (H.265) is what iPhones record by default, and not every browser can play it.
 */
export async function sniffVideoCodec(file: Blob): Promise<VideoCodec | null> {
	let at = 0;
	for (let i = 0; i < 64 && at + 8 <= file.size; i++) {
		const head = new DataView(await file.slice(at, at + 16).arrayBuffer());
		let size = head.getUint32(0);
		const type = fourcc(head, 4);
		let headerSize = 8;
		if (size === 1 && head.byteLength >= 16) {
			size = Number(head.getBigUint64(8));
			headerSize = 16;
		} else if (size === 0) {
			size = file.size - at;
		}
		if (size < headerSize) return null;
		if (type === 'moov') {
			const end = Math.min(at + size, at + MAX_MOOV, file.size);
			return codecIn(new Uint8Array(await file.slice(at, end).arrayBuffer()));
		}
		at += size;
	}
	return null;
}

function fourcc(view: DataView, at: number) {
	return String.fromCharCode(view.getUint8(at), view.getUint8(at + 1), view.getUint8(at + 2), view.getUint8(at + 3));
}

/** Reads the first sample format of every track's "stsd" table. */
function codecIn(moov: Uint8Array): VideoCodec | null {
	const view = new DataView(moov.buffer, moov.byteOffset, moov.byteLength);
	const found = new Set<string>();
	for (let i = 0; i + 20 <= moov.length; i++) {
		// 's' 't' 's' 'd', then version+flags (4), entry count (4), entry size (4), entry format (4)
		if (moov[i] === 0x73 && moov[i + 1] === 0x74 && moov[i + 2] === 0x73 && moov[i + 3] === 0x64) {
			found.add(fourcc(view, i + 16));
		}
	}
	const formats = [...found];
	if (formats.some((f) => HEVC.has(f))) return 'hevc';
	if (formats.some((f) => H264.has(f))) return 'h264';
	return formats.some((f) => !NOT_VIDEO.has(f)) ? 'other' : null;
}
