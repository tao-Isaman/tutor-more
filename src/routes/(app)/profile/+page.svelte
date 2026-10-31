<script lang="ts">
	import {
		BookOpen,
		Briefcase,
		ChevronUp,
		AtSign,
		GraduationCap,
		Globe,
		MessageCircle,
		Pencil,
		Phone,
		Share2
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import ProgressRing from '#lib/components/ProgressRing.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { EDUCATION_LABEL, fullName, isStaffRole } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.profile!);
	const staff = $derived(isStaffRole(p.role));

	let tab = $state<'classes' | 'about'>('classes');
	let checklistOpen = $state(false);

	const checklist = $derived([
		{ done: !!p.avatar_url, label: 'เพิ่มรูปโปรไฟล์' },
		{ done: !!p.nickname, label: 'ตั้งชื่อเล่น' },
		{ done: !!p.education_level, label: 'เลือกระดับการศึกษา' },
		{ done: !!p.school, label: 'เพิ่มโรงเรียน / คณะ' },
		{ done: !!p.bio, label: 'เขียนแนะนำตัวสั้น ๆ' },
		{ done: !!(data.contacts?.phone || data.contacts?.line_id), label: 'เพิ่มเบอร์โทรหรือ LINE' }
	]);
	const doneCount = $derived(checklist.filter((c) => c.done).length);

	const stats = $derived(
		staff
			? [
					{ value: data.stats.subjects, label: 'วิชา' },
					{ value: data.stats.students, label: 'นักเรียน' },
					{ value: data.stats.questions, label: 'คำตอบ' },
					{ value: p.role === 'admin' ? 'แอดมิน' : 'ติวเตอร์', label: 'บทบาท' }
				]
			: [
					{ value: data.classes.length, label: 'คลาส' },
					{ value: data.stats.attended, label: 'เช็คชื่อ' },
					{ value: data.stats.completed, label: 'ดูวิดีโอจบ' },
					{ value: data.stats.questions, label: 'คำถาม' }
				]
	);

	const chips = $derived(
		staff ? data.subjects.map((s) => s.title) : [...new Set(data.classes.map((c) => c.term!.subject?.title ?? ''))].filter(Boolean)
	);

	async function share() {
		const text = `${fullName(p)} บน Tutor More Academy`;
		const url = `${location.origin}/explore`;
		if (navigator.share) await navigator.share({ title: text, url }).catch(() => {});
		else {
			await navigator.clipboard.writeText(url);
			toast('คัดลอกลิงก์แล้ว');
		}
	}
</script>

<svelte:head><title>{fullName(p)} · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-[1400px] px-5 py-8 md:px-14 md:py-10">
	<p class="text-muted">โปรไฟล์ของคุณ</p>

	<div class="mt-6 grid gap-10 xl:grid-cols-[1fr_minmax(0,820px)]">
		<!-- Left: identity (Fastwork-style) -->
		<section class="flex flex-col gap-6 sm:flex-row sm:items-start">
			<Avatar profile={p} size={104} ring />
			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-medium md:text-[40px] md:leading-tight">{fullName(p)}</h1>
				<div class="mt-2 flex flex-wrap items-center gap-2 text-muted">
					<span>@{p.nickname || 'ชื่อเล่น'}</span>
					<StatusBadge status={p.role} />
				</div>
				{#if p.bio}
					<p class="mt-3 max-w-xl text-[17px] leading-relaxed text-neutral-600">{p.bio}</p>
				{:else}
					<a href="/settings" class="mt-3 inline-block text-neutral-400 hover:text-brand-600">+ เพิ่มแนะนำตัวสั้น ๆ</a>
				{/if}
				<ul class="mt-4 space-y-2 text-neutral-600">
					{#if p.school}<li class="flex items-center gap-2"><Briefcase size={18} strokeWidth={1.6} /> {p.school}</li>{/if}
					<li class="flex items-center gap-2">
						<GraduationCap size={18} strokeWidth={1.6} />
						{#if p.education_level}{EDUCATION_LABEL[p.education_level]}{:else}<a href="/settings" class="text-neutral-400 hover:text-brand-600">เพิ่มระดับการศึกษา</a>{/if}
					</li>
				</ul>

				<div class="mt-6 inline-grid grid-cols-4 divide-x divide-line rounded-2xl border border-line">
					{#each stats as s (s.label)}
						<div class="px-5 py-3 text-center md:px-7">
							<div class="text-xl font-normal md:text-2xl">{s.value}</div>
							<div class="text-sm text-muted">{s.label}</div>
						</div>
					{/each}
				</div>

				<div class="mt-6 flex flex-wrap gap-3">
					<a href="/settings" class="btn btn-dark px-6 py-3"><Pencil size={18} /> แก้ไขโปรไฟล์</a>
					<button class="btn btn-soft px-6 py-3" onclick={share}><Share2 size={18} /> ชวนเพื่อน</button>
				</div>
			</div>
		</section>

		<!-- Right: brand panel + chips -->
		<section>
			<div class="relative flex aspect-[16/8] items-center justify-center overflow-hidden rounded-3xl bg-brand-600 text-white">
				<div class="absolute -top-16 -right-10 h-56 w-56 rounded-full bg-sun-400"></div>
				<div class="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-brand-700"></div>
				<div class="relative text-center">
					<div class="text-sun-300">Tutor More Academy</div>
					<div class="mt-1 text-3xl font-medium text-white md:text-4xl">{staff ? 'สอน' : 'เรียน'}กับ Tutor More</div>
					<a href={staff ? '/teach' : '/explore'} class="btn mt-5 bg-white/15 text-white hover:bg-white/25">
						{staff ? 'จัดการคลาส' : 'หาคลาสเรียน'}
					</a>
				</div>
			</div>
			{#if chips.length}
				<div class="mt-5 flex flex-wrap gap-3">
					{#each chips.slice(0, 3) as c (c)}
						<span class="chip"><BookOpen size={18} strokeWidth={1.6} /> {c}</span>
					{/each}
					{#if chips.length > 3}<span class="chip">+{chips.length - 3}</span>{/if}
				</div>
			{/if}
		</section>
	</div>

	<!-- Tabs -->
	<nav class="mt-12 flex gap-10 border-b border-line px-1">
		<button class="tab {tab === 'classes' ? 'tab-active' : ''}" onclick={() => (tab = 'classes')}>{staff ? 'การสอน' : 'คลาส'}</button>
		<button class="tab {tab === 'about' ? 'tab-active' : ''}" onclick={() => (tab = 'about')}>เกี่ยวกับ</button>
	</nav>

	<div class="py-8">
		{#if tab === 'classes'}
			{@const items = staff
				? data.subjects.map((s) => ({ href: `/subjects/${s.id}`, title: s.title, sub: s.title_th ?? s.code ?? '' }))
				: data.classes.map((c) => ({ href: `/terms/${c.term!.id}`, title: c.term!.subject?.title ?? '', sub: `เทอม ${c.term!.name}` }))}
			{#if items.length}
				<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
					{#each items as it (it.href)}
						<a href={it.href} class="group overflow-hidden rounded-3xl bg-ink text-white transition hover:-translate-y-0.5 hover:shadow-xl">
							<div class="relative aspect-[4/3] p-5">
								<div class="absolute top-4 right-4 h-3 w-3 rounded-full bg-sun-400"></div>
								<div class="text-xs text-sun-400">Tutor More</div>
								<div class="mt-8 text-2xl leading-tight font-semibold text-white">{it.title}</div>
								<div class="mt-1 text-sun-300">{it.sub}</div>
							</div>
						</a>
					{/each}
				</div>
			{:else}
				<EmptyState title={staff ? 'ยังไม่มีวิชา' : 'ยังไม่มีคลาส'} text={staff ? 'วิชาที่คุณสอนจะแสดงที่นี่' : 'คลาสที่คุณเข้าร่วมจะแสดงที่นี่'}>
					<a href={staff ? '/teach' : '/explore'} class="btn btn-primary">{staff ? 'ไปที่หน้าการสอน' : 'ค้นหาคอร์ส'}</a>
				</EmptyState>
			{/if}
		{:else}
			<dl class="grid max-w-2xl gap-x-8 gap-y-5 sm:grid-cols-2">
				<div><dt class="text-sm text-muted">ชื่อ-นามสกุล</dt><dd>{fullName(p)}</dd></div>
				<div><dt class="text-sm text-muted">ชื่อเล่น</dt><dd>{p.nickname || '—'}</dd></div>
				<div><dt class="text-sm text-muted">อีเมล</dt><dd>{data.contacts?.email ?? '—'}</dd></div>
				<div><dt class="text-sm text-muted">เบอร์โทร</dt><dd class="flex items-center gap-2"><Phone size={14} /> {data.contacts?.phone || '—'}</dd></div>
				<div><dt class="text-sm text-muted">LINE</dt><dd class="flex items-center gap-2"><MessageCircle size={14} /> {data.contacts?.line_id || '—'}</dd></div>
				<div><dt class="text-sm text-muted">Facebook</dt><dd class="flex items-center gap-2"><Globe size={14} /> {data.contacts?.facebook || '—'}</dd></div>
				<div><dt class="text-sm text-muted">Instagram</dt><dd class="flex items-center gap-2"><AtSign size={14} /> {data.contacts?.instagram ? '@' + data.contacts.instagram : '—'}</dd></div>
			</dl>
			<p class="mt-6 text-sm text-muted">ข้อมูลติดต่อจะเห็นได้เฉพาะคุณ ติวเตอร์ของคุณ และแอดมินเท่านั้น</p>
		{/if}
	</div>
</div>

<!-- "Finish your profile" pill (Fastwork-style) -->
{#if doneCount < checklist.length}
	<div class="fixed bottom-24 left-1/2 z-20 w-[min(440px,calc(100%-2rem))] -translate-x-1/2 md:bottom-8">
		{#if checklistOpen}
			<ul class="mb-2 space-y-2 rounded-3xl bg-ink p-5 text-white shadow-2xl">
				{#each checklist as c (c.label)}
					<li class="flex items-center gap-3 {c.done ? 'text-white/50 line-through' : ''}">
						<span class="flex h-5 w-5 items-center justify-center rounded-full {c.done ? 'bg-sun-400 text-ink' : 'border border-white/40'}">{c.done ? '✓' : ''}</span>
						{c.label}
					</li>
				{/each}
				<li><a href="/settings" class="btn btn-sun btn-sm mt-2 w-full">กรอกเลย</a></li>
			</ul>
		{/if}
		<button
			class="flex w-full items-center gap-4 rounded-full bg-ink py-3 pr-6 pl-3 text-left text-white shadow-2xl"
			onclick={() => (checklistOpen = !checklistOpen)}
		>
			<ProgressRing value={(doneCount / checklist.length) * 100} size={46} label="{doneCount}/{checklist.length}" />
			<span class="flex-1">
				<span class="block text-[17px]">กรอกโปรไฟล์ให้ครบ</span>
				<span class="block text-sm text-white/60">ช่วยให้ติวเตอร์รู้จักคุณมากขึ้น</span>
			</span>
			<ChevronUp size={20} class="transition {checklistOpen ? '' : 'rotate-180'}" />
		</button>
	</div>
{/if}
