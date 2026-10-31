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
		if (!form.first_name.trim() || !form.last_name.trim()) return 'กรุณากรอกชื่อและนามสกุล';
		if (!form.nickname.trim()) return 'กรุณากรอกชื่อเล่น';
		if (!form.education_level) return 'กรุณาเลือกระดับการศึกษา';
		if (form.phone && !/^[0-9+\-\s]{9,15}$/.test(form.phone.trim())) return 'เบอร์โทรศัพท์ไม่ถูกต้อง';
		if (!form.phone.trim() && !form.line_id.trim() && !form.facebook.trim() && !form.instagram.trim())
			return 'กรุณากรอกช่องทางติดต่ออย่างน้อย 1 ช่องทาง (เบอร์โทร, LINE, Facebook หรือ Instagram) เพื่อให้ติวเตอร์ติดต่อได้';
		if (form.password.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
		if (form.password !== form.confirm) return 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
		if (!accept) return 'กรุณายอมรับเงื่อนไขก่อนสมัครสมาชิก';
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

<svelte:head><title>สมัครสมาชิก · ติวเตอร์มอร์</title></svelte:head>

<AuthShell title="สมัครสมาชิก" subtitle="สมัครเรียน ดูบทเรียนย้อนหลัง และเช็คชื่อด้วย QR ได้ในที่เดียว">
	{#if sentTo}
		<div class="card flex flex-col items-center p-8 text-center">
			<div class="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sun-100 text-brand-600">
				<MailCheck size={28} />
			</div>
			<h2 class="section-title">ยืนยันอีเมลของคุณ</h2>
			<p class="mt-2 text-muted">
				เราส่งลิงก์ยืนยันไปที่ <span class="text-ink">{sentTo}</span> แล้ว กดลิงก์ในอีเมลเพื่อเปิดใช้งานบัญชี
			</p>
			<a href="/login" class="btn btn-soft mt-6">กลับไปหน้าเข้าสู่ระบบ</a>
		</div>
	{:else}
		<form onsubmit={submit} class="space-y-6" novalidate>
			<fieldset class="space-y-4">
				<legend class="mb-3 text-sm font-normal text-muted">ข้อมูลส่วนตัว</legend>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="fn">ชื่อ</label>
						<input id="fn" class="input" autocomplete="given-name" required bind:value={form.first_name} />
					</div>
					<div>
						<label class="label" for="ln">นามสกุล</label>
						<input id="ln" class="input" autocomplete="family-name" required bind:value={form.last_name} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="nn">ชื่อเล่น</label>
						<input id="nn" class="input" placeholder="เช่น กอล์ฟ" required bind:value={form.nickname} />
					</div>
					<div>
						<label class="label" for="edu">ระดับการศึกษา</label>
						<select id="edu" class="input" required bind:value={form.education_level}>
							<option value="" disabled>เลือก…</option>
							<option value="high_school">มัธยม</option>
							<option value="university">มหาวิทยาลัย</option>
						</select>
					</div>
				</div>
				<div>
					<label class="label" for="school">โรงเรียน / คณะ <span class="text-muted">(ไม่บังคับ)</span></label>
					<input id="school" class="input" placeholder="เช่น มทส. — วิศวกรรมอุตสาหการ" bind:value={form.school} />
				</div>
			</fieldset>

			<fieldset class="space-y-4">
				<legend class="mb-1 text-sm font-normal text-muted">ช่องทางติดต่อ</legend>
				<p class="hint -mt-2 mb-2">กรอกอย่างน้อย 1 ช่องทาง เฉพาะติวเตอร์และแอดมินเท่านั้นที่มองเห็น</p>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="phone">เบอร์โทรศัพท์</label>
						<input id="phone" class="input" type="tel" inputmode="tel" autocomplete="tel" placeholder="08x-xxx-xxxx" bind:value={form.phone} />
					</div>
					<div>
						<label class="label" for="line">LINE ID</label>
						<input id="line" class="input" bind:value={form.line_id} />
					</div>
					<div>
						<label class="label" for="fb">Facebook</label>
						<input id="fb" class="input" placeholder="ชื่อ หรือลิงก์โปรไฟล์" bind:value={form.facebook} />
					</div>
					<div>
						<label class="label" for="ig">Instagram</label>
						<input id="ig" class="input" placeholder="@username" bind:value={form.instagram} />
					</div>
				</div>
			</fieldset>

			<fieldset class="space-y-4">
				<legend class="mb-3 text-sm font-normal text-muted">ข้อมูลเข้าสู่ระบบ</legend>
				<div>
					<label class="label" for="email">อีเมล</label>
					<input id="email" class="input" type="email" autocomplete="email" required bind:value={form.email} />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="label" for="pw">รหัสผ่าน</label>
						<input id="pw" class="input" type="password" autocomplete="new-password" minlength="8" required bind:value={form.password} />
					</div>
					<div>
						<label class="label" for="pw2">ยืนยันรหัสผ่าน</label>
						<input id="pw2" class="input" type="password" autocomplete="new-password" required bind:value={form.confirm} />
					</div>
				</div>
			</fieldset>

			<label class="flex items-start gap-3 text-sm text-muted">
				<input type="checkbox" class="mt-1 h-4 w-4 accent-brand-600" bind:checked={accept} />
				ยินยอมให้ติวเตอร์มอร์ อะคาเดมี บันทึกการเข้าเรียน ตำแหน่งขณะเช็คชื่อ และความคืบหน้าการเรียน เพื่อใช้ในการติวเท่านั้น
			</label>

			{#if error}<p class="rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700">{error}</p>{/if}

			<button class="btn btn-primary w-full py-3" disabled={busy}>
				{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} สมัครสมาชิก
			</button>
		</form>
		<p class="mt-6 text-center text-muted">
			มีบัญชีอยู่แล้ว? <a href="/login{page.url.search}" class="text-brand-600 hover:underline">เข้าสู่ระบบ</a>
		</p>
	{/if}
</AuthShell>
