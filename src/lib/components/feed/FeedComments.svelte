<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { CornerDownRight, Heart, LoaderCircle, SendHorizontal, Trash2 } from '@lucide/svelte';
	import { tick } from 'svelte';
	import Avatar from '../Avatar.svelte';
	import type { Database } from '#lib/database.types.ts';
	import { COMMENT_SELECT, type FeedComment } from '#lib/feed.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, timeAgo, type ProfileLite } from '#lib/utils.ts';

	let {
		supabase,
		postId,
		me,
		isStaff,
		comments = $bindable(),
		focusSignal = 0
	}: {
		supabase: SupabaseClient<Database>;
		postId: string;
		me: ProfileLite;
		isStaff: boolean;
		comments: FeedComment[];
		/** bump to focus the main comment box (the post's "แสดงความคิดเห็น" button) */
		focusSignal?: number;
	} = $props();

	const PREVIEW_ROOTS = 2;

	let body = $state('');
	let sending = $state(false);
	let showAll = $state(false);
	let expanded = $state<Record<string, boolean>>({});
	let replyTarget = $state<{ rootId: string; to: FeedComment } | null>(null);
	let replyBody = $state('');
	let mainInput = $state<HTMLTextAreaElement>();
	let replyInput = $state<HTMLTextAreaElement>();

	const roots = $derived(comments.filter((c) => !c.parent_id));
	const visibleRoots = $derived(showAll ? roots : roots.slice(-PREVIEW_ROOTS));
	const hiddenCount = $derived(roots.length - visibleRoots.length);
	const repliesOf = (id: string) => comments.filter((c) => c.parent_id === id);
	const nick = (p: ProfileLite | null) => p?.nickname || p?.first_name || 'ผู้ใช้';

	$effect(() => {
		if (focusSignal) mainInput?.focus();
	});

	async function insert(text: string, parentId: string | null, replyTo: string | null) {
		const { data, error } = await supabase
			.from('feed_comments')
			.insert({ post_id: postId, user_id: me.id, body: text, parent_id: parentId, reply_to_user_id: replyTo })
			.select(COMMENT_SELECT)
			.single();
		if (error) throw error;
		const row = { ...(data as unknown as Omit<FeedComment, 'liked'>), liked: false };
		if (!comments.some((c) => c.id === row.id)) comments.push(row);
		return row;
	}

	async function send() {
		const text = body.trim();
		if (!text || sending) return;
		sending = true;
		try {
			await insert(text, null, null);
			body = '';
			showAll = true;
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			sending = false;
		}
	}

	async function startReply(root: FeedComment, to: FeedComment) {
		replyTarget = { rootId: root.id, to };
		expanded[root.id] = true;
		replyBody = '';
		await tick();
		replyInput?.focus();
	}

	async function sendReply() {
		const text = replyBody.trim();
		if (!text || !replyTarget || sending) return;
		sending = true;
		try {
			// Replying to a reply mentions that person; the database keeps it in the same thread
			const mention = replyTarget.to.parent_id ? replyTarget.to.user_id : null;
			await insert(text, replyTarget.to.id, mention);
			replyBody = '';
			replyTarget = null;
		} catch (err) {
			toast.error(errorMessage(err));
		} finally {
			sending = false;
		}
	}

	async function toggleLike(c: FeedComment) {
		const liked = !c.liked;
		c.liked = liked;
		c.like_count += liked ? 1 : -1;
		const { error } = liked
			? await supabase.from('feed_comment_likes').insert({ comment_id: c.id, user_id: me.id })
			: await supabase.from('feed_comment_likes').delete().eq('comment_id', c.id).eq('user_id', me.id);
		if (error && error.code !== '23505') {
			c.liked = !liked;
			c.like_count += liked ? -1 : 1;
			toast.error(errorMessage(error));
		}
	}

	async function remove(c: FeedComment) {
		const replies = c.parent_id ? 0 : repliesOf(c.id).length;
		if (!confirm(replies ? `ลบความคิดเห็นนี้และการตอบกลับอีก ${replies} รายการ?` : 'ลบความคิดเห็นนี้?')) return;
		const { error } = await supabase.from('feed_comments').delete().eq('id', c.id);
		if (error) return toast.error(errorMessage(error));
		comments = comments.filter((x) => x.id !== c.id && x.parent_id !== c.id);
	}

	function onEnter(e: KeyboardEvent, submit: () => void) {
		if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
			e.preventDefault();
			submit();
		}
	}
</script>

