<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { CheckCheck, LoaderCircle, Megaphone, Pin, Plus, Trash2 } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { displayName, errorMessage, formatDateTime, fullName } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let open = $state(false);
	let form = $state({ title: '', body: '', is_pinned: false });
	let busy = $state(false);
	let readersOf = $state<string | null>(null);

	// Students: mark everything visible as read once
	$effect(() => {
		if (data.isStaff) return;
		for (const a of data.announcements) {
			if (!a.reads.some((r) => r.user_id === data.userId)) {
				void data.supabase.rpc('mark_announcement_read', { p_announcement_id: a.id });
			}
		}
	});

	async function post(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		const { error } = await data.supabase.from('announcements').insert({
			term_id: data.term.id,
			author_id: data.userId,
			title: form.title.trim(),
			body: form.body.trim(),
			is_pinned: form.is_pinned
		});
		busy = false;
		if (error) return toast.error(errorMessage(error));
		toast('โพสต์ประกาศแล้ว');
		form = { title: '', body: '', is_pinned: false };
		open = false;
		await invalidate('app:announcements');
	}

	async function togglePin(id: string, pinned: boolean) {
		const { error } = await data.supabase.from('announcements').update({ is_pinned: !pinned }).eq('id', id);
		if (error) return toast.error(errorMessage(error));
		await invalidate('app:announcements');
	}

	async function remove(id: string) {
		if (!confirm('ลบประกาศนี้ใช่ไหม?')) return;
		const { error } = await data.supabase.from('announcements').delete().eq('id', id);
		if (error) return toast.error(errorMessage(error));
		await invalidate('app:announcements');
	}

	const selected = $derived(data.announcements.find((a) => a.id === readersOf));
</script>

<svelte:head><title>ประกาศ · {data.subject.title}</title></svelte:head>

{#if data.isStaff}
	<div class="mb-6 flex justify-end">
		<button class="btn btn-primary" onclick={() => (open = true)}><Plus size={18} /> ประกาศใหม่</button>
	</div>
{/if}

{#if data.announcements.length === 0}
	<EmptyState title="ยังไม่มีประกาศ" text={data.isStaff ? 'โพสต์แจ้งเปลี่ยนเวลาเรียน การบ้าน หรือทริคก่อนสอบได้ที่นี่' : 'ประกาศจากติวเตอร์จะแสดงที่นี่'}>
		{#snippet icon()}<Megaphone size={26} />{/snippet}
	</EmptyState>
{/if}

<div class="mx-auto max-w-3xl space-y-4">
	{#each data.announcements as a (a.id)}
		<article class="card p-6 {a.is_pinned ? 'border-sun-300 bg-sun-50/40' : ''}">
			<header class="flex items-start gap-3">
				<Avatar profile={a.author} size={42} />
				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h2 class="card-title">{a.title}</h2>
						{#if a.is_pinned}<span class="badge bg-sun-200 text-ink"><Pin size={12} /> ปักหมุดแล้ว</span>{/if}
					</div>
					<div class="text-sm text-muted">{fullName(a.author)} · {formatDateTime(a.created_at)}</div>
				</div>
				{#if data.isStaff}
					<div class="flex">
						<button class="btn-ghost rounded-full p-2" aria-label="ปักหมุด" onclick={() => togglePin(a.id, a.is_pinned)}><Pin size={16} /></button>
						<button class="btn-ghost rounded-full p-2 text-brand-600" aria-label="ลบ" onclick={() => remove(a.id)}><Trash2 size={16} /></button>
					</div>
				{/if}
			</header>
			<Markdown source={a.body} class="mt-3" />
			{#if data.isStaff}
				<button class="mt-4 flex items-center gap-2 text-sm text-muted hover:text-ink" onclick={() => (readersOf = a.id)}>
					<CheckCheck size={16} class="text-success-600" />
					อ่านแล้ว {a.reads.length} จาก {data.students.length} คน
				</button>
			{/if}
		</article>
	{/each}
</div>

<Modal bind:open title="ประกาศใหม่" width="max-w-2xl">
	<form id="ann" onsubmit={post} class="space-y-4">
		<div>
			<label class="label" for="a-title">หัวข้อ</label>
			<input id="a-title" class="input" required maxlength="200" bind:value={form.title} />
		</div>
		<div>
			<label class="label" for="a-body">ข้อความ <span class="text-muted">(รองรับ Markdown)</span></label>
			<textarea id="a-body" class="input min-h-40 font-read" required maxlength="20000" bind:value={form.body}></textarea>
		</div>
		<label class="flex items-center gap-3">
			<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={form.is_pinned} /> ปักหมุดไว้ด้านบน
		</label>
	</form>
	{#snippet footer()}
		<button class="btn btn-soft" onclick={() => (open = false)}>ยกเลิก</button>
		<button class="btn btn-primary" form="ann" disabled={busy}>
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} โพสต์
		</button>
	{/snippet}
</Modal>

<Modal bind:open={() => readersOf !== null, (v) => !v && (readersOf = null)} title="ผู้อ่าน">
	{#if selected}
		{@const readMap = new Map(selected.reads.map((r) => [r.user_id, r.read_at]))}
		<ul class="space-y-3">
			{#each data.students as s (s.id)}
				<li class="flex items-center gap-3">
					<Avatar profile={s} size={34} />
					<span class="flex-1 truncate">{displayName(s)}</span>
					{#if readMap.has(s.id)}
						<span class="text-sm text-success-700">อ่านแล้ว {formatDateTime(readMap.get(s.id))}</span>
					{:else}
						<span class="text-sm text-brand-600">ยังไม่อ่าน</span>
					{/if}
				</li>
			{:else}
				<li class="text-muted">ยังไม่มีนักเรียนที่อนุมัติแล้ว</li>
			{/each}
		</ul>
	{/if}
</Modal>
