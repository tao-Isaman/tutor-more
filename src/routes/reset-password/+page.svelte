<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { LoaderCircle } from '@lucide/svelte';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { linkProblem, passwordProblem } from '#lib/recovery.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let pw = $state({ next: '', confirm: '' });
	let busy = $state(false);
	let error = $state('');
	// Reached from /auth/confirm, which signed the person in with the e-mail link. No session = not from a link.
	const problem = $derived(data.session ? null : linkProblem(page.url.searchParams.get('error') ?? 'no_session'));

	async function save(e: SubmitEvent) {
		e.preventDefault();
		error = passwordProblem(pw.next, pw.confirm) ?? '';
		if (error) return;
		busy = true;
		const { error: err } = await data.supabase.auth.updateUser({ password: pw.next });
		busy = false;
		if (err) {
			error = errorMessage(err);
			return;
		}
		toast('ตั้งรหัสผ่านใหม่แล้ว');
		await invalidate('supabase:auth');
		await goto('/home');
	}
</script>

<svelte:head><title>ตั้งรหัสผ่านใหม่ · ติวเตอร์มอร์</title></svelte:head>

<AuthShell title="ตั้งรหัสผ่านใหม่" subtitle={data.user?.email ? `สำหรับบัญชี ${data.user.email}` : 'ตั้งรหัสผ่านใหม่จากลิงก์ในอีเมล'}>
	{#if problem}
		<p class="mb-4 rounded-lg bg-sun-50 p-3 text-sm text-brand-700" data-testid="link-problem">{problem}</p>
		<a class="btn btn-primary w-full" href="/forgot-password">ขอลิงก์ใหม่</a>
	{:else}
		<form class="space-y-4" onsubmit={save}>
			<div>
				<label class="label" for="np">รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
				<input id="np" class="input" type="password" autocomplete="new-password" minlength="8" required bind:value={pw.next} />
			</div>
			<div>
				<label class="label" for="cp">ยืนยันรหัสผ่านใหม่</label>
				<input id="cp" class="input" type="password" autocomplete="new-password" required bind:value={pw.confirm} />
			</div>
			{#if error}<p class="text-sm text-brand-700">{error}</p>{/if}
			<button class="btn btn-primary w-full" type="submit" disabled={busy}>
				{#if busy}<LoaderCircle class="animate-spin" size={18} />{/if}
				บันทึกรหัสผ่านใหม่
			</button>
		</form>
	{/if}
</AuthShell>
