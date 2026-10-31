<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		ArrowRight,
		BookOpen,
		CircleCheck,
		CirclePlay,
		MessageCircle,
		QrCode,
		ScanEye,
		Search,
		Sparkles,
		Users
	} from '@lucide/svelte';
	import Logo from '#lib/components/Logo.svelte';
	import SubjectCard from '#lib/components/SubjectCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let q = $state('');

	const popular = $derived(
		data.subjects.length
			? data.subjects.slice(0, 4).map((s) => s.title)
			: ['Engineering Statics', 'Calculus', 'Physics', 'Dynamics']
	);

	function search(e: SubmitEvent) {
		e.preventDefault();
		void goto(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : '/explore');
	}

	const features = [
		{ icon: Sparkles, title: 'บทเรียนครบในที่เดียว', text: 'วิดีโอ เอกสาร รูปภาพ และแบบฝึกหัด จัดเป็นหมวดตามวิชาและเทอม' },
		{ icon: QrCode, title: 'เช็คชื่อด้วย QR', text: 'สแกน QR ที่เปลี่ยนทุกไม่กี่วินาที พร้อมเช็คตำแหน่ง เช็คชื่อแทนกันไม่ได้' },
		{ icon: ScanEye, title: 'ติวเตอร์เห็นความคืบหน้า', text: 'รู้ว่าใครดูวิดีโอไหนไปแล้วเท่าไร ไม่มีใครเรียนตามไม่ทัน' },
		{ icon: MessageCircle, title: 'ถามได้ตลอด', text: 'ถาม-ตอบใต้ทุกบทเรียน และแชทส่วนตัวกับติวเตอร์' }
	];
</script>

<svelte:head>
	<title>ติวเตอร์มอร์ อะคาเดมี · ติววิศวะ มทส.</title>
</svelte:head>

