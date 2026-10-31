/**
 * Client-side image optimisation before upload.
 *
 * Format: WebP — ~25–35% smaller than JPEG at the same visual quality and displayable in every
 * current browser. Browsers that can't *encode* WebP (older Safari) fall back to JPEG automatically.
 * Images are resized to what the UI actually displays, EXIF rotation is applied, and metadata
 * (GPS location etc.) is stripped as a side effect of re-encoding.
 */

export type ImagePreset = 'avatar' | 'cover' | 'lesson';

interface PresetConfig {
	/** Longest edge in px (or the square side when `square`) */
	maxSize: number;
	quality: number;
	/** Centre-crop to a square (profile photos) */
	square?: boolean;
}

const PRESETS: Record<ImagePreset, PresetConfig> = {
	// Shown at most ~120px; 512px keeps it sharp on 3x screens
	avatar: { maxSize: 512, quality: 0.85, square: true },
	// Subject covers fill cards/heroes up to ~1200px wide
	cover: { maxSize: 1600, quality: 0.82 },
	// Lesson images (whiteboards, diagrams, handouts) need small text to stay readable
	lesson: { maxSize: 2400, quality: 0.88 }
};

/** Formats we pass through untouched: animation / vector would be lost by re-encoding */
const PASSTHROUGH = new Set(['image/gif', 'image/svg+xml']);

/** Largest file we accept *before* optimisation (phone photos are often 5–15 MB) */
export const MAX_INPUT_BYTES = 30 * 1024 * 1024;

export interface OptimisedImage {
	file: File;
	originalBytes: number;
	width: number;
	height: number;
	/** true when the original was kept (already small enough, or a GIF/SVG) */
	unchanged: boolean;
}

export class ImageDecodeError extends Error {}

async function decode(file: File): Promise<ImageBitmap | HTMLImageElement> {
	try {
		// Applies EXIF orientation, so portrait phone photos aren't sideways
		return await createImageBitmap(file, { imageOrientation: 'from-image' });
	} catch {
		const url = URL.createObjectURL(file);
		try {
			const img = new Image();
			img.decoding = 'async';
			img.src = url;
			await img.decode();
			return img;
		} catch {
			throw new ImageDecodeError('ไม่รองรับไฟล์รูปนี้ (เช่น HEIC) กรุณาเลือกไฟล์ JPG หรือ PNG');
		} finally {
			URL.revokeObjectURL(url);
		}
	}
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
	return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

function renamed(name: string, ext: string) {
	const base = name.replace(/\.[^.]+$/, '') || 'image';
	return `${base}.${ext}`;
}

export async function optimiseImage(file: File, preset: ImagePreset): Promise<OptimisedImage> {
	if (!file.type.startsWith('image/')) throw new ImageDecodeError('กรุณาเลือกไฟล์รูปภาพ');
	if (file.size > MAX_INPUT_BYTES) throw new ImageDecodeError('รูปมีขนาดใหญ่เกิน 30 MB');

	if (PASSTHROUGH.has(file.type)) {
		return { file, originalBytes: file.size, width: 0, height: 0, unchanged: true };
	}

	const cfg = PRESETS[preset];
	const src = await decode(file);
	const sw = 'naturalWidth' in src ? src.naturalWidth : src.width;
	const sh = 'naturalHeight' in src ? src.naturalHeight : src.height;

	// Source rectangle (centre crop for squares) and target size (never upscale)
	let sx = 0,
		sy = 0,
		sWidth = sw,
		sHeight = sh;
	if (cfg.square) {
		const side = Math.min(sw, sh);
		sx = (sw - side) / 2;
		sy = (sh - side) / 2;
		sWidth = sHeight = side;
	}
	const scale = Math.min(1, cfg.maxSize / Math.max(sWidth, sHeight));
	const width = Math.round(sWidth * scale);
	const height = Math.round(sHeight * scale);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new ImageDecodeError('เบราว์เซอร์นี้ประมวลผลรูปไม่ได้');
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(src, sx, sy, sWidth, sHeight, 0, 0, width, height);
	if ('close' in src) src.close();

	let blob = await toBlob(canvas, 'image/webp', cfg.quality);
	let ext = 'webp';
	if (!blob || blob.type !== 'image/webp') {
		// No WebP encoder (older Safari): JPEG needs an opaque background for transparent PNGs
		ctx.globalCompositeOperation = 'destination-over';
		ctx.fillStyle = '#ffffff';
		ctx.fillRect(0, 0, width, height);
		blob = await toBlob(canvas, 'image/jpeg', cfg.quality);
		ext = 'jpg';
	}
	if (!blob) throw new ImageDecodeError('ประมวลผลรูปไม่สำเร็จ');

	// Already small and no resize/crop needed → keep the original bytes
	const resized = scale < 1 || cfg.square;
	if (!resized && blob.size >= file.size) {
		return { file, originalBytes: file.size, width: sw, height: sh, unchanged: true };
	}

	return {
		file: new File([blob], renamed(file.name, ext), { type: blob.type, lastModified: Date.now() }),
		originalBytes: file.size,
		width,
		height,
		unchanged: false
	};
}

/** "ลดขนาดจาก 4.2 MB เหลือ 180 KB" — for toasts after an upload */
export function savingsText(o: OptimisedImage, format: (n: number) => string): string | null {
	if (o.unchanged || o.file.size >= o.originalBytes) return null;
	return `ลดขนาดรูปจาก ${format(o.originalBytes)} เหลือ ${format(o.file.size)}`;
}