{#snippet bubble(c: FeedComment, root: FeedComment, small: boolean)}
	{@const staffAuthor = c.author?.role === 'tutor' || c.author?.role === 'admin'}
	<div class="flex gap-2">
		<Avatar profile={c.author} size={small ? 28 : 34} />
		<div class="min-w-0 flex-1">
			<div class="inline-block max-w-full rounded-2xl bg-neutral-100 px-3.5 py-2">
				<div class="flex items-center gap-1.5 text-sm">
					<span class="font-normal">{nick(c.author)}</span>
					{#if staffAuthor}<span class="badge bg-brand-600 px-1.5 py-0 text-[11px] text-white">ติวเตอร์</span>{/if}
				</div>
				<p class="font-read text-[15px] leading-snug break-words whitespace-pre-wrap text-neutral-800">
					{#if c.reply_to}<span class="font-sans font-normal text-brand-700">@{nick(c.reply_to)}</span>{' '}{/if}{c.body}
				</p>
			</div>
			<div class="mt-0.5 flex items-center gap-3 px-2 text-xs text-muted">
				<span title={new Date(c.created_at).toLocaleString('th-TH')}>{timeAgo(c.created_at)}</span>
				<button class="font-normal hover:underline {c.liked ? 'text-brand-600' : ''}" onclick={() => toggleLike(c)}>
					{c.liked ? 'ถูกใจแล้ว' : 'ถูกใจ'}
				</button>
				<button class="font-normal hover:underline" onclick={() => startReply(root, c)}>ตอบกลับ</button>
				{#if c.user_id === me.id || isStaff}
					<button class="hover:text-brand-600" aria-label="ลบความคิดเห็น" onclick={() => remove(c)}><Trash2 size={12} /></button>
				{/if}
				{#if c.like_count > 0}
					<span class="flex items-center gap-1 rounded-full bg-white px-1.5 py-0.5 shadow-sm ring-1 ring-line">
						<Heart size={11} class="fill-brand-600 text-brand-600" /> {c.like_count}
					</span>
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<div class="space-y-3 border-t border-line px-4 pt-3 pb-4 md:px-5">
	{#if hiddenCount > 0}
		<button class="text-sm font-normal text-muted hover:underline" onclick={() => (showAll = true)}>
			ดูความคิดเห็นก่อนหน้า ({hiddenCount})
		</button>
	{/if}

	{#each visibleRoots as root (root.id)}
		{@const replies = repliesOf(root.id)}
		<div>
			{@render bubble(root, root, false)}
			{#if replies.length}
				<div class="mt-2 ml-[42px] space-y-2">
					{#if expanded[root.id] || replies.length === 1}
						{#each replies as r (r.id)}
							{@render bubble(r, root, true)}
						{/each}
					{:else}
						<button class="flex items-center gap-1.5 text-sm font-normal text-muted hover:underline" onclick={() => (expanded[root.id] = true)}>
							<CornerDownRight size={14} /> ดูการตอบกลับทั้งหมด {replies.length} รายการ
						</button>
					{/if}
				</div>
			{/if}
			{#if replyTarget?.rootId === root.id}
				<div class="mt-2 ml-[42px] flex items-end gap-2">
					<Avatar profile={me} size={28} />
					<div class="flex flex-1 items-end rounded-2xl bg-neutral-100 pr-1.5">
						<textarea
							bind:this={replyInput}
							rows="1"
							class="max-h-32 flex-1 resize-none bg-transparent px-3.5 py-2 font-read text-[15px] outline-none placeholder:text-subtle"
							placeholder="ตอบกลับ {nick(replyTarget.to.author)}…"
							maxlength="4000"
							bind:value={replyBody}
							onkeydown={(e) => onEnter(e, sendReply)}
						></textarea>
						<button class="mb-1 rounded-full p-1.5 text-brand-600 disabled:text-subtle" disabled={!replyBody.trim() || sending} aria-label="ส่งคำตอบ" onclick={sendReply}>
							<SendHorizontal size={18} />
						</button>
					</div>
				</div>
			{/if}
		</div>
	{/each}

	<div class="flex items-end gap-2">
		<Avatar profile={me} size={34} />
		<div class="flex flex-1 items-end rounded-2xl bg-neutral-100 pr-1.5">
			<textarea
				bind:this={mainInput}
				rows="1"
				class="max-h-40 flex-1 resize-none bg-transparent px-3.5 py-2 font-read text-[15px] outline-none placeholder:text-subtle"
				placeholder="แสดงความคิดเห็น…"
				maxlength="4000"
				bind:value={body}
				onkeydown={(e) => onEnter(e, send)}
			></textarea>
			<button class="mb-1 rounded-full p-1.5 text-brand-600 disabled:text-subtle" disabled={!body.trim() || sending} aria-label="ส่งความคิดเห็น" onclick={send}>
				{#if sending}<LoaderCircle size={18} class="animate-spin" />{:else}<SendHorizontal size={18} />{/if}
			</button>
		</div>
	</div>
</div>
