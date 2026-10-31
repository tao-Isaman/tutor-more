<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Trash2 } from '@lucide/svelte';
	import TermForm from '#lib/components/TermForm.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	async function remove() {
		const typed = prompt(`This deletes term "${data.term.name}" with all lessons, attendance and progress.\nType the term name to confirm:`);
		if (typed !== data.term.name) return;
		const { data: files } = await data.supabase.from('contents').select('storage_path').eq('term_id', data.term.id).not('storage_path', 'is', null);
		const { error } = await data.supabase.from('terms').delete().eq('id', data.term.id);
		if (error) return toast.error(errorMessage(error));
		const paths = (files ?? []).map((f) => f.storage_path!).filter(Boolean);
		if (paths.length) await data.supabase.storage.from('course-media').remove(paths);
		toast('Term deleted');
		await goto(`/subjects/${data.subject.id}`);
	}
</script>

<svelte:head><title>Settings · {data.subject.title}</title></svelte:head>

<div class="mx-auto max-w-2xl space-y-10">
	<section class="card p-6">
		<h2 class="mb-5 text-xl">Term details</h2>
		{#key data.term.updated_at}
			<TermForm supabase={data.supabase} subjectId={data.subject.id} term={data.term} onsaved={() => invalidate('app:term')} />
		{/key}
	</section>

	<section class="rounded-2xl border border-brand-200 p-6">
		<h2 class="text-xl text-brand-700">Danger zone</h2>
		<p class="mt-1 text-sm text-muted">Deleting a term removes its lessons, uploaded files, attendance and student progress. This can't be undone.</p>
		<button class="btn btn-danger mt-4" onclick={remove}><Trash2 size={16} /> Delete term</button>
	</section>
</div>
