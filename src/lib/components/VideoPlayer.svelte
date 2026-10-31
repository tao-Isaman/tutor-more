<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { onDestroy } from 'svelte';
	import type { Database } from '#lib/database.types.ts';

	/**
	 * HTML5 player that reports which seconds were *actually played*.
	 * Contiguous playback is grouped into [from, to) segments; seeking closes a segment.
	 * Segments are flushed every FLUSH_MS and on pause/end/tab-hide. The server merges
	 * segments as a multirange, so re-watching never inflates the total.
	 */
	let {
		src,
		contentId,
		supabase,
		startAt = 0,
		poster,
		onprogress
	}: {
		src: string;
		contentId: string;
		supabase: SupabaseClient<Database>;
		startAt?: number;
		poster?: string;
		onprogress?: (p: { watched_seconds: number; duration_seconds: number; completed: boolean }) => void;
	} = $props();

	const FLUSH_MS = 10_000;
	const JUMP_TOLERANCE = 2; // seconds of timeupdate gap still treated as continuous

	let video = $state<HTMLVideoElement>();
	let segStart: number | null = null;
	let lastTime = 0;
	let flushing = false;
	let timer: ReturnType<typeof setInterval> | undefined;

	function duration() {
		return video && Number.isFinite(video.duration) ? Math.floor(video.duration) : 0;
	}

	async function flush() {
		if (!video || segStart === null || flushing) return;
		const from = Math.floor(segStart);
		const to = Math.floor(lastTime);
		if (to <= from) return;
		segStart = lastTime; // next segment continues from here
		flushing = true;
		const { data, error } = await supabase.rpc('record_video_progress', {
			p_content_id: contentId,
			p_from: from,
			p_to: to,
			p_position: Math.floor(video.currentTime),
			p_duration: duration()
		});
		flushing = false;
		if (!error && data?.[0]) onprogress?.(data[0]);
	}

	function onTimeUpdate() {
		if (!video) return;
		const t = video.currentTime;
		if (video.paused || video.seeking) {
			lastTime = t;
			return;
		}
		if (segStart === null) {
			segStart = t;
		} else if (t < lastTime || t - lastTime > JUMP_TOLERANCE) {
			// a seek happened: close the segment that ended at lastTime and start a new one
			void flush();
			segStart = t;
		}
		lastTime = t;
	}

	function onLoaded() {
		if (video && startAt > 5 && startAt < duration() - 5) video.currentTime = startAt;
		lastTime = video?.currentTime ?? 0;
	}

	function onPause() {
		void flush().then(() => (segStart = null));
	}

	function onVisibility() {
		if (document.visibilityState === 'hidden') void flush();
	}

	$effect(() => {
		timer = setInterval(() => void flush(), FLUSH_MS);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			clearInterval(timer);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	});

	onDestroy(() => void flush());
</script>

<!-- svelte-ignore a11y_media_has_caption -->
<video
	bind:this={video}
	{src}
	{poster}
	controls
	playsinline
	preload="metadata"
	controlsList="nodownload"
	oncontextmenu={(e) => e.preventDefault()}
	onloadedmetadata={onLoaded}
	ontimeupdate={onTimeUpdate}
	onpause={onPause}
	onended={onPause}
	onseeking={() => void flush()}
	class="aspect-video w-full rounded-2xl bg-black"
></video>
