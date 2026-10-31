<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { ImagePlus, LoaderCircle } from '@lucide/svelte';
	import type { Database, Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage } from '#lib/utils.ts';

	let {
		supabase,
		userId,
		subject = null,
		onsaved
	}: {
		supabase: SupabaseClient<Database>;
		userId: string;
		subject?: Tables<'subjects'> | null;
		onsaved: (id: string) => void;
	} = $props();

	// The form is re-mounted per record, so reading props once is intended.
	// svelte-ignore state_referenced_locally
	let f = $state({
		code: subject?.code ?? '',
		title: subject?.title ?? '',
		title_th: subject?.title_th ?? '',
		description: subject?.description ?? '',
		cover_url: subject?.cover_url ?? '',
		is_published: subject?.is_published ?? false
	});
	let busy = $state(false);
	let uploading = $state(false);

	async function uploadCover(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) return toast.error('กรุณาเลือกไฟล์รูปภาพ');
		if (file.size > 5 * 1024 * 1024) return toast.error('รูปปกต้องมีขนาดไม่เกิน 5 MB');
		uploading = true;
		const path = `${userId}/covers/${crypto.randomUUID()}.${file.name.split('.').pop()}`;
		const { error } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '31536000' });
		uploading = false;
		if (error) return toast.error(errorMessage(error));
		f.cover_url = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
	}

	async function save(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		const payload = {
			code: f.code.trim() || null,
			title: f.title.trim(),
			title_th: f.title_th.trim() || null,
			description: f.description.trim() || null,
			cover_url: f.cover_url || null,
			is_published: f.is_published
		};
		const res = subject
			? await supabase.from('subjects').update(payload).eq('id', subject.id).select('id').single()
			: await supabase.from('subjects').insert({ ...payload, created_by: userId }).select('id').single();
		busy = false;
		if (res.error) return toast.error(errorMessage(res.error));
		toast(subject ? 'อัปเดตวิชาแล้ว' : 'สร้างวิชาแล้ว');
		onsaved(res.data.id);
	}
</script>

<form onsubmit={save} class="space-y-4" id="subject-form">
	<label class="group relative flex aspect-[16/7] cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-line bg-neutral-50 hover:border-brand-300">
		{#if f.cover_url}
			<img src={f.cover_url} alt="" class="absolute inset-0 h-full w-full object-cover" />
			<span class="relative rounded-full bg-black/60 px-3 py-1 text-sm text-white opacity-0 group-hover:opacity-100">เปลี่ยนรูปปก</span>
		{:else}
			<span class="flex flex-col items-center gap-1 text-muted">
				{#if uploading}<LoaderCircle class="animate-spin" />{:else}<ImagePlus />{/if}
				รูปปก (ไม่บังคับ)
			</span>
		{/if}
		<input type="file" accept="image/*" class="sr-only" onchange={uploadCover} />
	</label>
	<div class="grid grid-cols-[120px_1fr] gap-3">
		<div>
			<label class="label" for="s-code">รหัสวิชา</label>
			<input id="s-code" class="input" placeholder="ENG23 2010" maxlength="20" bind:value={f.code} />
		</div>
		<div>
			<label class="label" for="s-title">ชื่อวิชา (ภาษาอังกฤษ)</label>
			<input id="s-title" class="input" required maxlength="120" placeholder="Engineering Statics" bind:value={f.title} />
		</div>
	</div>
	<div>
		<label class="label" for="s-th">ชื่อวิชา (ภาษาไทย)</label>
		<input id="s-th" class="input" maxlength="120" placeholder="สถิตยศาสตร์วิศวกรรม" bind:value={f.title_th} />
	</div>
	<div>
		<label class="label" for="s-desc">รายละเอียด</label>
		<textarea id="s-desc" class="input min-h-28 font-read" maxlength="4000" placeholder="นักเรียนจะได้เรียนรู้อะไรบ้าง…" bind:value={f.description}></textarea>
	</div>
	<label class="flex items-center gap-3">
		<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={f.is_published} />
		<span>เผยแพร่แล้ว — แสดงในหน้าค้นหาคอร์ส</span>
	</label>
	<button class="btn btn-primary w-full" disabled={busy || uploading}>
		{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if}
		{subject ? 'บันทึก' : 'สร้างวิชา'}
	</button>
</form>
