<script lang="ts">
	import jsQR from 'jsqr';
	import { CameraOff } from '@lucide/svelte';

	let { onscan }: { onscan: (text: string) => void } = $props();

	let video = $state<HTMLVideoElement>();
	let error = $state('');
	let done = false;

	$effect(() => {
		let stream: MediaStream | undefined;
		let raf = 0;
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d', { willReadFrequently: true });

		const tick = () => {
			if (done || !video) return;
			if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
				const w = video.videoWidth;
				const h = video.videoHeight;
				// scan the centre square only — faster and matches the on-screen frame
				const size = Math.min(w, h);
				canvas.width = canvas.height = Math.min(size, 640);
				ctx.drawImage(video, (w - size) / 2, (h - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
				const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
				const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
				if (code?.data) {
					done = true;
					navigator.vibrate?.(80);
					onscan(code.data);
					return;
				}
			}
			raf = requestAnimationFrame(tick);
		};

		navigator.mediaDevices
			?.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
			.then((s) => {
				stream = s;
				if (!video) return;
				video.srcObject = s;
				void video.play();
				raf = requestAnimationFrame(tick);
			})
			.catch(() => {
				error = 'เปิดกล้องไม่ได้ กรุณาอนุญาตให้เข้าถึงกล้อง หรือสแกน QR ด้วยแอปกล้องของมือถือแทน';
			});
		if (!navigator.mediaDevices) error = 'เบราว์เซอร์นี้เปิดกล้องไม่ได้';

		return () => {
			done = true;
			cancelAnimationFrame(raf);
			stream?.getTracks().forEach((t) => t.stop());
		};
	});
</script>

<div class="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-3xl bg-ink">
	{#if error}
		<div class="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-white/80">
			<CameraOff size={36} />
			<p>{error}</p>
		</div>
	{:else}
		<video bind:this={video} playsinline muted class="h-full w-full object-cover"></video>
		<div class="pointer-events-none absolute inset-[12%] rounded-3xl border-4 border-sun-400 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]"></div>
		<p class="absolute inset-x-0 bottom-4 text-center text-sm text-white">เล็งกล้องไปที่ QR code บนจอของติวเตอร์</p>
	{/if}
</div>
