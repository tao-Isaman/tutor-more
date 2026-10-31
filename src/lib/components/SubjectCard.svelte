<script lang="ts">
	import { BookOpen, CalendarDays } from '@lucide/svelte';
	import { formatBaht, formatDate } from '#lib/utils.ts';

	type Term = { id: string; name: string; price: number; is_published: boolean; start_date: string | null };
	let {
		subject
	}: {
		subject: {
			id: string;
			code: string | null;
			title: string;
			title_th: string | null;
			description: string | null;
			cover_url: string | null;
			terms: Term[];
		};
	} = $props();

	const openTerms = $derived(subject.terms.filter((t) => t.is_published));
	const cheapest = $derived(openTerms.length ? Math.min(...openTerms.map((t) => Number(t.price))) : null);
	const next = $derived(
		[...openTerms].filter((t) => t.start_date).sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0]
	);
</script>

<a href="/subjects/{subject.id}" class="group block overflow-hidden rounded-3xl border border-line bg-white transition hover:-translate-y-0.5 hover:shadow-lg">
	<div class="relative aspect-[16/9] overflow-hidden bg-brand-600">
		{#if subject.cover_url}
			<img src={subject.cover_url} alt="" class="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
		{:else}
			<div class="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-sun-400"></div>
			<div class="relative flex h-full flex-col justify-end p-5 text-white">
				{#if subject.code}<span class="text-sm text-white/80">{subject.code}</span>{/if}
				<span class="text-2xl leading-tight font-semibold">{subject.title}</span>
				{#if subject.title_th}<span class="text-sun-300">{subject.title_th}</span>{/if}
			</div>
		{/if}
		{#if cheapest !== null}
			<span class="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-sm shadow">เริ่มต้น {formatBaht(cheapest)}</span>
		{/if}
	</div>
	<div class="p-5">
		<h3 class="line-clamp-1 text-lg">{subject.title}</h3>
		{#if subject.description}
			<p class="mt-1 line-clamp-2 text-sm text-muted">{subject.description}</p>
		{/if}
		<div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
			<span class="flex items-center gap-1.5"><BookOpen size={15} /> {openTerms.length} เทอมที่เปิด</span>
			{#if next}
				<span class="flex items-center gap-1.5"><CalendarDays size={15} /> เริ่ม {formatDate(next.start_date)}</span>
			{/if}
		</div>
	</div>
</a>
