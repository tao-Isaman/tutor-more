<script lang="ts">
	import {
		ArrowUpRight,
		AtSign,
		BookOpen,
		Briefcase,
		CalendarCheck,
		Check,
		CirclePlay,
		GraduationCap,
		Globe,
		Mail,
		MessageCircle,
		MessageSquare,
		Pencil,
		Phone,
		Share2,
		Users
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
		import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { EDUCATION_LABEL, fullName, isStaffRole } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const p = $derived(data.profile!);
	const staff = $derived(isStaffRole(p.role));


	const checklist = $derived([
		{ done: !!p.avatar_url, label: 'เพิ่มรูปโปรไฟล์' },
		{ done: !!p.nickname, label: 'ตั้งชื่อเล่น' },
		{ done: !!p.education_level, label: 'เลือกระดับการศึกษา' },
		{ done: !!p.school, label: 'เพิ่มโรงเรียน / คณะ' },
		{ done: !!p.bio, label: 'เขียนแนะนำตัวสั้น ๆ' },
		{ done: !!(data.contacts?.phone || data.contacts?.line_id), label: 'เพิ่มเบอร์โทรหรือ LINE' }
	]);
	const doneCount = $derived(checklist.filter((c) => c.done).length);

	const stats = $derived(
		staff
			? [
					{ value: data.stats.subjects, label: 'วิชาที่สอน', icon: BookOpen },
					{ value: data.stats.students, label: 'นักเรียนทั้งหมด', icon: Users },
					{ value: data.stats.questions, label: 'ตอบคำถาม', icon: MessageSquare },
					{ value: data.subjects.reduce((n, s) => n + s.terms.length, 0), label: 'เทอมที่เปิด', icon: CalendarCheck }
				]
			: [
					{ value: data.classes.length, label: 'คลาสที่เรียน', icon: BookOpen },
					{ value: data.stats.attended, label: 'ครั้งที่เช็คชื่อ', icon: CalendarCheck },
					{ value: data.stats.completed, label: 'วิดีโอที่ดูจบ', icon: CirclePlay },
					{ value: data.stats.questions, label: 'คำถามที่ถาม', icon: MessageSquare }
				]
	);

	const items = $derived(
		staff
			? data.subjects.map((s) => ({ href: `/subjects/${s.id}`, code: s.code, title: s.title, sub: s.title_th ?? `${s.terms.length} เทอม` }))
			: data.classes.map((c) => ({
					href: `/terms/${c.term!.id}`,
					code: c.term!.subject?.code ?? null,
					title: c.term!.subject?.title ?? '',
					sub: `เทอม ${c.term!.name}`
				}))
	);

	const contacts = $derived([
		{ icon: Mail, label: 'อีเมล', value: data.contacts?.email },
		{ icon: Phone, label: 'เบอร์โทร', value: data.contacts?.phone },
		{ icon: MessageCircle, label: 'LINE', value: data.contacts?.line_id },
		{ icon: Globe, label: 'Facebook', value: data.contacts?.facebook },
		{ icon: AtSign, label: 'Instagram', value: data.contacts?.instagram ? '@' + data.contacts.instagram : null }
	]);

	async function share() {
		const text = `${fullName(p)} บน Tutor More Academy`;
		const url = `${location.origin}/explore`;
		if (navigator.share) await navigator.share({ title: text, url }).catch(() => {});
		else {
			await navigator.clipboard.writeText(url);
			toast('คัดลอกลิงก์แล้ว');
		}
	}
</script>

<svelte:head><title>{fullName(p)} · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
	<!-- Header card: soft cover + overlapping avatar -->
	<section class="overflow-hidden rounded-[28px] border border-line bg-white">
		<div class="relative h-28 overflow-hidden bg-canvas md:h-44">
			<div class="absolute -top-16 right-6 h-40 w-40 rounded-full bg-sun-200/70 md:right-10 md:h-56 md:w-56"></div>
			<div class="absolute -bottom-24 right-40 h-36 w-36 rounded-full bg-brand-100/80 md:right-56 md:h-48 md:w-48"></div>
			<div class="absolute top-6 left-8 hidden text-sm text-muted md:block">โปรไฟล์ของคุณ</div>
		</div>

		<div class="px-6 pb-6 md:px-8">
			<div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
				<div class="flex flex-col gap-3 md:flex-row md:items-end md:gap-5">
					<div class="relative z-10 -mt-14 w-fit md:-mt-16">
						<Avatar profile={p} size={120} ring />
					</div>
					<div class="min-w-0 md:pb-2">
						<div class="flex flex-wrap items-center gap-2">
							<h1 class="page-title">{fullName(p)}</h1>
							<StatusBadge status={p.role} />
						</div>
						<p class="mt-1 text-muted">
							@{p.nickname || 'ชื่อเล่น'}
							{#if p.school}<span class="mx-1.5">·</span>{p.school}{/if}
						</p>
					</div>
				</div>
				<div class="flex gap-2 md:pb-2">
					<a href="/settings" class="btn btn-dark"><Pencil size={16} /> แก้ไขโปรไฟล์</a>
					<button class="btn btn-soft" onclick={share} aria-label="ชวนเพื่อน"><Share2 size={16} /><span class="hidden sm:inline">ชวนเพื่อน</span></button>
				</div>
			</div>
		</div>
	</section>

	<div class="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
		<!-- Sidebar -->
		<aside class="order-2 space-y-6 lg:order-1">
			{#if doneCount < checklist.length}
				<section class="card p-5">
					<div class="flex items-center justify-between">
						<h2 class="card-title">กรอกโปรไฟล์ให้ครบ</h2>
						<span class="text-sm text-muted">{doneCount}/{checklist.length}</span>
					</div>
					<div class="mt-3 h-2 overflow-hidden rounded-full bg-neutral-100">
						<div class="h-full rounded-full bg-brand-600 transition-all" style="width:{(doneCount / checklist.length) * 100}%"></div>
					</div>
					<ul class="mt-4 space-y-2.5 text-sm">
						{#each checklist as c (c.label)}
							<li class="flex items-center gap-2.5 {c.done ? 'text-muted line-through' : ''}">
								<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full {c.done ? 'bg-success-500 text-white' : 'border border-neutral-300'}">
									{#if c.done}<Check size={12} strokeWidth={3} />{/if}
								</span>
								{c.label}
							</li>
						{/each}
					</ul>
					<a href="/settings" class="btn btn-primary btn-sm mt-5 w-full">กรอกข้อมูลเลย</a>
				</section>
			{/if}

			<section class="card p-5">
				<h2 class="card-title">เกี่ยวกับ</h2>
				{#if p.bio}
					<p class="mt-2 font-read leading-relaxed text-neutral-800">{p.bio}</p>
				{:else}
					<a href="/settings" class="mt-2 inline-block text-sm text-subtle hover:text-brand-600">+ เพิ่มแนะนำตัวสั้น ๆ</a>
				{/if}
				<ul class="mt-4 space-y-3 border-t border-line pt-4 text-sm">
					<li class="flex items-center gap-3">
						<GraduationCap size={18} strokeWidth={1.6} class="shrink-0 text-muted" />
						{#if p.education_level}{EDUCATION_LABEL[p.education_level]}{:else}<a href="/settings" class="text-subtle hover:text-brand-600">เพิ่มระดับการศึกษา</a>{/if}
					</li>
					<li class="flex items-center gap-3">
						<Briefcase size={18} strokeWidth={1.6} class="shrink-0 text-muted" />
						{#if p.school}{p.school}{:else}<a href="/settings" class="text-subtle hover:text-brand-600">เพิ่มโรงเรียน / คณะ</a>{/if}
					</li>
				</ul>
			</section>

			<section class="card p-5">
				<h2 class="card-title">ช่องทางติดต่อ</h2>
				<ul class="mt-3 space-y-3 text-sm">
					{#each contacts as c (c.label)}
						<li class="flex items-center gap-3">
							<span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-muted"><c.icon size={15} /></span>
							<div class="min-w-0">
								<div class="text-xs text-muted">{c.label}</div>
								<div class="truncate {c.value ? '' : 'text-subtle'}">{c.value || 'ยังไม่ได้ระบุ'}</div>
							</div>
						</li>
					{/each}
				</ul>
				<p class="mt-4 text-xs text-muted">เห็นได้เฉพาะคุณ ติวเตอร์ของคุณ และแอดมิน</p>
			</section>
		</aside>

		<!-- Main -->
		<div class="order-1 min-w-0 space-y-6 lg:order-2">
			<section class="grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each stats as s (s.label)}
					<div class="card p-4">
						<div class="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-100 text-ink"><s.icon size={18} strokeWidth={1.7} /></div>
						<div class="mt-3 text-2xl font-medium">{s.value}</div>
						<div class="text-sm text-muted">{s.label}</div>
					</div>
				{/each}
			</section>

			<section class="card p-5 md:p-6">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="card-title">{staff ? 'วิชาที่สอน' : 'คลาสของฉัน'}</h2>
					<a href={staff ? '/teach' : '/explore'} class="text-sm text-muted hover:text-ink">{staff ? 'จัดการคลาส' : 'หาคลาสเพิ่ม'}</a>
				</div>
				{#if items.length}
					<div class="grid gap-3 sm:grid-cols-2">
						{#each items as it (it.href)}
							<a href={it.href} class="group flex items-center gap-4 rounded-2xl border border-line p-4 transition hover:border-neutral-300 hover:shadow-sm">
								<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-xs font-medium text-brand-700">
									{it.code?.slice(0, 5) || it.title.slice(0, 2).toUpperCase()}
								</span>
								<div class="min-w-0 flex-1">
									<div class="truncate">{it.title}</div>
									<div class="truncate text-sm text-muted">{it.sub}</div>
								</div>
								<ArrowUpRight size={18} class="shrink-0 text-neutral-300 transition group-hover:text-ink" />
							</a>
						{/each}
					</div>
				{:else}
					<EmptyState title={staff ? 'ยังไม่มีวิชา' : 'ยังไม่มีคลาส'} text={staff ? 'วิชาที่คุณสอนจะแสดงที่นี่' : 'คลาสที่คุณเข้าร่วมจะแสดงที่นี่'}>
						<a href={staff ? '/teach' : '/explore'} class="btn btn-dark">{staff ? 'ไปที่หน้าการสอน' : 'ค้นหาคอร์ส'}</a>
					</EmptyState>
				{/if}
			</section>
		</div>
	</div>
</div>
