<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { ChevronLeft, ChevronRight, Ellipsis, Heart, MessageCircle, Pencil, Pin, PinOff, Trash2, X } from '@lucide/svelte';
	import Avatar from '../Avatar.svelte';
	import FeedComments from './FeedComments.svelte';
	import type { Database } from '#lib/database.types.ts';
	import type { FeedPost } from '#lib/feed.ts';
	import { renderMarkdown } from '#lib/markdown.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, formatDateTime, fullName, timeAgo, type ProfileLite } from '#lib/utils.ts';

	let {
		supabase,
		post = $bindable(),
		me,
		isStaff,
		ondeleted
	}: {
		supabase: SupabaseClient<Database>;
		post: FeedPost;
		me: ProfileLite;
		isStaff: boolean;
		ondeleted: (id: string) => void;
	} = $props();

	let menuOpen = $state(false);
	let editing = $state(false);
	let draft = $state('');
	let focusSignal = $state(0);
	let viewer = $state<number | null>(null);
	let expandedText = $state(false);
	let lightbox = $state<HTMLDialogElement>();

	$effect(() => {
		if (!lightbox) return;
		if (viewer !== null && !lightbox.open) lightbox.showModal();
		if (viewer === null && lightbox.open) lightbox.close();
	});

	const images = $derived(post.media.filter((m) => m.kind === 'image'));
	const video = $derived(post.media.find((m) => m.kind === 'video'));
	const longText = $derived(post.body.length > 420 && !expandedText);
	const shown = $derived(images.slice(0, 4));
	const extra = $derived(images.length - shown.length);

	async function toggleLike() {
		const liked = !post.liked;
		post.liked = liked;
		post.like_count += liked ? 1 : -1;
		const { error } = liked
			? await supabase.from('feed_post_likes').insert({ post_id: post.id, user_id: me.id })
			: await supabase.from('feed_post_likes').delete().eq('post_id', post.id).eq('user_id', me.id);
		if (error && error.code !== '23505') {
			post.liked = !liked;
			post.like_count += liked ? -1 : 1;
			toast.error(errorMessage(error));
		}
	}

	async function togglePin() {
		menuOpen = false;
		const { error } = await supabase.from('feed_posts').update({ is_pinned: !post.is_pinned }).eq('id', post.id);
		if (error) return toast.error(errorMessage(error));
		post.is_pinned = !post.is_pinned;
		toast(post.is_pinned ? 'ปักหมุดโพสต์แล้ว' : 'เลิกปักหมุดแล้ว');
	}

	function startEdit() {
		menuOpen = false;
		draft = post.body;
		editing = true;
	}

	async function saveEdit() {
		const { error } = await supabase.from('feed_posts').update({ body: draft.trim() }).eq('id', post.id);
		if (error) return toast.error(errorMessage(error));
		post.body = draft.trim();
		post.edited_at = new Date().toISOString();
		editing = false;
	}

	async function remove() {
		menuOpen = false;
		if (!confirm('ลบโพสต์นี้พร้อมรูป/วิดีโอและความคิดเห็นทั้งหมด?')) return;
		const { error } = await supabase.from('feed_posts').delete().eq('id', post.id);
		if (error) return toast.error(errorMessage(error));
		const paths = post.media.map((m) => m.storage_path);
		if (paths.length) await supabase.storage.from('course-media').remove(paths);
		toast('ลบโพสต์แล้ว');
		ondeleted(post.id);
	}

	function step(d: number) {
		if (viewer === null) return;
		viewer = (viewer + d + images.length) % images.length;
	}

	function onKey(e: KeyboardEvent) {
		if (viewer === null) return;
		if (e.key === 'ArrowRight') step(1);
		if (e.key === 'ArrowLeft') step(-1);
	}

	// Grid layout by image count, like a Facebook post
	const gridClass = $derived(
		shown.length === 1
			? 'grid-cols-1'
			: shown.length === 2
				? 'grid-cols-2'
				: shown.length === 3
					? 'grid-cols-2 grid-rows-2'
					: 'grid-cols-2 grid-rows-2'
	);
</script>

<svelte:window onkeydown={onKey} />

