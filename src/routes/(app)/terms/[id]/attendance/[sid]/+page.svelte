<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { ChevronLeft, Maximize, MapPin, Minimize, Power, RotateCcw, UserCheck, UserPlus, Users } from '@lucide/svelte';
	import QRCode from 'qrcode';
	import Avatar from '#lib/components/Avatar.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import ProgressRing from '#lib/components/ProgressRing.svelte';
	import type { Tables } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { displayName, errorMessage, formatTime } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	let records = $state<Tables<'attendance_records'>[]>(data.records);
	$effect(() => {
		records = data.records;
	});

	let qrSvg = $state('');
	let token = $state('');
	let expiresAt = $state(0);
	let now = $state(Date.now());
	let tab = $state<'present' | 'absent'>('present');
	let root = $state<HTMLElement>();
	let isFullscreen = $state(false);

	const s = $derived(data.session);
	const present = $derived(new Map(records.map((r) => [r.student_id, r])));
	const byId = $derived(new Map(data.students.map((p) => [p.id, p])));
	const presentList = $derived(
		[...records].sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at)).map((r) => ({ r, p: byId.get(r.student_id) }))
	);
	const absentList = $derived(data.students.filter((p) => !present.has(p.id)));
	const remaining = $derived(Math.max(0, Math.ceil((expiresAt - now) / 1000)));

	async function refreshToken() {
		if (!s.is_open) return;
		const { data: rows, error } = await data.supabase.rpc('get_checkin_token', { p_session_id: s.id });
		if (error || !rows?.[0]) return;
		const t = rows[0];
		expiresAt = new Date(t.expires_at).getTime();
		if (t.token === token) return;
		token = t.token;
		const url = `${page.url.origin}/checkin?s=${s.id}&t=${t.token}`;
		qrSvg = await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#1c1c1e', light: '#ffffff' } });
	}

	// Rotate the QR: poll often enough that the screen is never more than ~3s stale
	$effect(() => {
		if (!s.is_open) return;
		void refreshToken();
		const poll = setInterval(refreshToken, 3000);
		const clock = setInterval(() => (now = Date.now()), 250);
		return () => {
			clearInterval(poll);
			clearInterval(clock);
		};
	});

	// Live check-ins
	$effect(() => {
		const ch = data.supabase
			.channel(`session-${s.id}`)
			.on(
				'postgres_changes',
				{ event: '*', schema: 'public', table: 'attendance_records', filter: `session_id=eq.${s.id}` },
				(p) => {
					if (p.eventType === 'INSERT') {
						const row = p.new as Tables<'attendance_records'>;
						if (!records.some((r) => r.student_id === row.student_id)) records = [...records, row];
					} else if (p.eventType === 'DELETE') {
						const old = p.old as Partial<Tables<'attendance_records'>>;
						records = records.filter((r) => r.student_id !== old.student_id);
					}
				}
			)
			.subscribe();
		return () => void data.supabase.removeChannel(ch);
	});

	async function setOpen(open: boolean) {
		const { error } = await data.supabase.from('attendance_sessions').update({ is_open: open }).eq('id', s.id);
		if (error) return toast.error(errorMessage(error));
		toast(open ? 'Check-in reopened' : 'Check-in closed');
		token = '';
		await invalidate('app:session');
	}

	async function markPresent(studentId: string) {
		const { data: row, error } = await data.supabase
			.from('attendance_records')
			.insert({ session_id: s.id, student_id: studentId, method: 'manual', marked_by: data.user!.id })
			.select()
			.single();
		if (error) return toast.error(errorMessage(error));
		if (!records.some((r) => r.student_id === studentId)) records = [...records, row];
	}

	async function unmark(studentId: string) {
		if (!confirm('Remove this check-in?')) return;
		const { error } = await data.supabase.from('attendance_records').delete().eq('session_id', s.id).eq('student_id', studentId);
		if (error) return toast.error(errorMessage(error));
		records = records.filter((r) => r.student_id !== studentId);
	}

	async function toggleFullscreen() {
		if (document.fullscreenElement) await document.exitFullscreen();
		else await root?.requestFullscreen();
	}
</script>

<svelte:head><title>Check-in · {s.title}</title></svelte:head>
<svelte:document onfullscreenchange={() => (isFullscreen = !!document.fullscreenElement)} />