<div class="min-h-dvh bg-white">
	<header class="sticky top-0 z-30 border-b border-line/70 bg-white/90 backdrop-blur">
		<div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
			<a href="/" class="flex items-center gap-3">
				<Logo size={36} />
				<div class="leading-tight">
					<div class="text-lg font-medium whitespace-nowrap">ติวเตอร์มอร์</div>
					<div class="hidden text-xs text-muted sm:block">Tutor More Academy</div>
				</div>
			</a>
			<nav class="flex items-center gap-1 sm:gap-2">
				<a href="/explore" class="btn btn-ghost hidden sm:inline-flex">ค้นหาคอร์ส</a>
				{#if data.user}
					<a href="/home" class="btn btn-dark">ไปที่ห้องเรียน <ArrowRight size={16} /></a>
				{:else}
					<a href="/login" class="btn btn-ghost">เข้าสู่ระบบ</a>
					<a href="/register" class="btn btn-primary">สมัครสมาชิก</a>
				{/if}
			</nav>
		</div>
	</header>

	<!-- Hero: white, typographic, search-first (Fastwork-style) -->
	<section class="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-12 pb-16 md:pt-20 lg:grid-cols-[1.1fr_1fr]">
		<div>
			<span class="inline-flex items-center gap-2 rounded-full bg-neutral-100 px-3 py-1 text-sm text-muted">
				<span class="h-1.5 w-1.5 rounded-full bg-brand-600"></span>
				สถาบันกวดวิชาวิศวกรรม สำหรับนักศึกษา มทส.
			</span>
			<h1 class="mt-6 text-[40px] leading-[1.2] font-semibold tracking-tight sm:text-6xl sm:leading-[1.15]">
				ติววิศวะให้
				<span class="whitespace-nowrap bg-[linear-gradient(transparent_62%,rgb(255_213_70/0.7)_62%,rgb(255_213_70/0.7)_92%,transparent_92%)]">เข้าใจจริง</span>
				<br />สอบผ่านอย่างมั่นใจ
			</h1>
			<p class="mt-5 max-w-lg text-lg text-muted">
				สถิตยศาสตร์ แคลคูลัส ฟิสิกส์ และอีกมากมาย สอนโดยรุ่นพี่วิศวะ มทส. ที่เคยผ่านมาก่อน ดูบทเรียนย้อนหลังได้ทุกที่ทุกเวลา
			</p>

			<form onsubmit={search} class="mt-8 flex max-w-xl items-center gap-2 rounded-full border border-line bg-white p-1.5 pl-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] focus-within:border-neutral-300">
				<Search size={20} class="shrink-0 text-subtle" />
				<input
					class="min-w-0 flex-1 bg-transparent py-2 text-[16px] outline-none placeholder:text-subtle"
					placeholder="อยากติววิชาอะไร? เช่น Statics"
					bind:value={q}
					aria-label="ค้นหาคอร์ส"
				/>
				<button class="btn btn-dark px-6">ค้นหา</button>
			</form>

			<div class="mt-5 flex flex-wrap items-center gap-2 text-sm">
				<span class="text-muted">วิชายอดนิยม:</span>
				{#each popular as p (p)}
					<a href="/explore?q={encodeURIComponent(p)}" class="rounded-full border border-line px-3 py-1 text-neutral-800 transition hover:border-neutral-300 hover:bg-neutral-50">{p}</a>
				{/each}
			</div>
		</div>

		<!-- Product preview: light, mostly white, a touch of brand colour -->
		<div class="relative hidden lg:block" aria-hidden="true">
			<div class="relative mx-auto aspect-[5/5] max-w-[460px] rounded-[36px] bg-canvas">
				<div class="absolute top-8 right-8 h-16 w-16 rounded-full bg-sun-300/60"></div>

				<!-- course card -->
				<div class="absolute top-12 left-10 w-[300px] rounded-3xl border border-line bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
					<div class="flex items-center gap-3">
						<span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600"><BookOpen size={20} /></span>
						<div>
							<div class="font-normal">Engineering Statics</div>
							<div class="text-sm text-muted">เทอม 2/2569 · 40 ที่นั่ง</div>
						</div>
					</div>
					<div class="mt-4 space-y-2.5">
						{#each [['บทที่ 1 เวกเตอร์ของแรง', 100], ['บทที่ 2 สมดุลของอนุภาค', 64], ['บทที่ 3 โมเมนต์', 0]] as [t, v] (t)}
							<div class="flex items-center gap-3 text-sm">
								<CirclePlay size={16} class={Number(v) === 100 ? 'text-success-600' : 'text-subtle'} />
								<span class="flex-1 truncate">{t}</span>
								<span class="text-xs text-muted">{v}%</span>
							</div>
						{/each}
					</div>
				</div>

				<!-- check-in toast -->
				<div class="absolute right-6 bottom-28 flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.08)]">
					<span class="flex h-9 w-9 items-center justify-center rounded-full bg-success-50 text-success-600"><CircleCheck size={20} /></span>
					<div class="text-sm">
						<div>เช็คชื่อสำเร็จ</div>
						<div class="text-xs text-muted">ห่างจากห้องเรียน 12 ม.</div>
					</div>
				</div>

				<!-- class stat -->
				<div class="absolute bottom-8 left-8 flex items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-white shadow-xl">
					<Users size={18} class="text-sun-400" />
					<span class="text-sm">มาเรียน 38/40 คน</span>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section class="border-t border-line bg-white">
		<div class="mx-auto grid max-w-6xl gap-x-8 gap-y-10 px-5 py-16 sm:grid-cols-2 lg:grid-cols-4">
			{#each features as f (f.title)}
				<div>
					<div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-neutral-100 text-ink">
						<f.icon size={22} strokeWidth={1.7} />
					</div>
					<h3 class="text-lg">{f.title}</h3>
					<p class="mt-1 text-muted">{f.text}</p>
				</div>
			{/each}
		</div>
	</section>

	<!-- Open courses -->
	{#if data.subjects.length}
		<section class="mx-auto max-w-6xl px-5 pb-20">
			<div class="mb-6 flex items-end justify-between">
				<h2 class="text-2xl">คอร์สที่เปิดรับสมัคร</h2>
				<a href="/explore" class="text-ink underline-offset-4 hover:underline">ดูทั้งหมด</a>
			</div>
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.subjects as subject (subject.id)}
					<SubjectCard {subject} />
				{/each}
			</div>
		</section>
	{/if}

	<section class="mx-auto max-w-6xl px-5 pb-20">
		<div class="flex flex-col items-start justify-between gap-6 rounded-3xl bg-canvas p-8 sm:flex-row sm:items-center md:p-10">
			<div>
				<h2 class="text-2xl">พร้อมสำหรับการสอบครั้งต่อไปหรือยัง?</h2>
				<ul class="mt-3 space-y-1 text-muted">
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-ink" /> คลาสเล็ก รับจำนวนจำกัด</li>
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-ink" /> ฟรีเอกสารประกอบการเรียน</li>
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-ink" /> ดูบทเรียนย้อนหลังได้ตลอด</li>
				</ul>
			</div>
			<a href={data.user ? '/explore' : '/register'} class="btn btn-primary px-7 py-3 text-base">สมัครเรียนเลย</a>
		</div>
	</section>

	<footer class="border-t border-line py-8 text-center text-sm text-muted">
		© {new Date().getFullYear()} ติวเตอร์มอร์ อะคาเดมี · ใกล้มหาวิทยาลัยเทคโนโลยีสุรนารี นครราชสีมา
	</footer>
</div>
