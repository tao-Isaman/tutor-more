<script lang="ts">
	import { Search, SearchX } from '@lucide/svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import SubjectCard from '#lib/components/SubjectCard.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let q = $state('');

	const filtered = $derived.by(() => {
		const s = q.trim().toLowerCase();
		if (!s) return data.subjects;
		return data.subjects.filter((x) =>
			[x.title, x.title_th, x.code, x.description].some((f) => f?.toLowerCase().includes(s))
		);
	});
</script>

<svelte:head><title>Explore courses · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
	<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
		<div>
			<h1 class="text-3xl md:text-4xl">Explore courses</h1>
			<p class="mt-1 text-muted">Find a subject, pick a term and request a seat.</p>
		</div>
		<label class="relative w-full sm:w-80">
			<Search size={18} class="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-400" />
			<input class="input rounded-full pl-11" placeholder="Search subjects…" bind:value={q} />
		</label>
	</div>

	<div class="mt-8">
		{#if filtered.length}
			<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
				{#each filtered as subject (subject.id)}
					<SubjectCard {subject} />
				{/each}
			</div>
		{:else}
			<EmptyState
				title={q ? 'No matches' : 'No courses open yet'}
				text={q ? 'Try a different keyword.' : 'New terms are announced soon — check back later.'}
			>
				{#snippet icon()}<SearchX size={26} />{/snippet}
			</EmptyState>
		{/if}
	</div>
</div>
