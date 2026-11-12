<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { FileText, Film, Image, Link, LoaderCircle, Paperclip, UploadCloud } from '@lucide/svelte';
	import type { Database, Enums, Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { optimiseImage } from '#lib/image.ts';
	import { VIDEO_ACCEPT, drivePreviewUrl, sniffVideoCodec, videoContentType } from '#lib/media.ts';
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
		{ value: 'video', label: 'วิดีโอ', icon: Film, accept: VIDEO_ACCEPT },
		{ value: 'text', label: 'บทความ', icon: FileText },
		{ value: 'image', label: 'รูปภาพ', icon: Image, accept: 'image/*' },
		{ value: 'file', label: 'ไฟล์', icon: Paperclip, accept: '' },
		{ value: 'link', label: 'ลิงก์', icon: Link }
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
	let originalBytes = $state<number | null>(null);
	let optimising = $state(false);
	/** The picked video is HEVC (H.265): it uploads fine, but not every browser plays it. */
	let hevc = $state(false);
	let progress = $state(0);
	let busy = $state(false);

	const current = $derived(types.find((t) => t.value === f.type)!);
	const needsFile = $derived(['video', 'image', 'file'].includes(f.type));
	const MAX_BYTES = 5 * 1024 * 1024 * 1024;

	async function pick(e: Event) {
		const picked = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		if (picked && picked.size > MAX_BYTES) {
			toast.error('ไฟล์มีขนาดเกิน 5 GB');
			return;
		}
		originalBytes = null;
		hevc = false;
		if (picked && f.type === 'video') {
			if (!videoContentType(picked)) {
				toast.error('ไฟล์นี้ไม่ใช่วิดีโอ (รองรับ .mp4, .mov, .m4v, .webm)');
				return;
			}
			file = picked;
			hevc = (await sniffVideoCodec(picked).catch(() => null)) === 'hevc';
		} else if (picked && f.type === 'image') {
			// Shrink lesson images before upload (WebP, max 2400px) — keeps diagrams readable
			optimising = true;
			try {
				const img = await optimiseImage(picked, 'lesson');
				file = img.file;
				if (!img.unchanged) originalBytes = img.originalBytes;
			} catch (err) {
				toast.error(errorMessage(err));
				file = null;
			} finally {
				optimising = false;
			}
		} else {
			file = picked;
		}
		if (file && !f.title) f.title = file.name.replace(/\.[^.]+$/, '');
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (needsFile && !file && !content?.storage_path) return toast.error('กรุณาเลือกไฟล์ที่จะอัปโหลด');
		if (f.type === 'link' && !/^https?:\/\//i.test(f.external_url)) return toast.error('ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://');
		busy = true;
		progress = 0;

		try {
			let upload: Partial<Tables<'contents'>> = {};
			if (needsFile && file) {
				const path = `${termId}/${safeFileName(file.name)}`;
				const mime = (f.type === 'video' ? videoContentType(file) : null) ?? file.type;
				await uploadResumable(supabase, 'course-media', path, file, (p) => (progress = p), mime);
				upload = {
					storage_path: path,
					file_name: file.name,
					mime_type: mime || null,
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
			toast(content ? 'บันทึกบทเรียนแล้ว' : 'เพิ่มบทเรียนแล้ว');
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
						originalBytes = null;
						hevc = false;
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
			<label class="label" for="c-title">ชื่อบทเรียน</label>
			<input id="c-title" class="input" required maxlength="200" placeholder="บทเรียนที่ 1 · เวกเตอร์ของแรง" bind:value={f.title} />
		</div>
		<div>
			<label class="label" for="c-sec">บท</label>
			<input id="c-sec" class="input" list="sections" maxlength="120" placeholder="บทที่ 1" bind:value={f.section} />
			<datalist id="sections">
				{#each sections as s (s)}<option value={s}></option>{/each}
			</datalist>
		</div>
	</div>

	{#if needsFile}
		<label class="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-neutral-50 px-4 py-8 text-center hover:border-brand-300">
			<UploadCloud class="text-brand-600" />
			{#if optimising}
				<span>กำลังย่อขนาดรูป…</span>
			{:else if file}
				<span>{file.name}</span>
				<span class="text-sm text-muted">
					{#if originalBytes}
						<span class="line-through">{formatBytes(originalBytes)}</span> →
						<span class="text-success-700">{formatBytes(file.size)}</span> (WebP)
					{:else}
						{formatBytes(file.size)}
					{/if}
				</span>
			{:else if content?.file_name}
				<span>{content.file_name}</span>
				<span class="text-sm text-muted">เลือกไฟล์ใหม่เพื่อแทนที่ไฟล์เดิม</span>
			{:else}
				<span>เลือก{current.label}ที่จะอัปโหลด</span>
				<span class="text-sm text-muted">สูงสุด 5 GB · ถ้าเน็ตหลุด ระบบจะอัปโหลดต่อจากเดิมให้</span>
			{/if}
			<input type="file" accept={current.accept} class="sr-only" onchange={pick} />
		</label>
		{#if f.type === 'video'}
			{#if hevc}
				<p class="rounded-2xl border border-sun-300 bg-sun-50 px-4 py-3 text-sm">
					วิดีโอนี้เข้ารหัสแบบ HEVC (H.265) ซึ่งเป็นค่าเริ่มต้นของ iPhone อัปโหลดได้ตามปกติ และเล่นได้ใน Safari
					แต่ Chrome หรือ Firefox บนบางเครื่องอาจเล่นไม่ได้ ถ้าอยากให้นักเรียนทุกคนดูได้แน่นอน ให้แปลงเป็น MP4 (H.264) ก่อนอัปโหลด
				</p>
			{:else if !file}
				<p class="text-sm text-muted">รองรับ .mp4 และ .mov (แนะนำ H.264 เพื่อให้เล่นได้ทุกเบราว์เซอร์)</p>
			{/if}
		{/if}
	{/if}

	{#if f.type === 'link'}
		<div>
			<label class="label" for="c-url">ลิงก์ (URL)</label>
			<input id="c-url" class="input" type="url" required placeholder="https://" bind:value={f.external_url} />
			{#if drivePreviewUrl(f.external_url)}
				<p class="mt-2 text-sm text-muted">
					ลิงก์ Google Drive จะแสดงเป็นตัวเล่นในหน้าบทเรียน ไฟล์ต้องแชร์แบบ “ทุกคนที่มีลิงก์” และระบบจะไม่นับเปอร์เซ็นต์การดูของวิดีโอจาก Drive
				</p>
			{/if}
		</div>
	{/if}

	<div>
		<label class="label" for="c-body">{f.type === 'text' ? 'เนื้อหา' : 'โน้ต'} <span class="text-muted">(รองรับ Markdown)</span></label>
		<textarea
			id="c-body"
			class="input font-read {f.type === 'text' ? 'min-h-64' : 'min-h-24'}"
			maxlength="100000"
			required={f.type === 'text'}
			placeholder={f.type === 'text' ? '# หัวข้อ\n\nเขียนเนื้อหาบทเรียนที่นี่ **ตัวหนา**, *ตัวเอียง*, - รายการ, [ลิงก์](https://…)' : 'คำอธิบายเพิ่มเติมที่แสดงใต้บทเรียน (ไม่บังคับ)'}
			bind:value={f.body}
		></textarea>
	</div>

	<label class="flex items-center gap-3">
		<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={f.is_published} />
		<span>นักเรียนมองเห็น</span>
	</label>

	{#if busy && needsFile && file}
		<div>
			<div class="mb-1 flex justify-between text-sm"><span>กำลังอัปโหลด…</span><span>{progress}%</span></div>
			<div class="h-2 overflow-hidden rounded-full bg-neutral-100">
				<div class="h-full rounded-full bg-brand-600 transition-all" style="width:{progress}%"></div>
			</div>
		</div>
	{/if}

	<button class="btn btn-primary w-full" disabled={busy || optimising}>
		{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if}
		{content ? 'บันทึก' : 'เพิ่มบทเรียน'}
	</button>
</form>
