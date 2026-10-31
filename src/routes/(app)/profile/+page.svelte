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
		{ done: !!p.avatar_url, label: 'Add a profile photo' },
		{ done: !!p.nickname, label: 'Set your nickname' },
		{ done: !!p.education_level, label: 'Choose education level' },
		{ done: !!p.school, label: 'Add your school / faculty' },
		{ done: !!p.bio, label: 'Write a short bio' },
		{ done: !!(data.contacts?.phone || data.contacts?.line_id), label: 'Add phone or LINE' }
	]);
	const doneCount = $derived(checklist.filter((c) => c.done).length);

	const stats = $derived(
		staff
			? [
					{ value: data.stats.subjects, label: 'Subjects' },
					{ value: data.stats.students, label: 'Students' },
					{ value: data.stats.questions, label: 'Answers' },
					{ value: p.role === 'admin' ? 'Admin' : 'Tutor', label: 'Role' }
				]
			: [
					{ value: data.classes.length, label: 'Classes' },
					{ value: data.stats.attended, label: 'Check-ins' },
					{ value: data.stats.completed, label: 'Videos done' },
					{ value: data.stats.questions, label: 'Questions' }
				]
	);

	const chips = $derived(
		staff ? data.subjects.map((s) => s.title) : [...new Set(data.classes.map((c) => c.term!.subject?.title ?? ''))].filter(Boolean)
	);

	async function share() {
		const text = `${fullName(p)} on Tutor More Academy`;
		const url = `${location.origin}/explore`;
		if (navigator.share) await navigator.share({ title: text, url }).catch(() => {});
		else {
			await navigator.clipboard.writeText(url);
			toast('Link copied');
		}
	}
</script>

<svelte:head><title>{fullName(p)} · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-[1400px] px-5 py-8 md:px-14 md:py-10">
	<p class="text-muted">Your profile</p>

	<div class="mt-6 grid gap-10 xl:grid-cols-[1fr_minmax(0,820px)]">
		<!-- Left: identity (Fastwork-style) -->
		<section class="flex flex-col gap-6 sm:flex-row sm:items-start">
			<Avatar profile={p} size={104} ring />
			<div class="min-w-0 flex-1">
				<h1 class="text-3xl font-medium md:text-[40px] md:leading-tight">{fullName(p)}</h1>
				<div class="mt-2 flex flex-wrap items-center gap-2 text-muted">
					<span>@{p.nickname || 'nickname'}</span>
					<StatusBadge status={p.role} />
				</div>
				{#if p.bio}
					<p class="mt-3 max-w-xl text-[17px] leading-relaxed text-neutral-600">{p.bio}</p>
				{:else}
					<a href="/settings" class="mt-3 inline-block text-neutral-400 hover:text-brand-600">+ Add a short bio</a>
				{/if}
				<ul class="mt-4 space-y-2 text-neutral-600">
					{#if p.school}<li class="flex items-center gap-2"><Briefcase size={18} strokeWidth={1.6} /> {p.school}</li>{/if}
					<li class="flex items-center gap-2">
						<GraduationCap size={18} strokeWidth={1.6} />
						{#if p.education_level}{EDUCATION_LABEL[p.education_level]}{:else}<a href="/settings" class="text-neutral-400 hover:text-brand-600">Add education</a>{/if}
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
					<a href="/settings" class="btn btn-dark px-6 py-3"><Pencil size={18} /> Edit profile</a>
					<button class="btn btn-soft px-6 py-3" onclick={share}><Share2 size={18} /> Invite friends</button>
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
					<div class="mt-1 text-3xl font-medium text-white md:text-4xl">{staff ? 'Teaching' : 'Learning'} with Tutor More</div>
					<a href={staff ? '/teach' : '/explore'} class="btn mt-5 bg-white/15 text-white hover:bg-white/25">
						{staff ? 'Manage classes' : 'Find a class'}
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
		<button class="tab {tab === 'classes' ? 'tab-active' : ''}" onclick={() => (tab = 'classes')}>{staff ? 'Teaching' : 'Classes'}</button>
		<button class="tab {tab === 'about' ? 'tab-active' : ''}" onclick={() => (tab = 'about')}>About</button>
	</nav>

	<div class="py-8">
		{#if tab === 'classes'}
			{@const items = staff
				? data.subjects.map((s) => ({ href: `/subjects/${s.id}`, title: s.title, sub: s.title_th ?? s.code ?? '' }))
				: data.classes.map((c) => ({ href: `/terms/${c.term!.id}`, title: c.term!.subject?.title ?? '', sub: `Term ${c.term!.name}` }))}
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
				<EmptyState title={staff ? 'No subjects yet' : 'No classes yet'} text={staff ? 'Subjects you teach appear here.' : 'Classes you join appear here.'}>
					<a href={staff ? '/teach' : '/explore'} class="btn btn-primary">{staff ? 'Go to Teach' : 'Explore courses'}</a>
				</EmptyState>
			{/if}
		{:else}
			<dl class="grid max-w-2xl gap-x-8 gap-y-5 sm:grid-cols-2">
				<div><dt class="text-sm text-muted">Full name</dt><dd>{fullName(p)}</dd></div>
				<div><dt class="text-sm text-muted">Nickname</dt><dd>{p.nickname || '—'}</dd></div>
				<div><dt class="text-sm text-muted">Email</dt><dd>{data.contacts?.email ?? '—'}</dd></div>
				<div><dt class="text-sm text-muted">Phone</dt><dd class="flex items-center gap-2"><Phone size={14} /> {data.contacts?.phone || '—'}</dd></div>
				<div><dt class="text-sm text-muted">LINE</dt><dd class="flex items-center gap-2"><MessageCircle size={14} /> {data.contacts?.line_id || '—'}</dd></div>
				<div><dt class="text-sm text-muted">Facebook</dt><dd class="flex items-center gap-2"><Globe size={14} /> {data.contacts?.facebook || '—'}</dd></div>
				<div><dt class="text-sm text-muted">Instagram</dt><dd class="flex items-center gap-2"><AtSign size={14} /> {data.contacts?.instagram ? '@' + data.contacts.instagram : '—'}</dd></div>
			</dl>
			<p class="mt-6 text-sm text-muted">Contact details are only visible to you, your tutors and admins.</p>
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
				<li><a href="/settings" class="btn btn-sun btn-sm mt-2 w-full">Complete now</a></li>
			</ul>
		{/if}
		<button
			class="flex w-full items-center gap-4 rounded-full bg-ink py-3 pr-6 pl-3 text-left text-white shadow-2xl"
			onclick={() => (checklistOpen = !checklistOpen)}
		>
			<ProgressRing value={(doneCount / checklist.length) * 100} size={46} label="{doneCount}/{checklist.length}" />
			<span class="flex-1">
				<span class="block text-[17px]">Finish your profile</span>
				<span class="block text-sm text-white/60">Help your tutor get to know you</span>
			</span>
			<ChevronUp size={20} class="transition {checklistOpen ? '' : 'rotate-180'}" />
		</button>
	</div>
{/if}
