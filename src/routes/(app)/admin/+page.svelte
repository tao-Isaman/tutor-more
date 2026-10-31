<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { BookOpen, GraduationCap, Search, ShieldCheck, Users, X } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import type { Enums } from '#lib/database.types.ts';
	import { toast } from '#lib/toast.svelte.ts';
	import { EDUCATION_LABEL, errorMessage, formatDate, fullName } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let tab = $state<'users' | 'subjects'>('users');
	let q = $state('');
	let roleFilter = $state<'all' | Enums<'app_role'>>('all');

	const counts = $derived({
		all: data.users.length,
		student: data.users.filter((u) => u.role === 'student').length,
		tutor: data.users.filter((u) => u.role === 'tutor').length,
		admin: data.users.filter((u) => u.role === 'admin').length
	});
	const filtered = $derived(
		data.users.filter((u) => {
			if (roleFilter !== 'all' && u.role !== roleFilter) return false;
			const s = q.trim().toLowerCase();
			if (!s) return true;
			const c = data.contacts[u.id];
			return [u.first_name, u.last_name, u.nickname, c?.email, c?.phone].some((x) => x?.toLowerCase().includes(s));
		})
	);
	const staff = $derived(data.users.filter((u) => u.role !== 'student'));

	async function setRole(id: string, role: Enums<'app_role'>) {
		if (id === data.user?.id && role !== 'admin' && !confirm('ต้องการยกเลิกสิทธิ์แอดมินของตัวเองใช่ไหม?')) {
			await invalidate('app:admin');
			return;
		}
		const { error } = await data.supabase.from('profiles').update({ role }).eq('id', id);
		if (error) toast.error(errorMessage(error));
		else toast(`เปลี่ยนบทบาทเป็น${roleLabels[role] ?? role}แล้ว`);
		await invalidate('app:admin');
	}

	async function addTutor(subjectId: string, tutorId: string) {
		if (!tutorId) return;
		const { error } = await data.supabase.from('subject_tutors').insert({ subject_id: subjectId, tutor_id: tutorId });
		if (error) return toast.error(error.code === '23505' ? 'ติวเตอร์คนนี้อยู่ในวิชานี้แล้ว' : errorMessage(error));
		toast('เพิ่มติวเตอร์แล้ว');
		await invalidate('app:admin');
	}

	async function removeTutor(subjectId: string, tutorId: string) {
		const { error } = await data.supabase.from('subject_tutors').delete().eq('subject_id', subjectId).eq('tutor_id', tutorId);
		if (error) return toast.error(errorMessage(error));
		await invalidate('app:admin');
	}

	const byId = $derived(new Map(data.users.map((u) => [u.id, u])));
	const roleLabels: Record<string, string> = { all: 'ทั้งหมด', student: 'นักเรียน', tutor: 'ติวเตอร์', admin: 'แอดมิน' };
</script>

