<script lang="ts">
	import { goto } from '$app/navigation';
	import { CalendarCheck, Crosshair, LoaderCircle, MapPin, Play, QrCode, Radio } from '@lucide/svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import ProgressRing from '#lib/components/ProgressRing.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, formatDateTime, percent } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const presentCount = $derived(Object.keys(data.mine).length);
	const closedCount = $derived(data.sessions.length);

	let open = $state(false);
	let busy = $state(false);
	let locating = $state(false);
	let f = $state({
		title: `Class · ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date())}`,
		require_location: false,
		latitude: null as number | null,
		longitude: null as number | null,
		accuracy: null as number | null,
		radius_m: 100,
		rotate_seconds: 20
	});

	function locate() {
		if (!navigator.geolocation) return toast.error('This device has no location service');
		locating = true;
		navigator.geolocation.getCurrentPosition(
			(pos) => {
				locating = false;
				f.latitude = pos.coords.latitude;
				f.longitude = pos.coords.longitude;
				f.accuracy = Math.round(pos.coords.accuracy);
			},
			(err) => {
				locating = false;
				toast.error(err.code === err.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get your location');
			},
			{ enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
		);
	}

	$effect(() => {
		if (f.require_location && f.latitude === null && !locating) locate();
	});

	async function start(e: SubmitEvent) {
		e.preventDefault();
		if (f.require_location && (f.latitude === null || f.longitude === null)) return toast.error('Get the classroom location first');
		busy = true;
		const { data: row, error } = await data.supabase
			.from('attendance_sessions')
			.insert({
				term_id: data.term.id,
				title: f.title.trim(),
				require_location: f.require_location,
				latitude: f.require_location ? f.latitude : null,
				longitude: f.require_location ? f.longitude : null,
				radius_m: f.radius_m,
				rotate_seconds: f.rotate_seconds
			})
			.select('id')
			.single();
		busy = false;
		if (error) return toast.error(errorMessage(error));
		await goto(`/terms/${data.term.id}/attendance/${row.id}`);
	}
</script>

<svelte:head><title>Attendance · {data.subject.title}</title></svelte:head>

{#if data.isStaff}
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<p class="text-muted">{data.sessions.length} session{data.sessions.length === 1 ? '' : 's'} · {data.studentCount} students</p>
		<button class="btn btn-primary" onclick={() => (open = true)}><Play size={18} /> Start check-in</button>
	</div>
{:else}
	<div class="mb-8 grid gap-4 sm:grid-cols-3">
		<div class="card flex items-center gap-4 p-5">
			<ProgressRing value={percent(presentCount, closedCount)} size={56} stroke={6} track="#f1f1f1" color="#e11d2a" label="{percent(presentCount, closedCount)}%" />
			<div><div class="text-sm text-muted">Attendance</div><div class="text-xl">{presentCount}/{closedCount} classes</div></div>
		</div>
		<a href="/checkin" class="card flex items-center gap-4 bg-sun-400 p-5 hover:bg-sun-300 sm:col-span-2">
			<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white"><QrCode class="text-brand-600" /></span>
			<div><div class="text-lg">Scan to check in</div><div class="text-sm text-ink/70">Open the scanner when your tutor shows the QR code</div></div>
		</a>
	</div>
{/if}

{#if data.sessions.length === 0}
	<EmptyState title="No check-ins yet" text={data.isStaff ? 'Start a check-in at the beginning of class and show the QR on the projector.' : 'Sessions will appear here after your first class.'}>
		{#snippet icon()}<CalendarCheck size={26} />{/snippet}
	</EmptyState>
{:else}
	<ul class="divide-y divide-line overflow-hidden rounded-2xl border border-line">
		{#each data.sessions as s (s.id)}
			{@const me = data.mine[s.id]}
			<li>
				<svelte:element
					this={data.isStaff ? 'a' : 'div'}
					href={data.isStaff ? `/terms/${data.term.id}/attendance/${s.id}` : undefined}
					class="flex items-center gap-4 bg-white px-5 py-4 {data.isStaff ? 'transition hover:bg-neutral-50' : ''}"
				>
					<span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl {s.is_open ? 'bg-brand-600 text-white' : 'bg-neutral-100 text-muted'}">
						{#if s.is_open}<Radio size={20} />{:else}<CalendarCheck size={20} />{/if}
					</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<span class="truncate">{s.title}</span>
							{#if s.require_location}<MapPin size={14} class="text-muted" />{/if}
						</div>
						<div class="text-sm text-muted">{formatDateTime(s.started_at)}</div>
					</div>
					{#if data.isStaff}
						<div class="text-right">
							<div>{s.present}/{data.studentCount}</div>
							<StatusBadge status={s.is_open ? 'open' : 'closed'} />
						</div>
					{:else if me}
						<span class="badge bg-emerald-50 text-emerald-700">Present {me.method === 'manual' ? '(marked)' : ''}</span>
					{:else if s.is_open}
						<a href="/checkin" class="btn btn-primary btn-sm">Check in</a>
					{:else}
						<span class="badge bg-brand-50 text-brand-700">Absent</span>
					{/if}
				</svelte:element>
			</li>
		{/each}
	</ul>
{/if}

<Modal bind:open title="Start check-in">
	<form id="start" onsubmit={start} class="space-y-5">
		<div>
			<label class="label" for="s-title">Session name</label>
			<input id="s-title" class="input" required maxlength="120" bind:value={f.title} />
		</div>

		<div class="rounded-2xl border border-line p-4">
			<label class="flex items-center justify-between gap-3">
				<span>
					<span class="block">Require location</span>
					<span class="text-sm text-muted">Only students near you can check in</span>
				</span>
				<input type="checkbox" class="h-5 w-5 accent-brand-600" bind:checked={f.require_location} />
			</label>
			{#if f.require_location}
				<div class="mt-4 space-y-4 border-t border-line pt-4">
					<div class="flex items-center gap-3">
						<MapPin size={18} class="text-brand-600" />
						<span class="flex-1 text-sm">
							{#if locating}Getting your location…
							{:else if f.latitude !== null}Classroom set ({f.latitude.toFixed(5)}, {f.longitude?.toFixed(5)}) · ±{f.accuracy} m
							{:else}Location not set{/if}
						</span>
						<button type="button" class="btn btn-soft btn-sm" onclick={locate} disabled={locating}>
							{#if locating}<LoaderCircle size={14} class="animate-spin" />{:else}<Crosshair size={14} />{/if} Use my location
						</button>
					</div>
					<div>
						<label class="label flex justify-between" for="radius"><span>Allowed distance</span><span class="text-muted">{f.radius_m} m</span></label>
						<input id="radius" type="range" min="30" max="500" step="10" class="w-full accent-brand-600" bind:value={f.radius_m} />
					</div>
				</div>
			{/if}
		</div>

		<div>
			<label class="label flex justify-between" for="rot"><span>QR changes every</span><span class="text-muted">{f.rotate_seconds} s</span></label>
			<input id="rot" type="range" min="10" max="60" step="5" class="w-full accent-brand-600" bind:value={f.rotate_seconds} />
			<p class="hint">Shorter is harder to share by screenshot. Scans are accepted for one extra cycle.</p>
		</div>
	</form>
	{#snippet footer()}
		<button class="btn btn-soft" onclick={() => (open = false)}>Cancel</button>
		<button class="btn btn-primary" form="start" disabled={busy || locating}>
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} Start & show QR
		</button>
	{/snippet}
</Modal>
