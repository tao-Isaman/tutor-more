<script lang="ts">
	import { page } from '$app/state';
	import { ChevronLeft } from '@lucide/svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const base = $derived(`/terms/${data.term.id}`);
	const tabs = $derived([
		{ href: base, label: 'บทเรียน', exact: true },
		{ href: `${base}/announcements`, label: 'ประกาศ' },
		{ href: `${base}/attendance`, label: 'เช็คชื่อ' },
		...(data.isStaff
			? [
					{ href: `${base}/students`, label: 'นักเรียน' },
					{ href: `${base}/insights`, label: 'สถิติการเรียน' },
					{ href: `${base}/settings`, label: 'ตั้งค่า' }
				]
			: [])
	]);
	const isActive = (t: { href: string; exact?: boolean }) =>
		t.exact
			? page.url.pathname === t.href || page.url.pathname.startsWith(`${base}/content`)
			: page.url.pathname.startsWith(t.href);
	// The live QR screen is full-bleed, without the class header
	const fullscreen = $derived(/\/attendance\/[^/]+$/.test(page.url.pathname));
</script>

{#if fullscreen}
	{@render children()}
{:else}
	<div class="mx-auto max-w-6xl px-5 pt-6 md:px-10 md:pt-8">
		<a href="/subjects/{data.subject.id}" class="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
			<ChevronLeft size={16} /> {data.subject.title}
		</a>
		<div class="mt-3 flex flex-wrap items-end justify-between gap-3">
			<div>
				<h1 class="text-2xl md:text-3xl">{data.subject.title} <span class="text-muted">· {data.term.name}</span></h1>
				{#if data.subject.title_th}<p class="text-muted">{data.subject.title_th}</p>{/if}
			</div>
			{#if data.isStaff}<span class="badge bg-brand-50 text-brand-700">พี่สอนคลาสนี้</span>{/if}
		</div>

		<nav class="scrollbar-none mt-6 flex gap-7 overflow-x-auto border-b border-line">
			{#each tabs as t (t.href)}
				<a href={t.href} class="tab {isActive(t) ? 'tab-active' : ''}">{t.label}</a>
			{/each}
		</nav>
	</div>

	<div class="mx-auto max-w-6xl px-5 py-8 md:px-10">
		{@render children()}
	</div>
{/if}
