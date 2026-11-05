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
	// Each reset request sends an email, and the project's mailer is rate-limited.
	// Block double-clicks and wait 60 s before allowing another request.
	let resetCooldown = $state(0);
	let resetBusy = $state(false);

	const next = $derived(safeNext(page.url.searchParams.get('next')));

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		busy = true;
		error = '';
		const { error: err } = await data.supabase.auth.signInWithPassword({ email: email.trim(), password });
		busy = false;
		if (err) {
			error = errorMessage(err);
			return;
		}
		await invalidate('supabase:auth');
		await goto(next);
	}

	async function forgot() {
		if (!email.trim()) {
			error = 'กรอกอีเมลก่อน แล้วกด "ลืมรหัสผ่าน?"';
			return;
		}
		if (resetBusy || resetCooldown > 0) return;
		resetBusy = true;
		const { error: err } = await data.supabase.auth.resetPasswordForEmail(email.trim(), {
			redirectTo: `${page.url.origin}/auth/callback?next=/settings%3Ftab%3Dsecurity`
		});
		resetBusy = false;
		if (err) {
			toast.error(errorMessage(err));
			return;
		}
		toast('ส่งลิงก์ตั้งรหัสผ่านใหม่แล้ว กรุณาเช็คอีเมล');
		resetCooldown = 60;
		const t = setInterval(() => {
			resetCooldown -= 1;
			if (resetCooldown <= 0) clearInterval(t);
		}, 1000);
	}
</script>

<svelte:head><title>เข้าสู่ระบบ · ติวเตอร์มอร์</title></svelte:head>

<AuthShell title="ยินดีต้อนรับกลับมา" subtitle="เข้าสู่ระบบเพื่อเข้าห้องเรียนของคุณ">
	{#if page.url.searchParams.get('next')?.startsWith('/checkin')}
		<div class="mb-6 rounded-2xl bg-sun-50 p-4 text-sm text-sun-600">เข้าสู่ระบบก่อน แล้วระบบจะเช็คชื่อเข้าเรียนให้ต่อทันที</div>
	{/if}
	<form onsubmit={submit} class="space-y-4">
		<div>
			<label class="label" for="email">อีเมล</label>
			<input id="email" class="input" type="email" autocomplete="email" required bind:value={email} />
		</div>
		<div>
			<div class="flex items-center justify-between">
				<label class="label" for="password">รหัสผ่าน</label>
				<button
					type="button"
					class="mb-1.5 text-sm text-brand-600 hover:underline disabled:text-muted disabled:no-underline"
					onclick={forgot}
					disabled={resetBusy || resetCooldown > 0}
				>
					{resetCooldown > 0 ? `ส่งใหม่ได้ใน ${resetCooldown} วิ` : 'ลืมรหัสผ่าน?'}
				</button>
			</div>
			<input id="password" class="input" type="password" autocomplete="current-password" required bind:value={password} />
		</div>
		{#if error}<p class="text-sm text-brand-700">{error}</p>{/if}
		<button class="btn btn-primary w-full py-3" disabled={busy}>
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} เข้าสู่ระบบ
		</button>
	</form>
	<p class="mt-6 text-center text-muted">
		ยังไม่มีบัญชี? <a href="/register{page.url.search}" class="text-brand-600 hover:underline">สมัครสมาชิก</a>
	</p>
</AuthShell>