<div bind:this={root} class="flex min-h-[calc(100dvh-1.5rem)] flex-col bg-white md:rounded-[28px] lg:flex-row">
	<!-- QR side -->
	<section class="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-brand-600 p-6 text-white md:p-10 lg:rounded-l-[28px]">
		<div class="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-brand-700"></div>
		<div class="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-sun-400"></div>

		<div class="relative flex w-full items-center justify-between">
			<a href="/terms/{data.term.id}/attendance" class="flex items-center gap-1 text-white/80 hover:text-white"><ChevronLeft size={18} /> Back</a>
			<button class="rounded-full p-2 hover:bg-white/10" onclick={toggleFullscreen} aria-label="Toggle full screen">
				{#if isFullscreen}<Minimize size={20} />{:else}<Maximize size={20} />{/if}
			</button>
		</div>

		<div class="relative mt-4 flex items-center gap-3">
			<Logo size={40} />
			<div>
				<div class="text-sun-300">{data.subject.title} · {data.term.name}</div>
				<h1 class="text-2xl font-medium text-white md:text-3xl">{s.title}</h1>
			</div>
		</div>

		{#if s.is_open}
			<div class="relative mt-8 rounded-[32px] bg-white p-4 shadow-2xl md:p-6">
				{#if qrSvg}
					<div class="aspect-square w-[min(70vw,52vh)] [&>svg]:h-full [&>svg]:w-full">{@html qrSvg}</div>
				{:else}
					<div class="flex aspect-square w-[min(70vw,52vh)] items-center justify-center text-muted">Generating…</div>
				{/if}
			</div>
			<div class="relative mt-6 flex items-center gap-4">
				<ProgressRing value={(remaining / s.rotate_seconds) * 100} size={46} label={String(remaining)} />
				<div>
					<div class="text-lg">Scan with your phone camera</div>
					<div class="text-sm text-white/75">Code changes every {s.rotate_seconds}s · screenshots won't work</div>
				</div>
			</div>
			{#if s.require_location}
				<div class="relative mt-4 flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm">
					<MapPin size={16} /> Must be within {s.radius_m} m of this room
				</div>
			{/if}
		{:else}
			<div class="relative mt-10 text-center">
				<div class="text-3xl font-medium text-white">Check-in closed</div>
				<p class="mt-2 text-white/80">{records.length} of {data.students.length} students checked in</p>
				<button class="btn btn-sun mt-6" onclick={() => setOpen(true)}><RotateCcw size={18} /> Reopen check-in</button>
			</div>
		{/if}
	</section>

	<!-- Live list -->
	<aside class="flex w-full flex-col lg:w-[400px]">
		<div class="border-b border-line p-6">
			<div class="flex items-end justify-between">
				<div>
					<div class="text-sm text-muted">Checked in</div>
					<div class="text-5xl font-medium">{records.length}<span class="text-2xl text-muted">/{data.students.length}</span></div>
				</div>
				{#if s.is_open}
					<button class="btn btn-dark" onclick={() => setOpen(false)}><Power size={16} /> Close</button>
				{/if}
			</div>
			<div class="mt-5 flex gap-1 rounded-full bg-neutral-100 p-1 text-sm">
				<button class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 {tab === 'present' ? 'bg-white shadow-sm' : 'text-muted'}" onclick={() => (tab = 'present')}>
					<UserCheck size={15} /> Present {records.length}
				</button>
				<button class="flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 {tab === 'absent' ? 'bg-white shadow-sm' : 'text-muted'}" onclick={() => (tab = 'absent')}>
					<Users size={15} /> Not yet {absentList.length}
				</button>
			</div>
		</div>

		<ul class="flex-1 space-y-1 overflow-y-auto p-3 lg:max-h-[calc(100dvh-14rem)]">
			{#if tab === 'present'}
				{#each presentList as { r, p } (r.student_id)}
					<li class="group flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-neutral-50">
						<Avatar profile={p} size={40} />
						<div class="min-w-0 flex-1">
							<div class="truncate">{displayName(p)}</div>
							<div class="text-xs text-muted">
								{formatTime(r.checked_in_at)} ·
								{#if r.method === 'manual'}marked by tutor{:else if r.distance_m != null}{Math.round(r.distance_m)} m away{:else}QR{/if}
							</div>
						</div>
						<button class="text-xs text-muted opacity-0 group-hover:opacity-100 hover:text-brand-600" onclick={() => unmark(r.student_id)}>Remove</button>
					</li>
				{:else}
					<li class="px-3 py-10 text-center text-muted">Waiting for the first scan…</li>
				{/each}
			{:else}
				{#each absentList as p (p.id)}
					<li class="flex items-center gap-3 rounded-2xl px-3 py-2.5 hover:bg-neutral-50">
						<Avatar profile={p} size={40} />
						<div class="min-w-0 flex-1 truncate">{displayName(p)}</div>
						<button class="btn btn-soft btn-sm" onclick={() => markPresent(p.id)}><UserPlus size={14} /> Mark</button>
					</li>
				{:else}
					<li class="px-3 py-10 text-center text-muted">Everyone is here 🎉</li>
				{/each}
			{/if}
		</ul>
	</aside>
</div>
