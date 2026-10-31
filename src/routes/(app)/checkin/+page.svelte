<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { CircleCheck, CircleX, LoaderCircle, MapPin, MapPinOff, QrCode, ScanLine, TimerReset } from '@lucide/svelte';
	import QrScanner from '#lib/components/QrScanner.svelte';
	import { errorMessage, formatTime } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type State =
		| { kind: 'idle' }
		| { kind: 'scanning' }
		| { kind: 'working'; text: string }
		| { kind: 'result'; status: string; message: string; title?: string; at?: string | null };

	let state = $state<State>({ kind: 'idle' });

	function getPosition(): Promise<GeolocationPosition> {
		return new Promise((resolve, reject) =>
			navigator.geolocation
				? navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 })
				: reject(new Error('unsupported'))
		);
	}

	async function checkIn(sessionId: string, token: string) {
		state = { kind: 'working', text: 'Checking you in…' };

		const { data: session } = await data.supabase
			.from('attendance_sessions')
			.select('id, title, require_location, is_open, term:terms(name, subject:subjects(title))')
			.eq('id', sessionId)
			.maybeSingle();
		const title = session ? `${session.term?.subject?.title ?? ''} · ${session.title}` : undefined;

		let coords: GeolocationCoordinates | null = null;
		if (session?.require_location) {
			state = { kind: 'working', text: 'Getting your location…' };
			try {
				coords = (await getPosition()).coords;
			} catch (e) {
				const denied = (e as GeolocationPositionError)?.code === 1;
				state = {
					kind: 'result',
					status: 'location_required',
					title,
					message: denied
						? 'Location permission is blocked. Allow location for this site in your browser settings, then scan again.'
						: 'Could not get your location. Turn on GPS/location services and scan again.'
				};
				return;
			}
			state = { kind: 'working', text: 'Checking you in…' };
		}

		const { data: rows, error } = await data.supabase.rpc('check_in', {
			p_session_id: sessionId,
			p_token: token,
			p_latitude: coords?.latitude,
			p_longitude: coords?.longitude,
			p_accuracy: coords?.accuracy
		});
		if (error || !rows?.[0]) {
			state = { kind: 'result', status: 'error', title, message: errorMessage(error) };
			return;
		}
		const r = rows[0];
		state = { kind: 'result', status: r.status, message: r.message, title, at: r.checked_in_at };
		if (r.status === 'ok') navigator.vibrate?.([60, 40, 60]);
	}

	function handleScan(text: string) {
		try {
			const url = new URL(text, page.url.origin);
			const s = url.searchParams.get('s');
			const t = url.searchParams.get('t');
			if (url.pathname !== '/checkin' || !s || !t) throw new Error();
			void checkIn(s, t);
		} catch {
			state = { kind: 'result', status: 'error', message: "That QR code isn't a Tutor More check-in code." };
		}
	}

	// Arrived from the phone camera: /checkin?s=…&t=…
	$effect(() => {
		const s = page.url.searchParams.get('s');
		const t = page.url.searchParams.get('t');
		if (s && t) {
			void checkIn(s, t);
			// drop the one-time token from the URL so refresh/back doesn't resubmit it
			void goto('/checkin', { replace: true, shallow: true });
		}
	});

	const good = $derived(state.kind === 'result' && (state.status === 'ok' || state.status === 'already'));
</script>

<svelte:head><title>Check in · Tutor More Academy</title></svelte:head>

<div class="mx-auto flex max-w-lg flex-col items-center px-5 py-10 text-center md:py-16">
	{#if state.kind === 'idle'}
		<div class="flex h-20 w-20 items-center justify-center rounded-3xl bg-sun-400"><QrCode size={40} class="text-brand-600" /></div>
		<h1 class="mt-6 text-3xl">Check in to class</h1>
		<p class="mt-2 text-muted">Scan the QR code your tutor shows on the screen. You can also use your phone's camera app.</p>
		<button class="btn btn-primary mt-8 px-8 py-3 text-base" onclick={() => (state = { kind: 'scanning' })}>
			<ScanLine size={20} /> Open scanner
		</button>
	{:else if state.kind === 'scanning'}
		<h1 class="mb-6 text-2xl">Scan the QR code</h1>
		<QrScanner onscan={handleScan} />
		<button class="btn btn-ghost mt-6" onclick={() => (state = { kind: 'idle' })}>Cancel</button>
	{:else if state.kind === 'working'}
		<LoaderCircle size={56} class="animate-spin text-brand-600" />
		<p class="mt-6 text-xl">{state.text}</p>
	{:else}
		<div class="flex h-24 w-24 items-center justify-center rounded-full {good ? 'bg-emerald-50 text-emerald-600' : 'bg-brand-50 text-brand-600'}">
			{#if good}<CircleCheck size={56} />
			{:else if state.status === 'expired'}<TimerReset size={52} />
			{:else if state.status === 'too_far'}<MapPinOff size={52} />
			{:else if state.status === 'location_required'}<MapPin size={52} />
			{:else}<CircleX size={56} />{/if}
		</div>
		<h1 class="mt-6 text-3xl">
			{#if state.status === 'ok'}You're checked in!
			{:else if state.status === 'already'}Already checked in
			{:else if state.status === 'expired'}QR code expired
			{:else if state.status === 'too_far'}Too far from class
			{:else if state.status === 'location_required'}Location needed
			{:else}Couldn't check in{/if}
		</h1>
		{#if state.title}<p class="mt-2 text-lg">{state.title}</p>{/if}
		<p class="mt-2 text-muted">
			{state.message}{#if good && state.at} · {formatTime(state.at)}{/if}
		</p>
		<div class="mt-8 flex gap-3">
			{#if !good}
				<button class="btn btn-primary" onclick={() => (state = { kind: 'scanning' })}><ScanLine size={18} /> Scan again</button>
			{/if}
			<a href="/home" class="btn btn-soft">Go home</a>
		</div>
	{/if}
</div>
