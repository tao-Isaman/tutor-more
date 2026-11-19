<script lang="ts">
	import { page } from '$app/state';
	import { LoaderCircle, MailCheck } from '@lucide/svelte';
	import AuthShell from '#lib/components/AuthShell.svelte';
	import { RECOVERY_COOLDOWN_S, linkProblem, recoveryRedirect } from '#lib/recovery.ts';
	import { errorMessage } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let email = $state(page.url.searchParams.get('email') ?? '');
	let busy = $state(false);
	let sentTo = $state('');
	let error = $state('');
	let cooldown = $state(0);
	const problem = $derived(linkProblem(page.url.searchParams.get('error')));

	async function send(e: SubmitEvent) {
		e.preventDefault();
		if (busy || cooldown > 0) return;
		const to = email.trim();
		if (!to) {
			error = 'กรอกอีเมลที่ใช้สมัคร';
			return;
		}
		busy = true;
		error = '';
		const { error: err } = await data.supabase.auth.resetPasswordForEmail(to, { redirectTo: recoveryRedirect(page.url.origin) });
		busy = false;
		if (err) {
			error = errorMessage(err);
			return;
		}
		// Same answer whether or not the address has an account: the page does not reveal who is registered.
		sentTo = to;
		cooldown = RECOVERY_COOLDOWN_S;
		const t = setInterval(() => {
			cooldown -= 1;
			if (cooldown <= 0) clearInterval(t);
		}, 1000);
	}
</script>

<svelte:head><title>ลืมรหัสผ่าน · ติวเตอร์มอร์</title></svelte:head>

<AuthShell title="ลืมรหัสผ่าน" subtitle="กรอกอีเมลที่ใช้สมัคร เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้">
	{#if problem}<p class="mb-4 rounded-lg bg-sun-50 p-3 text-sm text-brand-700" data-testid="link-problem">{problem}</p>{/if}
	{#if sentTo}
		<div class="mb-6 rounded-lg border border-brand-100 bg-brand-50 p-4 text-sm" data-testid="sent">
			<p class="flex items-center gap-2 font-medium"><MailCheck size={18} /> ส่งลิงก์แล้ว</p>
			<p class="mt-2">ถ้ามีบัญชีที่ใช้อีเมล <b>{sentTo}</b> เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ไปแล้ว</p>
			<p class="mt-1">เปิดอีเมลแล้วกดลิงก์ได้จากเครื่องไหนก็ได้ ภายใน 1 ชั่วโมง · ถ้าไม่เห็นในกล่องจดหมาย ลองดูใน <b>Spam / จดหมายขยะ</b></p>
		</div>
	{/if}
	<form class="space-y-4" onsubmit={send}>
		<div>
			<label class="label" for="email">อีเมล</label>
			<input id="email" class="input" type="email" autocomplete="email" required bind:value={email} />
		</div>
		{#if error}<p class="text-sm text-brand-700">{error}</p>{/if}
		<button class="btn btn-primary w-full" type="submit" disabled={busy || cooldown > 0}>
			{#if busy}<LoaderCircle class="animate-spin" size={18} />{/if}
			{cooldown > 0 ? `ส่งอีกครั้งได้ใน ${cooldown} วินาที` : sentTo ? 'ส่งลิงก์อีกครั้ง' : 'ส่งลิงก์ตั้งรหัสผ่านใหม่'}
		</button>
	</form>
	<p class="mt-6 text-center text-sm text-muted"><a class="text-brand-600 hover:underline" href="/login">กลับไปหน้าเข้าสู่ระบบ</a></p>
</AuthShell>
