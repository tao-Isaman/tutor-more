<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { LoaderCircle } from '@lucide/svelte';
	import type { Database, Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage } from '#lib/utils.ts';

	let {
		supabase,
		subjectId,
		term = null,
		onsaved
	}: {
		supabase: SupabaseClient<Database>;
		subjectId: string;
		term?: Tables<'terms'> | null;
		onsaved: (id: string) => void;
	} = $props();

	// The form is re-mounted per record, so reading props once is intended.
	// svelte-ignore state_referenced_locally
	let f = $state({
		name: term?.name ?? '',
		description: term?.description ?? '',
		price: term?.price ?? 2000,
		capacity: term?.capacity ?? 40,
		start_date: term?.start_date ?? '',
		end_date: term?.end_date ?? '',
		schedule_note: term?.schedule_note ?? '',
		is_published: term?.is_published ?? false
	});
	let busy = $state(false);

	async function save(e: SubmitEvent) {
		e.preventDefault();
		if (f.start_date && f.end_date && f.end_date < f.start_date) return toast.error('วันสิ้นสุดต้องไม่อยู่ก่อนวันเริ่ม');
		busy = true;
		const payload = {
			name: f.name.trim(),
			description: f.description.trim() || null,
			price: Number(f.price) || 0,
			capacity: f.capacity ? Number(f.capacity) : null,
			start_date: f.start_date || null,
			end_date: f.end_date || null,
			schedule_note: f.schedule_note.trim() || null,
			is_published: f.is_published
		};
		const res = term
			? await supabase.from('terms').update(payload).eq('id', term.id).select('id').single()
			: await supabase.from('terms').insert({ ...payload, subject_id: subjectId }).select('id').single();
		busy = false;
		if (res.error) return toast.error(errorMessage(res.error));
		toast(term ? 'บันทึกเทอมแล้ว' : 'สร้างเทอมแล้ว');
		onsaved(res.data.id);
	}
</script>

<form onsubmit={save} class="space-y-4">
	<div class="grid grid-cols-2 gap-3">
		<div>
			<label class="label" for="t-name">ชื่อเทอม</label>
			<input id="t-name" class="input" required maxlength="60" placeholder="2/2569" bind:value={f.name} />
		</div>
		<div>
			<label class="label" for="t-price">ราคา (฿)</label>
			<input id="t-price" class="input" type="number" min="0" step="1" bind:value={f.price} />
		</div>
		<div>
			<label class="label" for="t-start">วันเริ่ม</label>
			<input id="t-start" class="input" type="date" bind:value={f.start_date} />
		</div>
		<div>
			<label class="label" for="t-end">วันสิ้นสุด</label>
			<input id="t-end" class="input" type="date" bind:value={f.end_date} />
		</div>
		<div>
			<label class="label" for="t-cap">ที่นั่ง</label>
			<input id="t-cap" class="input" type="number" min="1" placeholder="ไม่จำกัด" bind:value={f.capacity} />
		</div>
	</div>
	<div>
		<label class="label" for="t-sched">ตารางเรียน</label>
		<input id="t-sched" class="input" maxlength="500" placeholder="เริ่มเรียนสัปดาห์ที่ 2 หลังเปิดเทอม · นัดวันเวลากันในคลาส" bind:value={f.schedule_note} />
	</div>
	<div>
		<label class="label" for="t-desc">สิ่งที่ได้รับ</label>
		<textarea id="t-desc" class="input min-h-24 font-read" maxlength="4000" placeholder="แจกชีทฟรี (2 เล่ม) · เนื้อหา + ข้อสอบเก่า + แบบฝึกหัด · มีควิซหลังเรียน" bind:value={f.description}></textarea>
	</div>
	<label class="flex items-center gap-3">
		<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={f.is_published} />
		<span>เปิดรับสมัคร</span>
	</label>
	<button class="btn btn-primary w-full" disabled={busy}>
		{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if}
		{term ? 'บันทึก' : 'สร้างเทอม'}
	</button>
</form>
