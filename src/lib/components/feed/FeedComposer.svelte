<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { Film, ImagePlus, LoaderCircle, X } from '@lucide/svelte';
	import Avatar from '../Avatar.svelte';
	import type { Database } from '#lib/database.types.ts';
	import { optimiseImage } from '#lib/image.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { safeFileName, uploadResumable } from '#lib/upload.ts';
	import { errorMessage, formatBytes, type ProfileLite } from '#lib/utils.ts';

	let {
		supabase,
		termId,
		me,
		onposted
	}: {
		supabase: SupabaseClient<Database>;
		termId: string;
		me: ProfileLite;
		onposted: () => void;
	} = $props();

	const MAX_IMAGES = 10;
	const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;

	type Draft = { file: File; kind: 'image' | 'video'; preview: string; width?: number; height?: number };

	let body = $state('');
	let drafts = $state<Draft[]>([]);
	let focused = $state(false);
	let preparing = $state(false);
	let posting = $state(false);
	let progress = $state(0);

	const hasVideo = $derived(drafts.some((d) => d.kind === 'video'));
	const canPost = $derived(!posting && !preparing && (body.trim().length > 0 || drafts.length > 0));

	async function addImages(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const files = [...(input.files ?? [])];
		input.value = '';
		if (hasVideo) return toast.error('โพสต์ที่มีวิดีโอแนบรูปเพิ่มไม่ได้');
		const room = MAX_IMAGES - drafts.length;
		if (files.length > room) toast.info(`แนบรูปได้สูงสุด ${MAX_IMAGES} รูปต่อโพสต์`);
		preparing = true;
		for (const f of files.slice(0, room)) {
			try {
				// Feed images display up to ~700px wide; the cover preset (1600px WebP) keeps them crisp on retina
				const img = await optimiseImage(f, 'cover');
				drafts.push({ file: img.file, kind: 'image', preview: URL.createObjectURL(img.file), width: img.width, height: img.height });
			} catch (err) {
				toast.error(errorMessage(err));
			}
		}
		preparing = false;
	}

	function addVideo(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const f = input.files?.[0];
		input.value = '';
		if (!f) return;
		if (drafts.length) return toast.error('วิดีโอต้องโพสต์แยก ไม่รวมกับรูป');
		if (f.size > MAX_VIDEO_BYTES) return toast.error('วิดีโอต้องมีขนาดไม่เกิน 2 GB');
		drafts.push({ file: f, kind: 'video', preview: URL.createObjectURL(f) });
	}

	function removeDraft(i: number) {
		URL.revokeObjectURL(drafts[i].preview);
		drafts.splice(i, 1);
	}

	async function post() {
		if (!canPost) return;
		posting = true;
		progress = 0;
		const uploaded: string[] = [];
		try {
			// 1) upload media into <term>/feed/
			const totalBytes = drafts.reduce((n, d) => n + d.file.size, 0) || 1;
			let doneBytes = 0;
			const media = [];
			for (const [i, d] of drafts.entries()) {
				const path = `${termId}/feed/${safeFileName(d.file.name)}`;
				if (d.kind === 'video') {
					await uploadResumable(supabase, 'course-media', path, d.file, (p) => {
						progress = Math.round(((doneBytes + (d.file.size * p) / 100) / totalBytes) * 100);
					});
				} else {
					const { error } = await supabase.storage
						.from('course-media')
						.upload(path, d.file, { contentType: d.file.type, cacheControl: '31536000' });
					if (error) throw error;
				}
				uploaded.push(path);
				doneBytes += d.file.size;
				progress = Math.round((doneBytes / totalBytes) * 100);
				media.push({
					kind: d.kind,
					storage_path: path,
					mime_type: d.file.type || null,
					size_bytes: d.file.size,
					width: d.width ?? null,
					height: d.height ?? null,
					position: i
				});
			}

			// 2) create the post, then attach media
			const { data: row, error } = await supabase
				.from('feed_posts')
				.insert({ term_id: termId, body: body.trim() })
				.select('id')
				.single();
			if (error) throw error;
			if (media.length) {
				const { error: mErr } = await supabase.from('feed_post_media').insert(media.map((m) => ({ ...m, post_id: row.id })));
				if (mErr) {
					await supabase.from('feed_posts').delete().eq('id', row.id);
					throw mErr;
				}
			}

			drafts.forEach((d) => URL.revokeObjectURL(d.preview));
			drafts = [];
			body = '';
			focused = false;
			toast('โพสต์แล้ว');
			onposted();
		} catch (err) {
			if (uploaded.length) await supabase.storage.from('course-media').remove(uploaded);
			toast.error(errorMessage(err));
		} finally {
			posting = false;
		}
	}
</script>

<div class="card p-4 md:p-5">
	<div class="flex gap-3">
		<Avatar profile={me} size={42} />
		<textarea
			class="min-h-[44px] flex-1 resize-none rounded-2xl bg-neutral-100 px-4 py-2.5 font-read text-[16px] outline-none placeholder:text-subtle focus:bg-white focus:ring-2 focus:ring-brand-100 {focused || body
				? 'min-h-28'
				: ''}"
			placeholder="เขียนอะไรถึงนักเรียนในคลาสนี้…"
			maxlength="10000"
			bind:value={body}
			onfocus={() => (focused = true)}
		></textarea>
	</div>

	{#if drafts.length}
		<div class="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:pl-[54px]">
			{#each drafts as d, i (d.preview)}
				<div class="group relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
					{#if d.kind === 'image'}
						<img src={d.preview} alt="" class="h-full w-full object-cover" />
					{:else}
						<!-- svelte-ignore a11y_media_has_caption -->
						<video src={d.preview} class="h-full w-full object-cover" muted></video>
						<span class="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">
							<Film size={12} /> {formatBytes(d.file.size)}
						</span>
					{/if}
					{#if !posting}
						<button
							class="absolute top-1.5 right-1.5 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
							aria-label="นำออก"
							onclick={() => removeDraft(i)}><X size={14} /></button
						>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if posting && drafts.length}
		<div class="mt-3 md:pl-[54px]">
			<div class="mb-1 flex justify-between text-sm text-muted"><span>กำลังอัปโหลด…</span><span>{progress}%</span></div>
			<div class="h-1.5 overflow-hidden rounded-full bg-neutral-100">
				<div class="h-full rounded-full bg-brand-600 transition-all" style="width:{progress}%"></div>
			</div>
		</div>
	{/if}

	<div class="mt-3 flex items-center justify-between border-t border-line pt-3 md:ml-[54px]">
		<div class="flex gap-1">
			<label class="btn btn-ghost btn-sm cursor-pointer {hasVideo || posting ? 'pointer-events-none opacity-40' : ''}">
				{#if preparing}<LoaderCircle size={18} class="animate-spin text-success-600" />{:else}<ImagePlus size={18} class="text-success-600" />{/if}
				รูปภาพ
				<input type="file" accept="image/*" multiple class="sr-only" onchange={addImages} disabled={hasVideo || posting} />
			</label>
			<label class="btn btn-ghost btn-sm cursor-pointer {drafts.length || posting ? 'pointer-events-none opacity-40' : ''}">
				<Film size={18} class="text-brand-600" />
				วิดีโอ
				<input type="file" accept="video/*" class="sr-only" onchange={addVideo} disabled={drafts.length > 0 || posting} />
			</label>
		</div>
		<button class="btn btn-primary btn-sm px-6" disabled={!canPost} onclick={post}>
			{#if posting}<LoaderCircle size={16} class="animate-spin" />{/if} โพสต์
		</button>
	</div>
</div>
