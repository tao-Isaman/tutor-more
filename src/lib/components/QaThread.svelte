<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { CircleCheck, CornerDownRight, LoaderCircle, MessageSquare, Send, Trash2 } from '@lucide/svelte';
	import Avatar from './Avatar.svelte';
	import type { Database, Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { PROFILE_LITE, displayName, errorMessage, timeAgo, type ProfileLite } from '#lib/utils.ts';

	type Comment = Tables<'comments'> & { author: ProfileLite | null };

	let {
		supabase,
		contentId,
		userId,
		isStaff,
		initial
	}: {
		supabase: SupabaseClient<Database>;
		contentId: string;
		userId: string;
		isStaff: boolean;
		initial: Comment[];
	} = $props();

	// svelte-ignore state_referenced_locally
	let comments = $state<Comment[]>(initial);
	let body = $state('');
	let replyTo = $state<string | null>(null);
	let replyBody = $state('');
	let busy = $state(false);

	const roots = $derived(comments.filter((c) => !c.parent_id));
	const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);

	async function fetchOne(id: string) {
		const { data } = await supabase.from('comments').select(`*, author:profiles(${PROFILE_LITE})`).eq('id', id).maybeSingle();
		return data as Comment | null;
	}

	// Live updates: new questions/answers appear without refresh
	$effect(() => {
		const ch = supabase
			.channel(`qa-${contentId}`)
			.on('postgres_changes', { event: '*', schema: 'public', table: 'comments', filter: `content_id=eq.${contentId}` }, async (p) => {
				if (p.eventType === 'DELETE') {
					comments = comments.filter((c) => c.id !== (p.old as { id: string }).id);
					return;
				}
				const row = await fetchOne((p.new as { id: string }).id);
				if (!row) return;
				const i = comments.findIndex((c) => c.id === row.id);
				if (i >= 0) comments[i] = row;
				else comments.push(row);
			})
			.subscribe();
		return () => void supabase.removeChannel(ch);
	});

	async function post(text: string, parent: string | null) {
		const trimmed = text.trim();
		if (!trimmed) return false;
		busy = true;
		const { data, error } = await supabase
			.from('comments')
			.insert({ content_id: contentId, user_id: userId, body: trimmed, parent_id: parent })
			.select(`*, author:profiles(${PROFILE_LITE})`)
			.single();
		busy = false;
		if (error) {
			toast.error(errorMessage(error));
			return false;
		}
		if (!comments.some((c) => c.id === data.id)) comments.push(data as Comment);
		return true;
	}

	async function ask(e: SubmitEvent) {
		e.preventDefault();
		if (await post(body, null)) body = '';
	}
	async function reply(e: SubmitEvent, parent: string) {
		e.preventDefault();
		if (await post(replyBody, parent)) {
			replyBody = '';
			replyTo = null;
		}
	}
	async function toggleResolved(c: Comment) {
		const { error } = await supabase.from('comments').update({ is_resolved: !c.is_resolved }).eq('id', c.id);
		if (error) return toast.error(errorMessage(error));
		c.is_resolved = !c.is_resolved;
	}
	async function remove(c: Comment) {
		if (!confirm('ลบข้อความนี้ใช่ไหม?')) return;
		const { error } = await supabase.from('comments').delete().eq('id', c.id);
		if (error) return toast.error(errorMessage(error));
		comments = comments.filter((x) => x.id !== c.id && x.parent_id !== c.id);
	}
</script>

{#snippet item(c: Comment, isReply: boolean)}
	{@const staffAuthor = c.author?.role === 'tutor' || c.author?.role === 'admin'}
	<div class="flex gap-3">
		<Avatar profile={c.author} size={isReply ? 32 : 40} />
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-2 text-sm">
				<span class="font-normal">{displayName(c.author)}</span>
				{#if staffAuthor}<span class="badge bg-brand-600 text-white">ติวเตอร์</span>{/if}
				<span class="text-muted">{timeAgo(c.created_at)}</span>
				{#if !isReply && c.is_resolved}<span class="badge bg-success-50 text-success-700"><CircleCheck size={12} /> ตอบแล้ว</span>{/if}
			</div>
			<p class="mt-1 font-read whitespace-pre-wrap text-neutral-800">{c.body}</p>
			<div class="mt-1 flex gap-3 text-sm text-muted">
				{#if !isReply}
					<button class="hover:text-ink" onclick={() => (replyTo = replyTo === c.id ? null : c.id)}>ตอบกลับ</button>
					{#if isStaff || c.user_id === userId}
						<button class="hover:text-ink" onclick={() => toggleResolved(c)}>{c.is_resolved ? 'เปิดอีกครั้ง' : 'ทำเครื่องหมายว่าตอบแล้ว'}</button>
					{/if}
				{/if}
				{#if isStaff || c.user_id === userId}
					<button class="hover:text-brand-600" onclick={() => remove(c)} aria-label="ลบ"><Trash2 size={14} /></button>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<section>
	<h2 class="mb-4 flex items-center gap-2 text-xl"><MessageSquare size={20} class="text-brand-600" /> ถาม-ตอบ</h2>

	<form onsubmit={ask} class="mb-6 flex items-end gap-2">
		<textarea
			class="input min-h-[52px] flex-1 resize-y"
			rows="1"
			maxlength="4000"
			placeholder="สงสัยตรงไหนในบทเรียนนี้ ถามได้เลย…"
			bind:value={body}
			onkeydown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && e.currentTarget.form?.requestSubmit()}
		></textarea>
		<button class="btn btn-primary h-[52px]" disabled={busy || !body.trim()} aria-label="ส่งคำถาม">
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{:else}<Send size={18} />{/if}
		</button>
	</form>

	{#if roots.length === 0}
		<p class="rounded-2xl bg-neutral-50 px-5 py-6 text-center text-muted">ยังไม่มีคำถาม — มาเป็นคนแรกที่ถามกันเลย</p>
	{/if}

	<ul class="space-y-6">
		{#each roots as c (c.id)}
			<li>
				{@render item(c, false)}
				<div class="mt-3 ml-12 space-y-4">
					{#each repliesOf(c.id) as r (r.id)}
						{@render item(r, true)}
					{/each}
					{#if replyTo === c.id}
						<form onsubmit={(e) => reply(e, c.id)} class="flex items-center gap-2">
							<CornerDownRight size={16} class="shrink-0 text-muted" />
							<!-- svelte-ignore a11y_autofocus -->
							<input class="input" maxlength="4000" placeholder="เขียนคำตอบ…" autofocus bind:value={replyBody} />
							<button class="btn btn-primary btn-sm" disabled={busy || !replyBody.trim()}>ตอบกลับ</button>
						</form>
					{/if}
				</div>
			</li>
		{/each}
	</ul>
</section>
