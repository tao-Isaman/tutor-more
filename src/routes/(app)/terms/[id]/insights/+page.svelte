<script lang="ts">
	import { ChartColumn, Eye, Film, TriangleAlert, Users } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import { displayName, formatDuration, percent } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Cell = (typeof data.report)[number];
	const cells = $derived(new Map(data.report.map((r) => [`${r.student_id}:${r.content_id}`, r])));
	const cell = (s: string, c: string): Cell | undefined => cells.get(`${s}:${c}`);

	/** 0–100 engagement for a cell: video → watched %, others → opened or not */
	function score(c: (typeof data.contents)[number], r: Cell | undefined) {
		if (!r) return 0;
		if (c.type === 'video') return percent(r.watched_seconds, r.duration_seconds || c.duration_seconds || 0);
		return r.view_count > 0 ? 100 : 0;
	}

	const perContent = $derived(
		data.contents.map((c) => {
			const scores = data.students.map((s) => score(c, cell(s.id, c.id)));
			const opened = data.students.filter((s) => (cell(s.id, c.id)?.view_count ?? 0) > 0).length;
			return { c, opened, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0 };
		})
	);

	const perStudent = $derived(
		data.students
			.map((s) => {
				const scores = data.contents.map((c) => score(c, cell(s.id, c.id)));
				const watched = data.report.filter((r) => r.student_id === s.id).reduce((a, r) => a + r.watched_seconds, 0);
				return { s, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0, watched };
			})
			.sort((a, b) => a.avg - b.avg)
	);
	const atRisk = $derived(perStudent.filter((x) => x.avg < 30));
	const classAvg = $derived(perStudent.length ? Math.round(perStudent.reduce((a, x) => a + x.avg, 0) / perStudent.length) : 0);

	const shade = (v: number) =>
		v >= 90 ? 'bg-emerald-500 text-white' : v >= 50 ? 'bg-sun-300' : v > 0 ? 'bg-sun-100' : 'bg-neutral-100 text-neutral-400';
</script>

<svelte:head><title>สถิติการเรียน · {data.subject.title}</title></svelte:head>

{#if data.contents.length === 0 || data.students.length === 0}
	<EmptyState title="ยังมีข้อมูลไม่พอ" text="สถิติการเรียนจะแสดงเมื่อมีบทเรียนและนักเรียนที่อนุมัติแล้ว">
		{#snippet icon()}<ChartColumn size={26} />{/snippet}
	</EmptyState>
{:else}
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="card p-5"><div class="flex items-center gap-2 text-sm text-muted"><Users size={16} /> นักเรียน</div><div class="mt-1 text-3xl">{data.students.length}</div></div>
		<div class="card p-5"><div class="flex items-center gap-2 text-sm text-muted"><Eye size={16} /> ความตั้งใจเรียนเฉลี่ย</div><div class="mt-1 text-3xl">{classAvg}%</div></div>
		<div class="card p-5 {atRisk.length ? 'border-brand-200 bg-brand-50/50' : ''}">
			<div class="flex items-center gap-2 text-sm text-muted"><TriangleAlert size={16} /> เรียนตามไม่ทัน (&lt;30%)</div>
			<div class="mt-1 text-3xl {atRisk.length ? 'text-brand-600' : ''}">{atRisk.length}</div>
		</div>
	</div>

	<h2 class="mt-10 mb-3 text-xl">ใครดูอะไรไปแล้วบ้าง</h2>
	<p class="mb-4 text-sm text-muted">วิดีโอแสดงเป็น % ของเวลาที่ดูจริง (ดูซ้ำไม่นับเพิ่ม) ส่วนบทเรียนประเภทอื่นแสดงว่าเปิดดูแล้วหรือยัง</p>
	<div class="overflow-x-auto rounded-2xl border border-line">
		<table class="text-sm">
			<thead>
				<tr class="bg-neutral-50">
					<th class="sticky left-0 z-10 min-w-56 bg-neutral-50 px-4 py-3 text-left font-normal text-muted">นักเรียน</th>
					{#each perContent as { c, avg } (c.id)}
						<th class="min-w-24 px-2 py-3 text-center align-bottom font-normal">
							<a href="/terms/{data.term.id}/content/{c.id}" class="line-clamp-2 hover:text-brand-600" title={c.title}>{c.title}</a>
							<div class="mt-1 text-xs text-muted">{#if c.type === 'video'}<Film size={11} class="inline" />{/if} เฉลี่ย {avg}%</div>
						</th>
					{/each}
					<th class="min-w-24 px-3 py-3 font-normal text-muted">รวม</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-line">
				{#each perStudent as { s, avg, watched } (s.id)}
					<tr>
						<td class="sticky left-0 z-10 bg-white px-4 py-2">
							<div class="flex items-center gap-2">
								<Avatar profile={s} size={30} />
								<div class="min-w-0">
									<div class="truncate">{displayName(s)}</div>
									<div class="text-xs text-muted">ดูไปแล้ว {formatDuration(watched)}</div>
								</div>
							</div>
						</td>
						{#each data.contents as c (c.id)}
							{@const r = cell(s.id, c.id)}
							{@const v = score(c, r)}
							<td class="px-1 py-1 text-center">
								<span
									class="inline-flex h-8 w-full min-w-16 items-center justify-center rounded-lg text-xs {shade(v)}"
									title={c.type === 'video' && r ? `ดูแล้ว ${formatDuration(r.watched_seconds)} จาก ${formatDuration(r.duration_seconds)}` : r?.view_count ? `เปิดดู ${r.view_count} ครั้ง` : 'ยังไม่เปิดดู'}
								>
									{c.type === 'video' ? `${v}%` : v ? '✓' : '—'}
								</span>
							</td>
						{/each}
						<td class="px-3 text-center {avg < 30 ? 'text-brand-600' : ''}">{avg}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
