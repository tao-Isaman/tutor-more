<script lang="ts">
	import { ChevronLeft, ChevronRight, CircleCheck, Download, ExternalLink, Eye, Pencil } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import QaThread from '#lib/components/QaThread.svelte';
	import VideoPlayer from '#lib/components/VideoPlayer.svelte';
	import { displayName, formatBytes, formatDuration, percent, timeAgo } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const c = $derived(data.content);

	let watched = $state<{ watched_seconds: number; duration_seconds: number; completed: boolean } | null>(null);
	const myWatched = $derived(
		watched ??
			(data.myProgress
				? {
						watched_seconds: data.myProgress.watched_seconds,
						duration_seconds: data.myProgress.duration_seconds,
						completed: !!data.myProgress.completed_at
					}
				: null)
	);

	// Count a view once per page open (not during SSR)
	$effect(() => {
		const id = c.id;
		watched = null;
		void data.supabase.rpc('record_content_view', { p_content_id: id });
	});

	let viewerFilter = $state<'all' | 'seen' | 'unseen'>('all');
	const viewers = $derived(
		(data.viewers ?? []).filter((v) =>
			viewerFilter === 'all' ? true : viewerFilter === 'seen' ? !!v.view : !v.view
		)
	);
	const seenCount = $derived((data.viewers ?? []).filter((v) => v.view).length);
</script>

<svelte:head><title>{c.title} · {data.subject.title}</title></svelte:head>

<div class="grid gap-8 {data.isStaff ? 'lg:grid-cols-[1fr_340px]' : 'lg:grid-cols-[1fr_300px]'}">
	<article class="min-w-0">
		{#if c.section}<div class="text-sm text-brand-600">{c.section}</div>{/if}
		<h2 class="text-2xl md:text-3xl">{c.title}</h2>
		{#if !c.is_published}
			<p class="mt-2 inline-block rounded-full bg-neutral-100 px-3 py-1 text-sm text-muted">Hidden from students</p>
		{/if}

		<div class="mt-5">
			{#if c.type === 'video' && data.mediaUrl && data.user}
				{#key c.id}
					<VideoPlayer
						src={data.mediaUrl}
						contentId={c.id}
						supabase={data.supabase}
						startAt={data.myProgress?.last_position ?? 0}
						onprogress={(p) => (watched = p)}
					/>
				{/key}
				{#if myWatched && !data.isStaff}
					<div class="mt-3 flex items-center gap-3 text-sm text-muted">
						{#if myWatched.completed}
							<span class="flex items-center gap-1.5 text-emerald-700"><CircleCheck size={16} /> Completed</span>
						{:else}
							<div class="h-1.5 w-40 overflow-hidden rounded-full bg-neutral-100">
								<div class="h-full bg-brand-600" style="width:{percent(myWatched.watched_seconds, myWatched.duration_seconds)}%"></div>
							</div>
							Watched {percent(myWatched.watched_seconds, myWatched.duration_seconds)}%
						{/if}
					</div>
				{/if}
			{:else if c.type === 'image' && data.mediaUrl}
				<img src={data.mediaUrl} alt={c.title} class="w-full rounded-2xl border border-line" />
			{:else if c.type === 'file' && data.mediaUrl}
				<a href={data.mediaUrl} target="_blank" rel="noopener" class="card flex items-center gap-4 p-5 hover:shadow-md">
					<span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Download size={22} /></span>
					<div class="min-w-0 flex-1">
						<div class="truncate">{c.file_name}</div>
						<div class="text-sm text-muted">{formatBytes(c.size_bytes)}</div>
					</div>
					<span class="btn btn-soft btn-sm">Open</span>
				</a>
			{:else if c.type === 'link' && c.external_url}
				<a href={c.external_url} target="_blank" rel="noopener noreferrer" class="card flex items-center gap-4 p-5 hover:shadow-md">
					<span class="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><ExternalLink size={22} /></span>
					<span class="min-w-0 flex-1 truncate text-brand-700">{c.external_url}</span>
				</a>
			{/if}
		</div>

		{#if c.body}
			<Markdown source={c.body} class="mt-6" />
		{/if}

		<nav class="mt-10 flex justify-between gap-3 border-t border-line pt-6">
			{#if data.prev}
				<a href="/terms/{data.term.id}/content/{data.prev.id}" class="btn btn-outline max-w-[48%]">
					<ChevronLeft size={18} /> <span class="truncate">{data.prev.title}</span>
				</a>
			{:else}<span></span>{/if}
			{#if data.next}
				<a href="/terms/{data.term.id}/content/{data.next.id}" class="btn btn-primary max-w-[48%]">
					<span class="truncate">{data.next.title}</span> <ChevronRight size={18} />
				</a>
			{/if}
		</nav>

		<div class="mt-10">
			{#key c.id}
				<QaThread supabase={data.supabase} contentId={c.id} userId={data.user!.id} isStaff={data.isStaff} initial={data.comments} />
			{/key}
		</div>
	</article>

	<aside>
		{#if data.viewers}
			<div class="card sticky top-4 p-5">
				<h3 class="flex items-center gap-2 text-lg"><Eye size={18} class="text-brand-600" /> Who has seen this</h3>
				<p class="mt-1 text-sm text-muted">{seenCount} of {data.viewers.length} students opened it</p>
				<div class="mt-4 flex gap-1 rounded-full bg-neutral-100 p-1 text-sm">
					{#each [['all', 'All'], ['seen', 'Seen'], ['unseen', 'Not yet']] as [k, label] (k)}
						<button
							class="flex-1 rounded-full py-1.5 transition {viewerFilter === k ? 'bg-white shadow-sm' : 'text-muted'}"
							onclick={() => (viewerFilter = k as typeof viewerFilter)}>{label}</button
						>
					{/each}
				</div>
				<ul class="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
					{#each viewers as v (v.student.id)}
						<li class="flex items-center gap-3">
							<Avatar profile={v.student} size={36} />
							<div class="min-w-0 flex-1">
								<div class="truncate text-sm">{displayName(v.student)}</div>
								{#if c.type === 'video' && v.progress}
									<div class="mt-1 flex items-center gap-2">
										<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100">
											<div
												class="h-full {v.progress.completed_at ? 'bg-emerald-500' : 'bg-brand-600'}"
												style="width:{percent(v.progress.watched_seconds, v.progress.duration_seconds || c.duration_seconds || 0)}%"
											></div>
										</div>
										<span class="text-xs text-muted">{formatDuration(v.progress.watched_seconds)}</span>
									</div>
								{:else if v.view}
									<div class="text-xs text-muted">Opened {timeAgo(v.view.last_viewed_at)} · {v.view.view_count}×</div>
								{:else}
									<div class="text-xs text-brand-600">Not opened yet</div>
								{/if}
							</div>
						</li>
					{:else}
						<li class="text-sm text-muted">No students here.</li>
					{/each}
				</ul>
			</div>
		{:else}
			<div class="card p-5 text-sm text-muted">
				Stuck? Ask under the lesson, or <a href="/messages" class="text-brand-600 hover:underline">message your tutor</a> privately.
			</div>
		{/if}
		{#if data.isStaff}
			<a href="/terms/{data.term.id}" class="btn btn-soft mt-3 w-full"><Pencil size={16} /> Edit in lesson list</a>
		{/if}
	</aside>
</div>
