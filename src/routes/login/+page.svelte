<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, safeNext } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let email = $state('');
	let password = $state('');
	let busy = $state(false);
	let error = $state('');

	const next = $derived(safeNext(page.url.searchParams.get('next')));

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const { error: err } = await data.supabase.auth.signInWithPassword({ email: email.trim(), password });
		busy = false;
		if (err) {
			error = err.message === 'Invalid login credentials' ? 'Wrong email or password' : errorMessage(err);
			return;
		}
		await invalidate('supabase:auth');
		await goto(next);
	}

	async function forgot() {
		if (!email.trim()) {
			error = 'Enter your email first, then click "Forgot password"';
			return;
		}
		const { error: err } = await data.supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${page.url.origin}/auth/callback?next=/settings%3Ftab%3Dsecurity`
		});
		if (err) toast.error(errorMessage(err));
		else toast('Password reset link sent — check your email');
	}
</script>

<svelte:head><title>Log in · Tutor More Academy</title></svelte:head>

<AuthShell title="Welcome back" subtitle="Log in to continue to your classes.">
	{#if page.url.searchParams.get('next')?.startsWith('/checkin')}
		<div class="mb-6 rounded-2xl bg-sun-50 p-4 text-sm text-sun-600">Log in to finish checking in to class.</div>
	{/if}
	<form onsubmit={submit} class="space-y-4">
		<div>
			<label class="label" for="email">Email</label>
			<input id="email" class="input" type="email" autocomplete="email" required bind:value={email} />
		</div>
		<div>
			<div class="flex items-center justify-between">
				<label class="label" for="password">Password</label>
				<button type="button" class="mb-1.5 text-sm text-brand-600 hover:underline" onclick={forgot}>Forgot password?</button>
			</div>
			<input id="password" class="input" type="password" autocomplete="current-password" required bind:value={password} />
		</div>
		{#if error}<p class="text-sm text-brand-700">{error}</p>{/if}
		<button class="btn btn-primary w-full py-3" disabled={busy}>
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} Log in
		</button>
	</form>
	<p class="mt-6 text-center text-muted">
		New to Tutor More? <a href="/register{page.url.search}" class="text-brand-600 hover:underline">Create an account</a>
	</p>
</AuthShell>
