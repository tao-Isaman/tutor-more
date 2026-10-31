<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { Check, CheckCheck, ChevronLeft, MessageCircle, Plus, Send } from '@lucide/svelte';
	import { tick } from 'svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import type { Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { displayName, errorMessage, formatTime, fullName, timeAgo } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const me = $derived(data.user!.id);
	const activeId = $derived(page.url.searchParams.get('c'));
	const active = $derived(data.conversations.find((c) => c.id === activeId) ?? null);

	let messages = $state<Tables<'messages'>[]>([]);
	let body = $state('');
	let sending = $state(false);
	let loading = $state(false);
	let scroller = $state<HTMLElement>();
	let newOpen = $state(false);

	async function scrollDown() {
		await tick();
		scroller?.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
	}

	// Load + subscribe to the open conversation
	$effect(() => {
		const id = activeId;
		if (!id) return;
		let cancelled = false;
		loading = true;
		messages = [];

		data.supabase
			.from('messages')
			.select('*')
			.eq('conversation_id', id)
			.order('created_at')
			.limit(500)
			.then(({ data: rows }) => {
				if (cancelled) return;
				messages = rows ?? [];
				loading = false;
				void scrollDown();
				void markRead(id);
			});

		const ch = data.supabase
			.channel(`chat-${id}`)
			.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
				const m = p.new as Tables<'messages'>;
				if (!messages.some((x) => x.id === m.id)) messages = [...messages, m];
				if (m.sender_id !== me) void markRead(id);
				void scrollDown();
			})
			.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (p) => {
				const m = p.new as Tables<'messages'>;
				messages = messages.map((x) => (x.id === m.id ? m : x));
			})
			.subscribe();

		return () => {
			cancelled = true;
			void data.supabase.removeChannel(ch);
		};
	});

	// Keep the conversation list fresh (new chats / previews)
	$effect(() => {
		const ch = data.supabase
			.channel('conversations-list')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => invalidate('app:conversations'))
			.subscribe();
		return () => void data.supabase.removeChannel(ch);
	});

	async function markRead(id: string) {
		await data.supabase.rpc('mark_conversation_read', { p_conversation_id: id });
		const c = data.conversations.find((x) => x.id === id);
		if (c?.unread) void invalidate('app:conversations');
	}

	async function send(e: SubmitEvent) {
		e.preventDefault();
		const text = body.trim();
		if (!text || !activeId) return;
		sending = true;
		const { data: m, error } = await data.supabase
			.from('messages')
			.insert({ conversation_id: activeId, sender_id: me, body: text })
			.select()
			.single();
		sending = false;
		if (error) return toast.error(errorMessage(error));
		body = '';
		if (!messages.some((x) => x.id === m.id)) messages = [...messages, m];
		void scrollDown();
	}

	async function startWith(otherId: string) {
		const { data: id, error } = await data.supabase.rpc('start_conversation', { p_other_id: otherId });
		if (error) return toast.error(errorMessage(error));
		newOpen = false;
		await invalidate('app:conversations');
		await goto(`/messages?c=${id}`);
	}

	const dayKey = (d: string) => new Date(d).toDateString();
	const roleLabels: Record<string, string> = { admin: 'แอดมิน', tutor: 'ติวเตอร์', student: 'นักเรียน' };
</script>

<svelte:head><title>แชท · Tutor More Academy</title></svelte:head>

