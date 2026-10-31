<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { Check, Download, Mail, MessageCircle, Phone, Search, UserX, X } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { EDUCATION_LABEL, errorMessage, fullName, percent, timeAgo } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let q = $state('');
	let busyId = $state<string | null>(null);

	const pending = $derived(data.enrollments.filter((e) => e.status === 'pending'));
	const approved = $derived(
		data.enrollments.filter((e) => e.status === 'approved').filter((e) => {
			const s = q.trim().toLowerCase();
			if (!s) return true;
			return [e.student?.first_name, e.student?.last_name, e.student?.nickname, data.contacts[e.student_id]?.phone]
				.some((x) => x?.toLowerCase().includes(s));
		})
	);
	const rejected = $derived(data.enrollments.filter((e) => e.status === 'rejected'));
	const seatsLeft = $derived(
		data.term.capacity == null ? null : data.term.capacity - data.enrollments.filter((e) => e.status === 'approved').length
	);

	async function decide(id: string, status: 'approved' | 'rejected') {
		busyId = id;
		const { error } = await data.supabase.from('enrollments').update({ status }).eq('id', id);
		busyId = null;
		if (error) return toast.error(errorMessage(error));
		toast(status === 'approved' ? 'อนุมัตินักเรียนแล้ว' : 'ปฏิเสธคำขอแล้ว');
		await invalidate('app:students');
	}

	async function removeStudent(id: string, name: string) {
		if (!confirm(`นำ ${name} ออกจากคลาสนี้ใช่ไหม? น้องจะเข้าดูบทเรียนไม่ได้อีก`)) return;
		const { error } = await data.supabase.from('enrollments').delete().eq('id', id);
		if (error) return toast.error(errorMessage(error));
		toast('นำนักเรียนออกแล้ว');
		await invalidate('app:students');
	}

	async function message(studentId: string) {
		const { data: convId, error } = await data.supabase.rpc('start_conversation', { p_other_id: studentId });
		if (error) return toast.error(errorMessage(error));
		await goto(`/messages?c=${convId}`);
	}

	function exportCsv() {
		const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
		const header = ['ชื่อ', 'นามสกุล', 'ชื่อเล่น', 'ระดับการศึกษา', 'สถานศึกษา', 'เบอร์โทร', 'LINE', 'Facebook', 'Instagram', 'อีเมล', 'เช็คชื่อ'];
		const lines = data.enrollments
			.filter((e) => e.status === 'approved')
			.map((e) => {
				const c = data.contacts[e.student_id];
				return [
					e.student?.first_name, e.student?.last_name, e.student?.nickname,
					e.student?.education_level ? EDUCATION_LABEL[e.student.education_level] : '', e.student?.school,
					c?.phone, c?.line_id, c?.facebook, c?.instagram, c?.email,
					`${data.attended[e.student_id] ?? 0}/${data.sessionCount}`
				].map(esc).join(',');
			});
		// BOM so Excel opens Thai text correctly
		const blob = new Blob(['﻿' + [header.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${data.subject.title} ${data.term.name} รายชื่อนักเรียน.csv`;
		a.click();
		URL.revokeObjectURL(a.href);
	}
</script>

<svelte:head><title>นักเรียน · {data.subject.title}</title></svelte:head>

{#if pending.length}
	<section class="mb-10">
		<h2 class="section-title mb-1">รออนุมัติ <span class="text-muted">({pending.length})</span></h2>
		<p class="mb-4 text-sm text-muted">
			ตรวจสอบการชำระเงินก่อน แล้วค่อยกดอนุมัติ{#if seatsLeft !== null} · เหลือ {seatsLeft} ที่นั่ง{/if}
		</p>
		<ul class="space-y-3">
			{#each pending as e (e.id)}
				{@const c = data.contacts[e.student_id]}
				<li class="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
					<div class="flex min-w-0 flex-1 items-center gap-3">
						<Avatar profile={e.student} size={46} />
						<div class="min-w-0">
							<div class="truncate">{fullName(e.student)} <span class="text-muted">({e.student?.nickname})</span></div>
							<div class="text-sm text-muted">
								{e.student?.education_level ? EDUCATION_LABEL[e.student.education_level] : ''}
								{#if c?.phone} · {c.phone}{/if} · {timeAgo(e.requested_at)}
							</div>
							{#if e.message}<p class="mt-1 rounded-lg bg-sun-50 px-3 py-1.5 text-sm">“{e.message}”</p>{/if}
						</div>
					</div>
					<div class="flex gap-2">
						<button class="btn btn-soft btn-sm" onclick={() => message(e.student_id)} aria-label="ส่งข้อความ"><MessageCircle size={16} /></button>
						<button class="btn btn-danger btn-sm" disabled={busyId === e.id} onclick={() => decide(e.id, 'rejected')}><X size={16} /> ปฏิเสธ</button>
						<button class="btn btn-primary btn-sm" disabled={busyId === e.id || seatsLeft === 0} onclick={() => decide(e.id, 'approved')}><Check size={16} /> อนุมัติ</button>
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section>
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h2 class="section-title">รายชื่อนักเรียน <span class="text-muted">({data.enrollments.filter((e) => e.status === 'approved').length}{data.term.capacity ? `/${data.term.capacity}` : ''})</span></h2>
		<div class="flex gap-2">
			<label class="relative">
				<Search size={16} class="absolute top-1/2 left-3 -translate-y-1/2 text-subtle" />
				<input class="input rounded-full py-2 pl-9 text-sm" placeholder="ค้นหา…" bind:value={q} />
			</label>
			<button class="btn btn-outline btn-sm" onclick={exportCsv}><Download size={16} /> CSV</button>
		</div>
	</div>

	{#if approved.length === 0}
		<EmptyState title={q ? 'ไม่พบผลลัพธ์' : 'ยังไม่มีนักเรียน'} text={q ? '' : 'นักเรียนที่อนุมัติแล้วจะแสดงที่นี่'} />
	{:else}
		<div class="overflow-x-auto rounded-2xl border border-line">
			<table class="w-full min-w-[720px] text-left">
				<thead class="bg-neutral-50 text-sm text-muted">
					<tr>
						<th class="px-4 py-3 font-normal">นักเรียน</th>
						<th class="px-4 py-3 font-normal">ช่องทางติดต่อ</th>
						<th class="px-4 py-3 font-normal">เช็คชื่อ</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each approved as e (e.id)}
						{@const c = data.contacts[e.student_id]}
						{@const att = data.attended[e.student_id] ?? 0}
						<tr>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<Avatar profile={e.student} size={38} />
									<div>
										<div>{e.student?.nickname} <span class="text-muted">· {fullName(e.student)}</span></div>
										<div class="text-xs text-muted">{e.student?.school ?? (e.student?.education_level ? EDUCATION_LABEL[e.student.education_level] : '')}</div>
									</div>
								</div>
							</td>
							<td class="px-4 py-3 text-sm">
								{#if c?.phone}<a href="tel:{c.phone}" class="flex items-center gap-1.5 hover:text-brand-600"><Phone size={13} /> {c.phone}</a>{/if}
								{#if c?.line_id}<div class="text-muted">LINE: {c.line_id}</div>{/if}
								{#if c?.facebook}<div class="truncate text-muted">FB: {c.facebook}</div>{/if}
								{#if c?.instagram}<div class="text-muted">IG: @{c.instagram}</div>{/if}
								{#if c?.email}<a href="mailto:{c.email}" class="flex items-center gap-1.5 text-muted hover:text-brand-600"><Mail size={13} /> {c.email}</a>{/if}
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<div class="h-1.5 w-20 overflow-hidden rounded-full bg-neutral-100">
										<div class="h-full bg-brand-600" style="width:{percent(att, data.sessionCount)}%"></div>
									</div>
									<span class="text-sm">{att}/{data.sessionCount}</span>
								</div>
							</td>
							<td class="px-4 py-3 text-right whitespace-nowrap">
								<button class="btn btn-soft btn-sm" onclick={() => message(e.student_id)}><MessageCircle size={15} /> แชท</button>
								<button class="btn btn-ghost btn-sm text-brand-600" aria-label="นำออก" onclick={() => removeStudent(e.id, fullName(e.student))}><UserX size={15} /></button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</section>

{#if rejected.length}
	<section class="mt-10">
		<h2 class="mb-3 text-lg text-muted">ปฏิเสธแล้ว</h2>
		<ul class="flex flex-wrap gap-2">
			{#each rejected as e (e.id)}
				<li class="chip text-sm">
					{fullName(e.student)} <StatusBadge status="rejected" />
					<button class="text-brand-600 hover:underline" onclick={() => decide(e.id, 'approved')}>อนุมัติ</button>
				</li>
			{/each}
		</ul>
	</section>
{/if}
