<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { BookOpen, Check, ChevronRight, Plus, X } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import SubjectForm from '#lib/components/SubjectForm.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, fullName, timeAgo } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let newOpen = $state(false);

	async function decide(id: string, status: 'approved' | 'rejected') {
		const { error } = await data.supabase.from('enrollments').update({ status }).eq('id', id);
		if (error) return toast.error(errorMessage(error));
		toast(status === 'approved' ? 'อนุมัติแล้ว' : 'ปฏิเสธแล้ว');
		await invalidate('app:teach');
	}
</script>

<svelte:head><title>การสอน · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
	<div class="flex flex-wrap items-end justify-between gap-3">
		<div>
			<h1 class="page-title">การสอน</h1>
			<p class="mt-1 text-muted">วิชา เทอม และคำขอเข้าเรียนของคุณ</p>
		</div>
		<button class="btn btn-primary" onclick={() => (newOpen = true)}><Plus size={18} /> เพิ่มวิชา</button>
	</div>

	{#if data.pending.length}
		<section class="mt-8">
			<h2 class="section-title mb-3">คำขอเข้าเรียน <span class="text-muted">({data.pending.length})</span></h2>
			<ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
				{#each data.pending as e (e.id)}
					<li class="flex flex-col gap-3 bg-white p-4 sm:flex-row sm:items-center">
						<div class="flex min-w-0 flex-1 items-center gap-3">
							<Avatar profile={e.student} size={42} />
							<div class="min-w-0">
								<div class="truncate">{fullName(e.student)} <span class="text-muted">({e.student?.nickname})</span></div>
								<div class="text-sm text-muted">{e.term?.subject?.title} · {e.term?.name} · {timeAgo(e.requested_at)}</div>
								{#if e.message}<div class="mt-1 truncate text-sm">“{e.message}”</div>{/if}
							</div>
						</div>
						<div class="flex gap-2">
							<a href="/terms/{e.term_id}/students" class="btn btn-ghost btn-sm">รายละเอียด</a>
							<button class="btn btn-danger btn-sm" onclick={() => decide(e.id, 'rejected')}><X size={15} /></button>
							<button class="btn btn-primary btn-sm" onclick={() => decide(e.id, 'approved')}><Check size={15} /> อนุมัติ</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<section class="mt-10">
		<h2 class="section-title mb-4">วิชา</h2>
		{#if data.subjects.length === 0}
			<EmptyState title="ยังไม่มีวิชา" text="สร้างวิชาแรกของคุณ แล้วเพิ่มเทอม (เช่น 2/2569) เพื่อเปิดรับนักเรียน">
				{#snippet icon()}<BookOpen size={26} />{/snippet}
				<button class="btn btn-primary" onclick={() => (newOpen = true)}><Plus size={18} /> เพิ่มวิชา</button>
			</EmptyState>
		{/if}
		<div class="grid gap-5 md:grid-cols-2">
			{#each data.subjects as s (s.id)}
				<article class="card overflow-hidden">
					<a href="/subjects/{s.id}" class="flex items-center gap-4 border-b border-line p-5 hover:bg-neutral-50">
						<span class="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-600 text-white">
							{#if s.cover_url}<img src={s.cover_url} alt="" class="h-full w-full object-cover" />{:else}<BookOpen />{/if}
						</span>
						<div class="min-w-0 flex-1">
							<div class="truncate text-lg">{s.title}</div>
							<div class="text-sm text-muted">{s.code ?? ''} {s.title_th ?? ''}</div>
						</div>
						<StatusBadge status={s.is_published ? 'published' : 'draft'} />
					</a>
					<ul>
						{#each s.terms as t (t.id)}
							<li>
								<a href="/terms/{t.id}" class="flex items-center justify-between px-5 py-3 hover:bg-neutral-50">
									<span>เทอม {t.name}</span>
									<span class="flex items-center gap-2 text-sm text-muted">
										{#if !t.is_published}<StatusBadge status="draft" />{/if}
										<ChevronRight size={16} />
									</span>
								</a>
							</li>
						{:else}
							<li class="px-5 py-3 text-sm text-muted">
								ยังไม่มีเทอม — <a href="/subjects/{s.id}" class="text-brand-600 hover:underline">เพิ่มเทอม</a>
							</li>
						{/each}
					</ul>
				</article>
			{/each}
		</div>
	</section>
</div>

<Modal bind:open={newOpen} title="เพิ่มวิชา">
	<SubjectForm
		supabase={data.supabase}
		userId={data.user!.id}
		onsaved={(id) => {
			newOpen = false;
			void goto(`/subjects/${id}`);
		}}
	/>
</Modal>