<svelte:head><title>แอดมิน · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
	<h1 class="flex items-center gap-3 text-3xl md:text-4xl"><ShieldCheck class="text-brand-600" size={32} /> แอดมิน</h1>

	<div class="mt-6 grid gap-4 sm:grid-cols-4">
		<div class="card p-5"><div class="flex items-center gap-2 text-sm text-muted"><Users size={16} /> ผู้ใช้</div><div class="mt-1 text-3xl">{counts.all}</div></div>
		<div class="card p-5"><div class="text-sm text-muted">นักเรียน</div><div class="mt-1 text-3xl">{counts.student}</div></div>
		<div class="card p-5"><div class="flex items-center gap-2 text-sm text-muted"><GraduationCap size={16} /> ติวเตอร์</div><div class="mt-1 text-3xl">{counts.tutor}</div></div>
		<div class="card p-5"><div class="flex items-center gap-2 text-sm text-muted"><BookOpen size={16} /> วิชา</div><div class="mt-1 text-3xl">{data.subjects.length}</div></div>
	</div>

	<nav class="mt-8 flex gap-7 border-b border-line">
		<button class="tab {tab === 'users' ? 'tab-active' : ''}" onclick={() => (tab = 'users')}>ผู้ใช้และสิทธิ์</button>
		<button class="tab {tab === 'subjects' ? 'tab-active' : ''}" onclick={() => (tab = 'subjects')}>ติวเตอร์ประจำวิชา</button>
	</nav>

	{#if tab === 'users'}
		<div class="mt-6 flex flex-wrap items-center gap-3">
			<label class="relative min-w-60 flex-1">
				<Search size={16} class="absolute top-1/2 left-4 -translate-y-1/2 text-neutral-400" />
				<input class="input rounded-full pl-10" placeholder="ค้นหาชื่อ อีเมล หรือเบอร์โทร…" bind:value={q} />
			</label>
			<div class="flex gap-1 rounded-full bg-neutral-100 p-1 text-sm">
				{#each ['all', 'student', 'tutor', 'admin'] as const as r (r)}
					<button class="rounded-full px-3 py-1.5 {roleFilter === r ? 'bg-white shadow-sm' : 'text-muted'}" onclick={() => (roleFilter = r)}>
						{roleLabels[r]} {counts[r]}
					</button>
				{/each}
			</div>
		</div>

		<div class="mt-4 overflow-x-auto rounded-2xl border border-line">
			<table class="w-full min-w-[760px] text-left">
				<thead class="bg-neutral-50 text-sm text-muted">
					<tr>
						<th class="px-4 py-3 font-normal">ผู้ใช้</th>
						<th class="px-4 py-3 font-normal">ช่องทางติดต่อ</th>
						<th class="px-4 py-3 font-normal">ระดับการศึกษา</th>
						<th class="px-4 py-3 font-normal">สมัครเมื่อ</th>
						<th class="px-4 py-3 font-normal">บทบาท</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-line">
					{#each filtered as u (u.id)}
						{@const c = data.contacts[u.id]}
						<tr>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<Avatar profile={u} size={36} />
									<div><div>{fullName(u)}</div><div class="text-xs text-muted">{u.nickname}</div></div>
								</div>
							</td>
							<td class="px-4 py-3 text-sm"><div>{c?.email ?? ''}</div><div class="text-muted">{c?.phone ?? ''}</div></td>
							<td class="px-4 py-3 text-sm text-muted">{u.education_level ? EDUCATION_LABEL[u.education_level] : '—'}</td>
							<td class="px-4 py-3 text-sm text-muted">{formatDate(u.created_at)}</td>
							<td class="px-4 py-3">
								<select
									class="input w-32 py-1.5 text-sm"
									value={u.role}
									onchange={(e) => setRole(u.id, e.currentTarget.value as Enums<'app_role'>)}
								>
									<option value="student">นักเรียน</option>
									<option value="tutor">ติวเตอร์</option>
									<option value="admin">แอดมิน</option>
								</select>
							</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="px-4 py-10 text-center text-muted">ไม่พบผู้ใช้</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	{:else}
		<p class="mt-6 mb-4 text-sm text-muted">ติวเตอร์ที่ประจำวิชาสามารถจัดการเทอม บทเรียน การเช็คชื่อ และนักเรียนทั้งหมดของวิชานั้นได้</p>
		<ul class="space-y-3">
			{#each data.subjects as s (s.id)}
				{@const assigned = s.subject_tutors.map((st) => st.tutor_id)}
				<li class="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
					<a href="/subjects/{s.id}" class="min-w-48 hover:text-brand-600">{s.title} <span class="text-sm text-muted">{s.code ?? ''}</span></a>
					<div class="flex flex-1 flex-wrap gap-2">
						{#each assigned as id (id)}
							{@const t = byId.get(id)}
							<span class="chip py-1 pr-2 pl-1 text-sm">
								<Avatar profile={t} size={24} /> {t?.nickname || fullName(t)}
								<button class="rounded-full p-0.5 hover:bg-neutral-100" aria-label="นำติวเตอร์ออก" onclick={() => removeTutor(s.id, id)}><X size={14} /></button>
							</span>
						{/each}
					</div>
					<select class="input w-full py-1.5 text-sm md:w-56" value="" onchange={(e) => addTutor(s.id, e.currentTarget.value)}>
						<option value="">+ เพิ่มติวเตอร์…</option>
						{#each staff.filter((u) => !assigned.includes(u.id)) as u (u.id)}
							<option value={u.id}>{fullName(u)} ({u.nickname})</option>
						{/each}
					</select>
				</li>
			{:else}
				<li class="text-muted">ยังไม่มีวิชา</li>
			{/each}
		</ul>
	{/if}
</div>
