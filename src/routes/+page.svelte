<script lang="ts">
	import { ArrowRight, CircleCheck, MessageCircle, QrCode, ScanEye, Sparkles } from '@lucide/svelte';
	import Logo from '#lib/components/Logo.svelte';
	import SubjectCard from '#lib/components/SubjectCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const features = [
		{ icon: Sparkles, title: 'All lessons in one place', text: 'Videos, notes, images and worksheets organised by subject and term.' },
		{ icon: QrCode, title: 'QR check-in', text: 'Scan the rotating QR in class. Location check keeps attendance honest.' },
		{ icon: ScanEye, title: 'Progress your tutor can see', text: 'Tutors know who watched which video — and how much — so no one falls behind.' },
		{ icon: MessageCircle, title: 'Ask anytime', text: 'Q&A under every lesson plus private chat with your tutor.' }
	];
</script>

<div class="min-h-dvh bg-white">
	<header class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
		<a href="/" class="flex items-center gap-3">
			<Logo size={40} />
			<div class="leading-tight">
				<div class="text-lg font-medium whitespace-nowrap">Tutor More<span class="hidden sm:inline"> Academy</span></div>
				<div class="hidden text-xs text-muted sm:block">สถาบันกวดวิชาติวเตอร์มอร์ · SUT</div>
			</div>
		</a>
		<nav class="flex items-center gap-2">
			<a href="/explore" class="btn btn-ghost hidden sm:inline-flex">Explore courses</a>
			{#if data.user}
				<a href="/home" class="btn btn-dark">Go to dashboard <ArrowRight size={16} /></a>
			{:else}
				<a href="/login" class="btn btn-ghost">Log in</a>
				<a href="/register" class="btn btn-primary">Sign up</a>
			{/if}
		</nav>
	</header>

	<!-- Hero -->
	<section class="mx-auto max-w-6xl px-5 pt-6 pb-16">
		<div class="relative overflow-hidden rounded-[32px] bg-brand-600 px-6 py-14 text-white sm:px-12 sm:py-20">
			<div class="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-sun-400/90 sm:-top-24 sm:-right-24 sm:h-80 sm:w-80"></div>
			<div class="absolute -right-16 -bottom-24 h-48 w-48 rounded-full bg-brand-700 sm:right-24 sm:-bottom-32 sm:h-64 sm:w-64"></div>
			<div class="relative max-w-2xl">
				<span class="badge mb-5 bg-white/15 px-3 py-1 text-sm text-white">Engineering tutoring for SUT students</span>
				<h1 class="text-4xl leading-tight font-semibold text-white sm:text-6xl">
					Learn smarter with <span class="text-sun-400">Tutor More</span>
				</h1>
				<p class="mt-5 max-w-xl text-lg text-white/85">
					Statics, Calculus, Physics and more — lessons, videos and attendance in one place. Taught by SUT
					engineers who've been where you are.
				</p>
				<p class="mt-2 font-read text-white/75">"ติวแบบเห็นภาพ สอนให้เข้าใจ ไม่ใช่แค่จำ"</p>
				<div class="mt-8 flex flex-wrap gap-3">
					<a href={data.user ? '/explore' : '/register'} class="btn btn-sun px-6 py-3 text-base font-normal">
						{data.user ? 'Browse courses' : 'Create free account'}
						<ArrowRight size={18} />
					</a>
					<a href="/explore" class="btn bg-white/10 px-6 py-3 text-base text-white hover:bg-white/20">See open classes</a>
				</div>
			</div>
		</div>
	</section>

	<!-- Features -->
	<section class="mx-auto grid max-w-6xl gap-4 px-5 pb-16 sm:grid-cols-2 lg:grid-cols-4">
		{#each features as f (f.title)}
			<div class="card p-6">
				<div class="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-sun-100 text-brand-600">
					<f.icon size={22} />
				</div>
				<h3 class="text-lg">{f.title}</h3>
				<p class="mt-1 text-muted">{f.text}</p>
			</div>
		{/each}
	</section>

	<!-- Open courses -->
	{#if data.subjects.length}
		<section class="mx-auto max-w-6xl px-5 pb-20">
			<div class="mb-6 flex items-end justify-between">
				<h2 class="text-2xl">Open courses</h2>
				<a href="/explore" class="text-brand-600 hover:underline">View all</a>
			</div>
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.subjects as subject (subject.id)}
					<SubjectCard {subject} />
				{/each}
			</div>
		</section>
	{/if}

	<section class="mx-auto max-w-6xl px-5 pb-20">
		<div class="card flex flex-col items-start justify-between gap-6 bg-sun-50 p-8 sm:flex-row sm:items-center">
			<div>
				<h2 class="text-2xl">Ready for your next exam?</h2>
				<ul class="mt-3 space-y-1 text-muted">
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-brand-600" /> Small classes, limited seats</li>
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-brand-600" /> Full course notes included</li>
					<li class="flex items-center gap-2"><CircleCheck size={18} class="text-brand-600" /> Rewatch lessons any time</li>
				</ul>
			</div>
			<a href={data.user ? '/explore' : '/register'} class="btn btn-primary px-6 py-3 text-base">Join a class</a>
		</div>
	</section>

	<footer class="border-t border-line py-8 text-center text-sm text-muted">
		© {new Date().getFullYear()} Tutor More Academy · Suranaree University of Technology area, Nakhon Ratchasima
	</footer>
</div>