<article class="card overflow-hidden {post.is_pinned ? 'ring-1 ring-sun-300' : ''}">
	<!-- Header -->
	<header class="flex items-start gap-3 px-4 pt-4 md:px-5">
		<Avatar profile={post.author} size={42} />
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5">
				<span class="font-normal">{post.author?.nickname ? `พี่${post.author.nickname}` : fullName(post.author)}</span>
				<span class="text-sm text-muted">· {fullName(post.author)}</span>
			</div>
			<div class="flex items-center gap-1.5 text-xs text-muted">
				{#if post.is_pinned}<span class="flex items-center gap-1 text-sun-600"><Pin size={11} /> ปักหมุด</span> ·{/if}
				<span title={formatDateTime(post.created_at)}>{timeAgo(post.created_at)}</span>
				{#if post.edited_at}<span>· แก้ไขแล้ว</span>{/if}
			</div>
		</div>
		{#if isStaff}
			<div class="relative">
				<button class="btn-ghost -mr-2 rounded-full p-2" aria-label="ตัวเลือกโพสต์" onclick={() => (menuOpen = !menuOpen)}>
					<Ellipsis size={20} />
				</button>
				{#if menuOpen}
					<button class="fixed inset-0 z-10 cursor-default" aria-label="ปิดเมนู" onclick={() => (menuOpen = false)}></button>
					<div class="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-2xl border border-line bg-white py-1 shadow-xl">
						<button class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-neutral-50" onclick={togglePin}>
							{#if post.is_pinned}<PinOff size={16} /> เลิกปักหมุด{:else}<Pin size={16} /> ปักหมุดไว้บนสุด{/if}
						</button>
						<button class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-neutral-50" onclick={startEdit}>
							<Pencil size={16} /> แก้ไขข้อความ
						</button>
						<button class="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-brand-700 hover:bg-brand-50" onclick={remove}>
							<Trash2 size={16} /> ลบโพสต์
						</button>
					</div>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Body -->
	{#if editing}
		<div class="px-4 pt-3 md:px-5">
			<textarea class="input min-h-28 font-read" maxlength="10000" bind:value={draft}></textarea>
			<div class="mt-2 flex justify-end gap-2">
				<button class="btn btn-soft btn-sm" onclick={() => (editing = false)}>ยกเลิก</button>
				<button class="btn btn-primary btn-sm" onclick={saveEdit}>บันทึก</button>
			</div>
		</div>
	{:else if post.body}
		<div class="px-4 pt-3 md:px-5">
			<!-- renderMarkdown escapes input before adding a fixed set of tags -->
			<div class="prose-read text-[16px] leading-relaxed [&_p]:my-1.5 {longText ? 'line-clamp-6' : ''}">
				{@html renderMarkdown(post.body)}
			</div>
			{#if longText}
				<button class="mt-1 text-sm font-normal text-muted hover:underline" onclick={() => (expandedText = true)}>ดูเพิ่มเติม</button>
			{/if}
		</div>
	{/if}

	<!-- Media -->
	{#if video?.url}
		<!-- svelte-ignore a11y_media_has_caption -->
		<video src={video.url} controls playsinline preload="metadata" class="mt-3 max-h-[70vh] w-full bg-black"></video>
	{:else if shown.length}
		<div class="mt-3 grid gap-0.5 {gridClass} {shown.length > 1 ? 'aspect-square sm:aspect-[4/3]' : ''}">
			{#each shown as m, i (m.id)}
				<button
					class="relative overflow-hidden bg-neutral-100 {shown.length === 3 && i === 0 ? 'row-span-2' : ''}"
					onclick={() => (viewer = i)}
					aria-label="ดูรูปที่ {i + 1}"
				>
					{#if m.url}
						<img
							src={m.url}
							alt=""
							loading="lazy"
							class="h-full w-full {shown.length === 1 ? 'max-h-[75vh] object-contain' : 'object-cover'}"
							width={m.width ?? undefined}
							height={m.height ?? undefined}
						/>
					{/if}
					{#if i === shown.length - 1 && extra > 0}
						<span class="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-medium text-white">+{extra}</span>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Counts -->
	{#if post.like_count || post.comment_count}
		<div class="flex items-center justify-between px-4 pt-3 text-sm text-muted md:px-5">
			<span class="flex items-center gap-1.5">
				{#if post.like_count}
					<span class="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600"><Heart size={11} class="fill-white text-white" /></span>
					{post.like_count}
				{/if}
			</span>
			{#if post.comment_count}<span>{post.comment_count} ความคิดเห็น</span>{/if}
		</div>
	{/if}

	<!-- Actions -->
	<div class="mx-4 mt-2 mb-1 grid grid-cols-2 border-t border-line pt-1 md:mx-5">
		<button
			class="flex items-center justify-center gap-2 rounded-xl py-2 text-[15px] transition hover:bg-neutral-100 {post.liked ? 'text-brand-600' : 'text-muted'}"
			onclick={toggleLike}
			aria-pressed={post.liked}
		>
			<Heart size={19} class={post.liked ? 'fill-brand-600' : ''} /> ถูกใจ
		</button>
		<button class="flex items-center justify-center gap-2 rounded-xl py-2 text-[15px] text-muted transition hover:bg-neutral-100" onclick={() => focusSignal++}>
			<MessageCircle size={19} /> แสดงความคิดเห็น
		</button>
	</div>

	<FeedComments {supabase} postId={post.id} {me} {isStaff} bind:comments={post.comments} {focusSignal} />
</article>

<!-- Lightbox: native <dialog> sits in the browser's top layer, above every stacking context -->
<dialog
	bind:this={lightbox}
	onclose={() => (viewer = null)}
	class="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-black/90"
	aria-label="ดูรูปภาพ"
>
	{#if viewer !== null && images[viewer]?.url}
		<div class="relative flex h-full w-full items-center justify-center">
			<button class="absolute inset-0 cursor-default" aria-label="ปิด" onclick={() => (viewer = null)}></button>
			<img src={images[viewer].url} alt="" class="relative max-h-[92vh] max-w-[94vw] object-contain" />
			<button class="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20" aria-label="ปิด" onclick={() => (viewer = null)}>
				<X size={22} />
			</button>
			{#if images.length > 1}
				<button class="absolute left-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="รูปก่อนหน้า" onclick={() => step(-1)}>
					<ChevronLeft size={24} />
				</button>
				<button class="absolute right-3 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="รูปถัดไป" onclick={() => step(1)}>
					<ChevronRight size={24} />
				</button>
				<span class="absolute bottom-5 rounded-full bg-white/10 px-3 py-1 text-sm text-white">{viewer + 1} / {images.length}</span>
			{/if}
		</div>
	{/if}
</dialog>
