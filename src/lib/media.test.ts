import assert from 'node:assert/strict';
import { test } from 'node:test';
import { VIDEO_ACCEPT, driveFileId, drivePreviewUrl, sniffVideoCodec, videoContentType } from './media.ts';

const ID = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345-';

test('a Drive file link in any of its usual forms gives the file id', () => {
	for (const link of [
		`https://drive.google.com/file/d/${ID}/view?usp=drivesdk`,
		`https://drive.google.com/file/d/${ID}/view?usp=sharing`,
		`https://drive.google.com/file/d/${ID}/preview`,
		`https://drive.google.com/file/d/${ID}`,
		`https://drive.google.com/file/u/1/d/${ID}/edit`,
		`https://drive.google.com/open?id=${ID}`,
		`https://drive.google.com/uc?export=download&id=${ID}`,
		`https://docs.google.com/file/d/${ID}/edit`,
		`  https://drive.google.com/file/d/${ID}/view  `
	]) {
		assert.equal(driveFileId(link), ID, link);
	}
	assert.equal(drivePreviewUrl(`https://drive.google.com/open?id=${ID}`), `https://drive.google.com/file/d/${ID}/preview`);
});

test('links that are not one Drive file are left alone', () => {
	for (const link of [
		`https://drive.google.com/drive/folders/${ID}`,
		`https://docs.google.com/document/d/${ID}/edit`,
		`http://drive.google.com/file/d/${ID}/view`,
		`https://drive.google.com.example.com/file/d/${ID}/view`,
		`https://example.com/file/d/${ID}/view`,
		`https://example.com/?next=https://drive.google.com/file/d/${ID}/view`,
		'https://drive.google.com/file/d/short/view',
		'https://drive.google.com/file/d/bad"id<script>x/view',
		'https://drive.google.com/open',
		'not a link',
		''
	]) {
		assert.equal(driveFileId(link), null, link);
		assert.equal(drivePreviewUrl(link), null, link);
	}
});

test('a .mov is a video whether or not the browser names its type', () => {
	assert.equal(videoContentType({ name: 'clip.mov', type: 'video/quicktime' }), 'video/quicktime');
	assert.equal(videoContentType({ name: 'CLIP.MOV', type: '' }), 'video/quicktime');
	assert.equal(videoContentType({ name: 'clip.mov', type: 'application/octet-stream' }), 'video/quicktime');
	assert.equal(videoContentType({ name: 'clip.mp4', type: '' }), 'video/mp4');
	assert.equal(videoContentType({ name: 'clip.mp4', type: 'video/mp4' }), 'video/mp4');
	assert.equal(videoContentType({ name: 'lesson.mkv', type: 'video/x-matroska' }), 'video/x-matroska');
});

test('a file that is not a video is refused', () => {
	assert.equal(videoContentType({ name: 'notes.pdf', type: 'application/pdf' }), null);
	assert.equal(videoContentType({ name: 'trick.mov', type: 'application/pdf' }), null);
	assert.equal(videoContentType({ name: 'photo.png', type: 'image/png' }), null);
	assert.equal(videoContentType({ name: 'noextension', type: '' }), null);
	assert.equal(videoContentType({ name: 'archive.zip', type: '' }), null);
});

test('the file picker names .mov as well as video/*', () => {
	const parts = VIDEO_ACCEPT.split(',');
	assert.ok(parts.includes('video/*'));
	assert.ok(parts.includes('.mov'));
	assert.ok(parts.includes('.mp4'));
});

// --- made-up files: just the boxes the reader looks at ---
function box(type: string, ...parts: Uint8Array[]) {
	const size = 8 + parts.reduce((n, p) => n + p.length, 0);
	const out = new Uint8Array(size);
	new DataView(out.buffer).setUint32(0, size);
	out.set(new TextEncoder().encode(type), 4);
	let at = 8;
	for (const p of parts) {
		out.set(p, at);
		at += p.length;
	}
	return out;
}
function stsd(format: string) {
	const entry = box(format, new Uint8Array(16));
	const head = new Uint8Array(8);
	new DataView(head.buffer).setUint32(4, 1); // one entry
	return box('stsd', head, entry);
}
const track = (format: string) => box('trak', box('mdia', box('minf', box('stbl', stsd(format)))));
const file = (...boxes: Uint8Array[]) => new Blob(boxes as BlobPart[]);
const ftyp = box('ftyp', new TextEncoder().encode('qt  '), new Uint8Array(4));
const mdat = box('mdat', new Uint8Array(5000));

test('an iPhone-style .mov (index at the end, HEVC) is recognised as HEVC', async () => {
	assert.equal(await sniffVideoCodec(file(ftyp, box('wide'), mdat, box('moov', track('hvc1'), track('mp4a')))), 'hevc');
	assert.equal(await sniffVideoCodec(file(ftyp, box('moov', track('mp4a'), track('dvh1')), mdat)), 'hevc');
});

test('an H.264 file is recognised as H.264', async () => {
	assert.equal(await sniffVideoCodec(file(ftyp, box('moov', track('avc1'), track('mp4a')), mdat)), 'h264');
	assert.equal(await sniffVideoCodec(file(ftyp, mdat, box('moov', track('avc1')))), 'h264');
});

test('another video codec is reported as other, and sound alone as nothing', async () => {
	assert.equal(await sniffVideoCodec(file(ftyp, box('moov', track('apcn'), track('mp4a')))), 'other');
	assert.equal(await sniffVideoCodec(file(ftyp, box('moov', track('mp4a')))), null);
});

test('a box with a 64-bit size is stepped over', async () => {
	const big = new Uint8Array(16 + 300);
	const v = new DataView(big.buffer);
	v.setUint32(0, 1);
	big.set(new TextEncoder().encode('mdat'), 4);
	v.setBigUint64(8, BigInt(big.length));
	assert.equal(await sniffVideoCodec(file(ftyp, big, box('moov', track('hev1')))), 'hevc');
});

test('a file that is not MP4 or QuickTime gives nothing, without failing', async () => {
	assert.equal(await sniffVideoCodec(new Blob([])), null);
	assert.equal(await sniffVideoCodec(new Blob([new Uint8Array(3)])), null);
	assert.equal(await sniffVideoCodec(new Blob([new TextEncoder().encode('just some text, long enough to read a header from')])), null);
	assert.equal(await sniffVideoCodec(new Blob([new Uint8Array(4096)])), null);
	assert.equal(await sniffVideoCodec(file(ftyp, mdat)), null);
});
