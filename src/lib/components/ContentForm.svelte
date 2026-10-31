<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { FileText, Film, Image, Link, LoaderCircle, Paperclip, UploadCloud } from '@lucide/svelte';
	import type { Database, Enums, Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { readVideoDuration, safeFileName, uploadResumable } from '#lib/upload.ts';
	import { errorMessage, formatBytes } from '#lib/utils.ts';

	let {
		supabase,
		termId,
		userId,
		content = null,
		sections = [],
		nextPosition = 0,
		onsaved
	}: {
		supabase: SupabaseClient<Database>;
		termId: string;
		userId: string;
		content?: Tables<'contents'> | null;
		sections?: string[];
		nextPosition?: number;
		onsaved: () => void;
	} = $props();

	const types: { value: Enums<'content_type'>; label: string; icon: typeof Film; accept?: string }[] = [
		{ value: 'video', label: 'Video', icon: Film, accept: 'video/*' },
		{ value: 'text', label: 'Text', icon: FileText },
		{ value: 'image', label: 'Image', icon: Image, accept: 'image/*' },
		{ value: 'file', label: 'File', icon: Paperclip, accept: '' },
		{ value: 'link', label: 'Link', icon: Link }
	];

	// The form is re-mounted per record, so reading props once is intended.
	// svelte-ignore state_referenced_locally
	let f = $state({
		type: content?.type ?? ('video' as Enums<'content_type'>),
		title: content?.title ?? '',
		section: content?.section ?? '',
		body: content?.body ?? '',
		external_url: content?.external_url ?? '',
		is_published: content?.is_published ?? true
	});
	let file = $state<File | null>(null);
	let progress = $state(0);
	let busy = $state(false);

	const current = $derived(types.find((t) => t.value === f.type)!);
	const needsFile = $derived(['video', 'image', 'file'].includes(f.type));
	const MAX_BYTES = 5 * 1024 * 1024 * 1024;

	function pick(e: Event) {
		const picked = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		if (picked && picked.size > MAX_BYTES) {
			toast.error('File is larger than 5 GB');
			return;
		}
		file = picked;
		if (file && !f.title) f.title = file.name.replace(/\.[^.]+$/, '');
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (needsFile && !file && !content?.storage_path) return toast.error('Please choose a file to upload');
		if (f.type === 'link' && !/^https?:\/\//i.test(f.external_url)) return toast.error('Link must start with http:// or https://');
		busy = true;
		progress = 0;

		try {
			let upload: Partial<Tables<'contents'>> = {};
			if (needsFile && file) {
				const path = `${termId}/${safeFileName(file.name)}`;
				await uploadResumable(supabase, 'course-media', path, file, (p) => (progress = p));
				upload = {
					storage_path: path,
					file_name: file.name,
					mime_type: file.type || null,
					size_bytes: file.size,
					duration_seconds: f.type === 'video' ? await readVideoDuration(file) : null
				};
			}

			const payload = {
				type: f.type,
				title: f.title.trim(),
				section: f.section.trim() || null,
				body: f.body.trim() || null,
				external_url: f.type === 'link' ? f.external_url.trim() : null,
				is_published: f.is_published,
				...upload
			};

			const res = content
				? await supabase.from('contents').update(payload).eq('id', content.id)
				: await supabase
						.from('contents')
						.insert({ ...payload, term_id: termId, created_by: userId, position: nextPosition });
			if (res.error) throw res.error;

			// Replace → remove the old object so storage doesn't fill up with orphans
			if (content?.storage_path && upload.storage_path) {
				await supabase.storage.from('course-media').remove([content.storage_path]);
			}
			toast(content ? 'Lesson updated' : 'Lesson added');
			onsaved();
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			busy = false;
		}
	}
</script>

<form onsubmit={save} class="space-y-4">
	{#if !content}
		<div class="grid grid-cols-5 gap-2">
			{#each types as t (t.value)}
				<button
					type="button"
					onclick={() => {
						f.type = t.value;
						file = null;
					}}
					class="flex flex-col items-center gap-1 rounded-2xl border py-3 text-sm transition {f.type === t.value
						? 'border-brand-500 bg-brand-50 text-brand-700'
						: 'border-line hover:bg-neutral-50'}"
				>
					<t.icon size={20} />
					{t.label}
				</button>
			{/each}
		</div>
	{/if}

	<div class="grid grid-cols-[1fr_160px] gap-3">
		<div>
			<label class="label" for="c-title">Title</label>
			<input id="c-title" class="input" required maxlength="200" placeholder="Lesson 1 · Force vectors" bind:value={f.title} />
		</div>
		<div>
			<label class="label" for="c-sec">Chapter</label>
			<input id="c-sec" class="input" list="sections" maxlength="120" placeholder="Chapter 1" bind:value={f.section} />
			<datalist id="sections">
				{#each sections as s (s)}<option value={s}></option>{/each}
			</datalist>
		</div>
	</div>

	{#if needsFile}
		<label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-neutral-50 px-4 py-8 text-center hover:border-brand-300">
			<UploadCloud class="text-brand-600" />
			{#if file}
				<span>{file.name}</span>
				<span class="text-sm text-muted">{formatBytes(file.size)}</span>
			{:else if content?.file_name}
				<span>{content.file_name}</span>
				<span class="text-sm text-muted">Choose a new file to replace it</span>
			{:else}
				<span>Choose {current.label.toLowerCase()} to upload</span>
				<span class="text-sm text-muted">Up to 5 GB · uploads resume if the connection drops</span>
			{/if}
			<input type="file" accept={current.accept} class="sr-only" onchange={pick} />
		</label>
	{/if}

	{#if f.type === 'link'}
		<div>
			<label class="label" for="c-url">URL</label>
			<input id="c-url" class="input" type="url" required placeholder="https://" bind:value={f.external_url} />
		</div>
	{/if}

	<div>
		<label class="label" for="c-body">{f.type === 'text' ? 'Content' : 'Notes'} <span class="text-muted">(Markdown supported)</span></label>
		<textarea
			id="c-body"
			class="input font-read {f.type === 'text' ? 'min-h-64' : 'min-h-24'}"
			maxlength="100000"
			required={f.type === 'text'}
			placeholder={f.type === 'text' ? '# Heading\n\nWrite the lesson here. **bold**, *italic*, - lists, [links](https://…)' : 'Optional description shown under the lesson'}
			bind:value={f.body}
		></textarea>
	</div>

	<label class="flex items-center gap-3">
		<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={f.is_published} />
		<span>Visible to students</span>
	</label>

	{#if busy && needsFile && file}
		<div>
			<div class="mb-1 flex justify-between text-sm"><span>Uploading…</span><span>{progress}%</span></div>
			<div class="h-2 overflow-hidden rounded-full bg-neutral-100">
				<div class="h-full rounded-full bg-brand-600 transition-all" style="width:{progress}%"></div>
			</div>
		</div>
	{/if}

	<button class="btn btn-primary w-full" disabled={busy}>
		{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if}
		{content ? 'Save changes' : 'Add lesson'}
	</button>
</form>
