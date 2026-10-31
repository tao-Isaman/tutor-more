<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { LoaderCircle, MailCheck } from '@lucide/svelte';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { errorMessage, safeNext } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let form = $state({
		first_name: '',
		last_name: '',
		nickname: '',
		education_level: '',
		school: '',
		phone: '',
		line_id: '',
		facebook: '',
		instagram: '',
		email: '',
		password: '',
		confirm: ''
	});
	let accept = $state(false);
	let busy = $state(false);
	let error = $state('');
	let sentTo = $state('');

	const next = $derived(safeNext(page.url.searchParams.get('next')));

	function validate(): string {
		if (!form.first_name.trim() || !form.last_name.trim()) return 'Please enter your first and last name';
		if (!form.nickname.trim()) return 'Please enter your nickname';
		if (!form.education_level) return 'Please choose your education level';
		if (form.phone && !/^[0-9+\-\s]{9,15}$/.test(form.phone.trim())) return 'Phone number looks invalid';
		if (!form.phone.trim() && !form.line_id.trim() && !form.facebook.trim() && !form.instagram.trim())
			return 'Add at least one contact (phone, LINE, Facebook or Instagram) so your tutor can reach you';
		if (form.password.length < 8) return 'Password must be at least 8 characters';
		if (form.password !== form.confirm) return 'Passwords do not match';
		if (!accept) return 'Please accept the terms to continue';
		return '';
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = validate();
		if (error) return;
		busy = true;

		const trim = (s: string) => s.trim();
		const { data: res, error: err } = await data.supabase.auth.signUp({
			email: trim(form.email),
			password: form.password,
			options: {
				emailRedirectTo: `${page.url.origin}/auth/callback?next=${encodeURIComponent(next)}`,
				// read by the handle_new_user() trigger; role is always "student" server-side
				data: {
					first_name: trim(form.first_name),
					last_name: trim(form.last_name),
					nickname: trim(form.nickname),
					education_level: form.education_level,
					school: trim(form.school),
					phone: trim(form.phone),
					line_id: trim(form.line_id),
					facebook: trim(form.facebook),
					instagram: trim(form.instagram).replace(/^@/, '')
				}
			}
		});
		busy = false;

		if (err) {
			error = errorMessage(err);
			return;
		}
		if (res.session) {
			await invalidate('supabase:auth');
			await goto(next);
		} else {
			// Email confirmation is enabled on the project
			sentTo = trim(form.email);
		}
	}
</script>

<svelte:head><title>Sign up · Tutor More Academy</title></svelte:head>

<AuthShell title="Create your account" subtitle="Join classes, watch lessons and check in with QR.">
	{#if sentTo}
		<div class="card flex flex-col items-center p-8 text-center">
			<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sun-100 text-brand-600">
				<MailCheck size={28} />
			</div>
			<h2 class="text-xl">Confirm your email</h2>
			<p class="mt-2 text-muted">
				We sent a confirmation link to <span class="text-ink">{sentTo}</span>. Open it to activate your account.
			</p>
			<a href="/login" class="btn btn-soft mt-6">Back to log in</a>
		</div>
	{:else}
		<form onsubmit={submit} class="space-y-6" novalidate>
			<fieldset class="space-y-4">
				<legend class="mb-3 text-sm font-normal tracking-wide text-muted uppercase">About you</legend>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="fn">First name</label>
						<input id="fn" class="input" autocomplete="given-name" required bind:value={form.first_name} />
					</div>
					<div>
						<label class="label" for="ln">Last name</label>
						<input id="ln" class="input" autocomplete="family-name" required bind:value={form.last_name} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="nn">Nickname</label>
						<input id="nn" class="input" placeholder="e.g. Golf" required bind:value={form.nickname} />
					</div>
					<div>
						<label class="label" for="edu">Education</label>
						<select id="edu" class="input" required bind:value={form.education_level}>
							<option value="" disabled>Choose…</option>
							<option value="high_school">High school · มัธยม</option>
							<option value="university">University · มหาลัย</option>
						</select>
					</div>
				</div>
				<div>
					<label class="label" for="school">School / Faculty <span class="text-muted">(optional)</span></label>
					<input id="school" class="input" placeholder="e.g. SUT — Industrial Engineering" bind:value={form.school} />
				</div>
			</fieldset>

			<fieldset class="space-y-4">
				<legend class="mb-1 text-sm font-normal tracking-wide text-muted uppercase">Contact</legend>
				<p class="hint -mt-2 mb-2">Add at least one. Only your tutors and admins can see these.</p>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="phone">Phone</label>
						<input id="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="08x-xxx-xxxx" bind:value={form.phone} />
					</div>
					<div>
						<label class="label" for="line">LINE ID</label>
						<input id="line" class="input" bind:value={form.line_id} />
					</div>
					<div>
						<label class="label" for="fb">Facebook</label>
						<input id="fb" class="input" placeholder="Name or profile link" bind:value={form.facebook} />
					</div>
					<div>
						<label class="label" for="ig">Instagram</label>
						<input id="ig" class="input" placeholder="@username" bind:value={form.instagram} />
					</div>
				</div>
			</fieldset>

			<fieldset class="space-y-4">
				<legend class="mb-3 text-sm font-normal tracking-wide text-muted uppercase">Login</legend>
				<div>
					<label class="label" for="email">Email</label>
					<input id="email" class="input" type="email" autocomplete="email" required bind:value={form.email} />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="pw">Password</label>
						<input id="pw" class="input" type="password" autocomplete="new-password" minlength="8" required bind:value={form.password} />
					</div>
					<div>
						<label class="label" for="pw2">Confirm password</label>
						<input id="pw2" class="input" type="password" autocomplete="new-password" required bind:value={form.confirm} />
					</div>
				</div>
			</fieldset>

			<label class="flex items-start gap-3 text-sm text-muted">
				<input type="checkbox" class="mt-1 h-4 w-4 accent-brand-600" bind:checked={accept} />
				I agree that Tutor More Academy may record my attendance, location at check-in and lesson progress for teaching purposes.
			</label>

			{#if error}<p class="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{error}</p>{/if}

			<button class="btn btn-primary w-full py-3" disabled={busy}>
				{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} Create account
			</button>
		</form>
		<p class="mt-6 text-center text-muted">
			Already have an account? <a href="/login{page.url.search}" class="text-brand-600 hover:underline">Log in</a>
		</p>
	{/if}
</AuthShell>
