<script lang="ts">
	import type { Snippet } from 'svelte';
	import Logo from './Logo.svelte';
	let { title, subtitle, children }: { title: string; subtitle: string; children: Snippet } = $props();
</script>

<div class="grid min-h-dvh bg-white lg:grid-cols-[1fr_1.1fr]">
	<aside class="relative hidden overflow-hidden bg-brand-600 p-12 text-white lg:flex lg:flex-col lg:justify-between">
		<div class="absolute -top-28 -left-20 h-96 w-96 rounded-full bg-brand-700"></div>
		<div class="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-sun-400"></div>
		<a href="/" class="relative flex items-center gap-3">
			<Logo size={52} />
			<span class="text-xl font-medium">ติวเตอร์มอร์ อะคาเดมี</span>
		</a>
		<div class="relative max-w-md">
			<p class="text-4xl leading-snug font-semibold">"ผลลัพธ์ที่ดี คือสิ่งที่พี่มุ่งหวัง"</p>
			<p class="mt-3 font-read text-lg text-white/85">ประสบการณ์การสอนที่ผ่านมาเป็นประกัน ติวแบบเห็นภาพ เข้าใจจริง ไม่ใช่แค่จำ</p>
		</div>
		<p class="relative text-sm text-white/70">ติวเตอร์วิชาวิศวกรรม · มหาวิทยาลัยเทคโนโลยีสุรนารี</p>
	</aside>
	<main class="flex items-center justify-center px-5 py-10">
		<div class="w-full max-w-md">
			<a href="/" class="mb-8 flex items-center gap-3 lg:hidden">
				<Logo size={40} />
				<span class="text-lg font-medium">ติวเตอร์มอร์ อะคาเดมี</span>
			</a>
			<h1 class="text-3xl">{title}</h1>
			<p class="mt-1 mb-8 text-muted">{subtitle}</p>
			{@render children()}
		</div>
	</main>
</div>
