<script lang="ts">
	import { invalidate, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Camera, LoaderCircle } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { Enums } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.profile!);

	let tab = $state(page.url.searchParams.get('tab') === 'security' ? 'security' : 'profile');

	// The form is seeded once from the loaded profile.
	// svelte-ignore state_referenced_locally
	let f = $state({
		first_name: data.profile!.first_name,
		last_name: data.profile!.last_name,
		nickname: data.profile!.nickname,
		education_level: (data.profile!.education_level ?? '') as Enums<'education_level'> | '',
		school: data.profile!.school ?? '',
		bio: data.profile!.bio ?? '',
		phone: data.contacts?.phone ?? '',
		line_id: data.contacts?.line_id ?? '',
		facebook: data.contacts?.facebook ?? '',
		instagram: data.contacts?.instagram ?? ''
	});
	let pw = $state({ next: '', confirm: '' });
	let busy = $state(false);
	let uploading = $state(false);

	async function uploadAvatar(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) return toast.error('กรุณาเลือกไฟล์รูปภาพ');
		if (file.size > 3 * 1024 * 1024) return toast.error('รูปต้องมีขนาดไม่เกิน 3 MB');
		uploading = true;
		const path = `${p.id}/avatar-${Date.now()}.${file.name.split('.').pop()}`;
		const { error } = await data.supabase.storage.from('avatars').upload(path, file, { cacheControl: '31536000' });
		if (error) {
			uploading = false;
			return toast.error(errorMessage(error));
		}
		const url = data.supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
		const { error: err2 } = await data.supabase.from('profiles').update({ avatar_url: url }).eq('id', p.id);
		uploading = false;
		if (err2) return toast.error(errorMessage(err2));
		toast('อัปเดตรูปแล้ว');
		await invalidate('supabase:auth');
	}

	async function saveProfile(e: SubmitEvent) {
		e.preventDefault();
		if (!f.first_name.trim() || !f.last_name.trim() || !f.nickname.trim()) return toast.error('กรุณากรอกชื่อ นามสกุล และชื่อเล่น');
		busy = true;
		const [a, b] = await Promise.all([
			data.supabase
				.from('profiles')
				.update({
					first_name: f.first_name.trim(),
					last_name: f.last_name.trim(),
					nickname: f.nickname.trim(),
					education_level: f.education_level || null,
					school: f.school.trim() || null,
					bio: f.bio.trim() || null
				})
				.eq('id', p.id),
			data.supabase
				.from('profile_contacts')
				.update({
					phone: f.phone.trim() || null,
					line_id: f.line_id.trim() || null,
					facebook: f.facebook.trim() || null,
					instagram: f.instagram.trim().replace(/^@/, '') || null
				})
				.eq('user_id', p.id)
		]);
		busy = false;
		const err = a.error ?? b.error;
		if (err) return toast.error(errorMessage(err));
		toast('บันทึกโปรไฟล์แล้ว');
		await invalidateAll();
	}

	async function changePassword(e: SubmitEvent) {
		e.preventDefault();
		if (pw.next.length < 8) return toast.error('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
		if (pw.next !== pw.confirm) return toast.error('รหัสผ่านไม่ตรงกัน');
		busy = true;
		const { error } = await data.supabase.auth.updateUser({ password: pw.next });
		busy = false;
		if (error) return toast.error(errorMessage(error));
		pw = { next: '', confirm: '' };
		toast('เปลี่ยนรหัสผ่านแล้ว');
	}
</script>

<svelte:head><title>ตั้งค่า · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-3xl px-5 py-8 md:px-10 md:py-10">
	<h1 class="page-title">ตั้งค่า</h1>

	<nav class="mt-6 flex gap-7 border-b border-line">
		<button class="tab {tab === 'profile' ? 'tab-active' : ''}" onclick={() => (tab = 'profile')}>โปรไฟล์</button>
		<button class="tab {tab === 'security' ? 'tab-active' : ''}" onclick={() => (tab = 'security')}>รหัสผ่าน</button>
	</nav>

	{#if tab === 'profile'}
		<form onsubmit={saveProfile} class="mt-8 space-y-8">
			<div class="flex items-center gap-5">
				<label class="group relative cursor-pointer" aria-label="เปลี่ยนรูป">
					<Avatar profile={p} size={88} />
					<span class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">
						{#if uploading}<LoaderCircle class="animate-spin" />{:else}<Camera />{/if}
					</span>
					<input type="file" accept="image/*" class="sr-only" onchange={uploadAvatar} />
				</label>
				<div>
					<div class="text-lg">รูปโปรไฟล์</div>
					<div class="text-sm text-muted">ช่วยให้ติวเตอร์จำคุณได้ตอนเช็คชื่อ ไฟล์ JPG/PNG ไม่เกิน 3 MB</div>
				</div>
			</div>

			<section class="grid gap-4 sm:grid-cols-2">
				<div><label class="label" for="fn">ชื่อ</label><input id="fn" class="input" maxlength="80" bind:value={f.first_name} /></div>
				<div><label class="label" for="ln">นามสกุล</label><input id="ln" class="input" maxlength="80" bind:value={f.last_name} /></div>
				<div><label class="label" for="nn">ชื่อเล่น</label><input id="nn" class="input" maxlength="40" bind:value={f.nickname} /></div>
				<div>
					<label class="label" for="edu">ระดับการศึกษา</label>
					<select id="edu" class="input" bind:value={f.education_level}>
						<option value="">ไม่ระบุ</option>
						<option value="high_school">มัธยม</option>
						<option value="university">มหาวิทยาลัย</option>
					</select>
				</div>
				<div class="sm:col-span-2"><label class="label" for="school">โรงเรียน / คณะ</label><input id="school" class="input" maxlength="120" bind:value={f.school} /></div>
				<div class="sm:col-span-2">
					<label class="label" for="bio">แนะนำตัว</label>
					<textarea id="bio" class="input min-h-24" maxlength="500" placeholder="เล่าเกี่ยวกับตัวคุณสั้น ๆ" bind:value={f.bio}></textarea>
				</div>
			</section>

			<section>
				<h2 class="card-title mb-1">ช่องทางติดต่อ</h2>
				<p class="mb-4 text-sm text-muted">เห็นได้เฉพาะคุณ ติวเตอร์ของคุณ และแอดมินเท่านั้น</p>
				<div class="grid gap-4 sm:grid-cols-2">
					<div><label class="label" for="ph">เบอร์โทร</label><input id="ph" class="input" type="tel" maxlength="30" bind:value={f.phone} /></div>
					<div><label class="label" for="line">LINE ID</label><input id="line" class="input" maxlength="60" bind:value={f.line_id} /></div>
					<div><label class="label" for="fb">Facebook</label><input id="fb" class="input" maxlength="200" bind:value={f.facebook} /></div>
					<div><label class="label" for="ig">Instagram</label><input id="ig" class="input" maxlength="60" bind:value={f.instagram} /></div>
				</div>
				<p class="mt-3 text-sm text-muted">อีเมล: {data.contacts?.email ?? data.user?.email}</p>
			</section>

			<button class="btn btn-primary px-8" disabled={busy}>
				{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} บันทึก
			</button>
		</form>
	{:else}
		<form onsubmit={changePassword} class="mt-8 max-w-md space-y-4">
			<div><label class="label" for="np">รหัสผ่านใหม่</label><input id="np" class="input" type="password" autocomplete="new-password" minlength="8" bind:value={pw.next} /></div>
			<div><label class="label" for="cp">ยืนยันรหัสผ่านใหม่</label><input id="cp" class="input" type="password" autocomplete="new-password" bind:value={pw.confirm} /></div>
			<button class="btn btn-primary" disabled={busy}>
				{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} เปลี่ยนรหัสผ่าน
			</button>
		</form>
	{/if}
</div>
