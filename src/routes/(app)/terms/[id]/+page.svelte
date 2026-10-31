<script lang="ts">
	import { invalidate } from '$app/navigation';
	import {
		ArrowDown,
		ArrowUp,
		CircleCheck,
		EyeOff,
		FileText,
		Film,
		Image,
		Link,
		Paperclip,
		Pencil,
		Plus,
		Trash2
	} from '@lucide/svelte';
	import ContentForm from '#lib/components/ContentForm.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, formatDuration, percent } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const icons = { video: Film, text: FileText, image: Image, file: Paperclip, link: Link };
	const typeLabels = { video: 'วิดีโอ', text: 'บทความ', image: 'รูปภาพ', file: 'ไฟล์', link: 'ลิงก์' };

	const groups = $derived.by(() => {
		const map = new Map<string, Tables<'contents'>[]>();
		for (const c of data.contents) {
			const key = c.section || 'บทเรียน';
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(c);
		}
		return [...map.entries()];
	});
	const sections = $derived([...new Set(data.contents.map((c) => c.section).filter((s): s is string => !!s))]);
	const doneCount = $derived(
		data.contents.filter((c) => (c.type === 'video' ? data.progress[c.id]?.completed_at : data.viewed.has(c.id))).length
	);

	let formOpen = $state(false);
	let editing = $state<Tables<'contents'> | null>(null);

	function openNew() {
		editing = null;
		formOpen = true;
	}
	function openEdit(c: Tables<'contents'>) {
		editing = c;
		formOpen = true;
	}

	async function remove(c: Tables<'contents'>) {
		if (!confirm(`ลบ "${c.title}" ใช่ไหม? ความคืบหน้าของนักเรียนในบทเรียนนี้จะถูกลบไปด้วย`)) return;
		const { error } = await data.supabase.from('contents').delete().eq('id', c.id);
		if (error) return toast.error(errorMessage(error));
		if (c.storage_path) await data.supabase.storage.from('course-media').remove([c.storage_path]);
		toast('ลบบทเรียนแล้ว');
		await invalidate('app:contents');
	}

	async function move(c: Tables<'contents'>, dir: -1 | 1) {
		const list = data.contents;
		const i = list.findIndex((x) => x.id === c.id);
		const j = i + dir;
		if (j < 0 || j >= list.length) return;
		// Re-number the whole list so positions stay unique and gap-free
		const ordered = [...list];
		[ordered[i], ordered[j]] = [ordered[j], ordered[i]];
		const results = await Promise.all(
			ordered.map((x, idx) =>
				x.position === idx ? null : data.supabase.from('contents').update({ position: idx }).eq('id', x.id)
			)
		);
		const err = results.find((r) => r?.error)?.error;
		if (err) toast.error(errorMessage(err));
		await invalidate('app:contents');
	}
</script>

<svelte:head><title>บทเรียน · {data.subject.title}</title></svelte:head>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	{#if data.isStaff}
		<p class="text-muted">คลาสนี้มี {data.contents.length} รายการ</p>
		<button class="btn btn-primary" onclick={openNew}><Plus size={18} /> เพิ่มบทเรียน</button>
	{:else if data.contents.length}
		<div class="flex w-full items-center gap-4 rounded-2xl bg-neutral-50 p-4">
			<div class="flex-1">
				<div class="flex justify-between text-sm"><span>ความคืบหน้าของน้อง</span><span>{doneCount}/{data.contents.length}</span></div>
				<div class="mt-2 h-2 overflow-hidden rounded-full bg-white">
					<div class="h-full rounded-full bg-brand-600 transition-all" style="width:{percent(doneCount, data.contents.length)}%"></div>
				</div>
			</div>
		</div>
	{/if}
</div>

{#if data.contents.length === 0}
	<EmptyState
		title={data.isStaff ? 'ยังไม่มีบทเรียน' : 'บทเรียนกำลังจะมาเร็ว ๆ นี้'}
		text={data.isStaff ? 'เพิ่มวิดีโอ โน้ต รูปภาพ หรือไฟล์ให้นักเรียนได้เลย' : 'ติวเตอร์ยังไม่ได้โพสต์บทเรียน'}
	>
		{#snippet icon()}<Film size={26} />{/snippet}
		{#if data.isStaff}<button class="btn btn-primary" onclick={openNew}><Plus size={18} /> เพิ่มบทเรียนแรก</button>{/if}
	</EmptyState>
{/if}

<div class="space-y-8">
	{#each groups as [section, items] (section)}
		<section>
			<h2 class="card-title mb-3">{section}</h2>
			<ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
				{#each items as c (c.id)}
					{@const Icon = icons[c.type]}
					{@const prog = data.progress[c.id]}
					{@const done = c.type === 'video' ? !!prog?.completed_at : data.viewed.has(c.id)}
					<li class="group flex items-center gap-4 bg-white px-4 py-3.5 transition hover:bg-neutral-50">
						<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {done ? 'bg-success-50 text-success-600' : 'bg-brand-50 text-brand-600'}">
							{#if done}<CircleCheck size={20} />{:else}<Icon size={20} />{/if}
						</span>
						<a href="/terms/{data.term.id}/content/{c.id}" class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<span class="truncate">{c.title}</span>
								{#if !c.is_published}<span class="badge bg-neutral-100 text-muted"><EyeOff size={12} /> ซ่อนอยู่</span>{/if}
							</div>
							<div class="mt-0.5 text-sm text-muted">
								{typeLabels[c.type]}{#if c.duration_seconds} · {formatDuration(c.duration_seconds)}{/if}
								{#if prog && !prog.completed_at && c.type === 'video'}
									· ดูแล้ว {percent(prog.watched_seconds, prog.duration_seconds)}%
								{/if}
							</div>
						</a>
						{#if data.isStaff}
							<div class="flex items-center opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
								<button class="btn-ghost rounded-full p-2" aria-label="เลื่อนขึ้น" onclick={() => move(c, -1)}><ArrowUp size={16} /></button>
								<button class="btn-ghost rounded-full p-2" aria-label="เลื่อนลง" onclick={() => move(c, 1)}><ArrowDown size={16} /></button>
								<button class="btn-ghost rounded-full p-2" aria-label="แก้ไข" onclick={() => openEdit(c)}><Pencil size={16} /></button>
								<button class="btn-ghost rounded-full p-2 text-brand-600" aria-label="ลบ" onclick={() => remove(c)}><Trash2 size={16} /></button>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

{#if data.isStaff && data.user}
	<Modal bind:open={formOpen} title={editing ? 'แก้ไขบทเรียน' : 'เพิ่มบทเรียน'} width="max-w-2xl">
		{#key editing?.id}
			<ContentForm
				supabase={data.supabase}
				termId={data.term.id}
				userId={data.user.id}
				content={editing}
				{sections}
				nextPosition={data.contents.length}
				onsaved={() => {
					formOpen = false;
					void invalidate('app:contents');
				}}
			/>
		{/key}
	</Modal>
{/if}
