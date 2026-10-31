import type { SupabaseClient } from '@supabase/supabase-js';
import { Upload } from 'tus-js-client';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';

/**
 * Resumable (TUS) upload to Supabase Storage with progress — needed for lesson videos,
 * which are too large for a single request on flaky campus Wi-Fi.
 */
export async function uploadResumable(
	supabase: SupabaseClient,
	bucket: string,
	path: string,
	file: File,
	onProgress: (pct: number) => void
): Promise<void> {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session) throw new Error('Please log in again');

	await new Promise<void>((resolve, reject) => {
		const upload = new Upload(file, {
			endpoint: `${PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
			retryDelays: [0, 3000, 5000, 10000, 20000],
			headers: {
				authorization: `Bearer ${session.access_token}`,
				apikey: PUBLIC_SUPABASE_PUBLISHABLE_KEY,
				'x-upsert': 'false'
			},
			uploadDataDuringCreation: true,
			removeFingerprintOnSuccess: true,
			metadata: {
				bucketName: bucket,
				objectName: path,
				contentType: file.type || 'application/octet-stream',
				cacheControl: '3600'
			},
			chunkSize: 6 * 1024 * 1024, // Supabase requires exactly 6MB chunks
			onError: (err) => reject(err),
			onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
			onSuccess: () => resolve()
		});
		upload.findPreviousUploads().then((prev) => {
			if (prev.length) upload.resumeFromPreviousUpload(prev[0]);
			upload.start();
		});
	});
}

/** Read a local video's duration before uploading it. */
export function readVideoDuration(file: File): Promise<number | null> {
	return new Promise((resolve) => {
		const url = URL.createObjectURL(file);
		const v = document.createElement('video');
		v.preload = 'metadata';
		v.onloadedmetadata = () => {
			URL.revokeObjectURL(url);
			resolve(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
		};
		v.onerror = () => {
			URL.revokeObjectURL(url);
			resolve(null);
		};
		v.src = url;
	});
}

export function safeFileName(name: string) {
	const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
	return `${crypto.randomUUID()}${ext ? '.' + ext : ''}`;
}
