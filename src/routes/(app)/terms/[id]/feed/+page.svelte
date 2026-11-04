<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { ArrowUp, LoaderCircle, Newspaper } from '@lucide/svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import FeedComposer from '#lib/components/feed/FeedComposer.svelte';
	import FeedPost from '#lib/components/feed/FeedPost.svelte';
	import { FEED_PAGE_SIZE, loadComment, loadFeedPage, type FeedPost as Post } from '#lib/feed.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, type ProfileLite } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let posts = $state<Post[]>(data.posts);
	// svelte-ignore state_referenced_locally
	let hasMore = $state(data.hasMore);
	let loadingMore = $state(false);
	let newPosts = $state(0);

	// Re-sync when the loader re-runs (after posting / refresh)
	$effect(() => {
		posts = data.posts;
		hasMore = data.hasMore;
		newPosts = 0;
	});

	const me = $derived(data.profile as ProfileLite);

	async function loadMore() {
		loadingMore = true;
		try {
			const page = await loadFeedPage(data.supabase, data.term.id, data.user!.id, posts.length);
			const seen = new Set(posts.map((p) => p.id));
			posts.push(...page.posts.filter((p) => !seen.has(p.id)));
			hasMore = page.hasMore;
		} catch (e) {
			toast.error(errorMessage(e));
		} finally {
			loadingMore = false;
		}
	}

	async function refresh() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
		await invalidate('app:feed');
	}

	// Realtime: new posts → banner; comments from others → appear in place
	$effect(() => {
		const termId = data.term.id;
		const myId = data.user!.id;
		const ch = data.supabase
			.channel(`feed-${termId}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts', filter: `term_id=eq.${termId}` }, (p) => {
				const row = p.new as { author_id: string | null };
				if (row.author_id !== myId) newPosts++;
			})
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_comments' }, async (p) => {
				const row = p.new as { id: string; post_id: string; user_id: string };
				const post = posts.find((x) => x.id === row.post_id);
				if (!post || row.user_id === myId || post.comments.some((c) => c.id === row.id)) return;
				const c = await loadComment(data.supabase, row.id);
				if (c && !post.comments.some((x) => x.id === c.id)) {
					post.comments.push(c);
					post.comment_count++;
				}
			})
			.subscribe();
		return () => void data.supabase.removeChannel(ch);
	});
</script>

<svelte:head><title>กระดานข่าว · {data.subject.title}</title></svelte:head>

<div class="mx-auto max-w-[680px] space-y-5">
	{#if newPosts > 0}
		<div class="sticky top-16 z-20 flex justify-center md:top-4">
			<button class="btn btn-dark btn-sm shadow-lg" onclick={refresh}><ArrowUp size={16} /> โพสต์ใหม่ {newPosts} รายการ</button>
		</div>
	{/if}

	{#if data.isStaff}
		<FeedComposer supabase={data.supabase} termId={data.term.id} {me} onposted={() => invalidate('app:feed')} />
	{/if}

	{#each posts as post, i (post.id)}
		<FeedPost
			supabase={data.supabase}
			bind:post={posts[i]}
			{me}
			isStaff={data.isStaff}
			ondeleted={(id) => (posts = posts.filter((p) => p.id !== id))}
		/>
	{:else}
		<EmptyState
			title="ยังไม่มีโพสต์"
			text={data.isStaff ? 'โพสต์ข่าว รูปจากกระดาน หรือคลิปสั้น ๆ ให้นักเรียนในคลาสได้เลย' : 'เมื่อติวเตอร์โพสต์ จะแสดงที่นี่ กดถูกใจและแสดงความคิดเห็นได้'}
		>
			{#snippet icon()}<Newspaper size={26} />{/snippet}
		</EmptyState>
	{/each}

	{#if hasMore}
		<div class="flex justify-center">
			<button class="btn btn-soft" disabled={loadingMore} onclick={loadMore}>
				{#if loadingMore}<LoaderCircle size={16} class="animate-spin" />{/if} โหลดโพสต์เพิ่ม
			</button>
		</div>
	{:else if posts.length >= FEED_PAGE_SIZE}
		<p class="text-center text-sm text-muted">ดูครบทุกโพสต์แล้ว</p>
	{/if}
</div>