<div class="flex h-[calc(100dvh-8.5rem)] md:h-[calc(100dvh-1.5rem)]">
	<!-- Conversation list -->
	<aside class="flex w-full flex-col border-line md:w-[340px] md:border-r {active ? 'hidden md:flex' : 'flex'}">
		<div class="flex items-center justify-between px-5 pt-6 pb-4">
			<h1 class="page-title">แชท</h1>
			{#if data.tutors.length}
				<button class="btn btn-soft btn-sm" onclick={() => (newOpen = true)}><Plus size={16} /> ใหม่</button>
			{/if}
		</div>
		<ul class="flex-1 overflow-y-auto px-2 pb-4">
			{#each data.conversations as c (c.id)}
				<li>
					<a
						href="/messages?c={c.id}"
						class="flex items-center gap-3 rounded-2xl px-3 py-3 transition {c.id === activeId ? 'bg-brand-50' : 'hover:bg-neutral-50'}"
					>
						<Avatar profile={c.other} size={46} />
						<div class="min-w-0 flex-1">
							<div class="flex items-center justify-between gap-2">
								<span class="truncate {c.unread ? 'font-normal' : ''}">{displayName(c.other)}</span>
								<span class="shrink-0 text-xs text-muted">{timeAgo(c.last_message_at)}</span>
							</div>
							<div class="flex items-center gap-2">
								<span class="flex-1 truncate text-sm {c.unread ? 'text-ink' : 'text-muted'}">{c.last_message_preview ?? 'ทักทายกันหน่อย 👋'}</span>
								{#if c.unread}<span class="min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-xs leading-5 text-white">{c.unread}</span>{/if}
							</div>
						</div>
					</a>
				</li>
			{:else}
				<li class="px-3 py-10 text-center text-sm text-muted">
					ยังไม่มีบทสนทนา
					{#if data.tutors.length}<button class="mt-2 block w-full text-brand-600" onclick={() => (newOpen = true)}>ทักติวเตอร์</button>{/if}
				</li>
			{/each}
		</ul>
	</aside>

	<!-- Thread -->
	<section class="min-w-0 flex-1 flex-col {active ? 'flex' : 'hidden md:flex'}">
		{#if active}
			<header class="flex items-center gap-3 border-b border-line px-4 py-3 md:px-6">
				<a href="/messages" class="btn-ghost -ml-2 rounded-full p-2 md:hidden" aria-label="ย้อนกลับ"><ChevronLeft size={20} /></a>
				<Avatar profile={active.other} size={40} />
				<div class="min-w-0">
					<div class="truncate">{fullName(active.other)}</div>
					<div class="text-xs text-muted">{active.other?.nickname} · {roleLabels[active.other?.role ?? ''] ?? active.other?.role}</div>
				</div>
			</header>

			<div bind:this={scroller} class="flex-1 space-y-1 overflow-y-auto bg-canvas/40 px-4 py-5 md:px-8">
				{#if loading}
					<p class="py-10 text-center text-muted">กำลังโหลด…</p>
				{/if}
				{#each messages as m, i (m.id)}
					{@const mine = m.sender_id === me}
					{#if i === 0 || dayKey(messages[i - 1].created_at) !== dayKey(m.created_at)}
						<div class="py-3 text-center text-xs text-muted">
							{new Date(m.created_at).toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}
						</div>
					{/if}
					<div class="flex {mine ? 'justify-end' : 'justify-start'}">
						<div
							class="max-w-[78%] rounded-3xl px-4 py-2.5 {mine
								? 'rounded-br-lg bg-brand-600 text-white'
								: 'rounded-bl-lg border border-line bg-white'}"
						>
							<p class="font-read whitespace-pre-wrap break-words">{m.body}</p>
							<div class="mt-0.5 flex items-center justify-end gap-1 text-[11px] {mine ? 'text-white/70' : 'text-muted'}">
								{formatTime(m.created_at)}
								{#if mine}
									{#if m.read_at}<CheckCheck size={13} />{:else}<Check size={13} />{/if}
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<form onsubmit={send} class="flex items-end gap-2 border-t border-line p-3 md:p-4">
				<textarea
					class="input max-h-40 min-h-[48px] flex-1 resize-none rounded-3xl"
					rows="1"
					maxlength="4000"
					placeholder="พิมพ์ข้อความ…"
					bind:value={body}
					onkeydown={(e) => {
						if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
							e.preventDefault();
							e.currentTarget.form?.requestSubmit();
						}
					}}
				></textarea>
				<button class="btn btn-primary h-12 w-12 p-0" disabled={sending || !body.trim()} aria-label="ส่ง"><Send size={18} /></button>
			</form>
		{:else}
			<div class="flex flex-1 items-center justify-center p-8">
				<EmptyState title="ข้อความของคุณ" text="แชทส่วนตัวกับติวเตอร์หรือนักเรียนได้ที่นี่ เลือกบทสนทนาเพื่อเริ่มคุยเลย">
					{#snippet icon()}<MessageCircle size={26} />{/snippet}
				</EmptyState>
			</div>
		{/if}
	</section>
</div>

<Modal bind:open={newOpen} title="ทักติวเตอร์">
	<ul class="space-y-2">
		{#each data.tutors as { tutor, subjects } (tutor.id)}
			<li>
				<button class="flex w-full items-center gap-3 rounded-2xl p-3 text-left hover:bg-neutral-50" onclick={() => startWith(tutor.id)}>
					<Avatar profile={tutor} size={44} />
					<div class="min-w-0">
						<div>พี่{tutor.nickname || tutor.first_name} <span class="text-muted">· {fullName(tutor)}</span></div>
						<div class="truncate text-sm text-muted">{subjects.join(', ')}</div>
					</div>
				</button>
			</li>
		{/each}
	</ul>
</Modal>
