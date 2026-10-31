<script lang="ts">
	import {
		ArrowRight,
		BookOpen,
		CirclePlay,
		Clock,
		Compass,
		Megaphone,
		Pin,
		QrCode,
		Radio,
		UserCheck
	} from '@lucide/svelte';
	import EmptyState from '#lib/components/EmptyState.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import { formatDate, isStaffRole, percent, timeAgo } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const staff = $derived(isStaffRole(data.profile?.role));
	const approved = $derived(data.enrollments.filter((e) => e.status === 'approved' && e.term));
	const waiting = $derived(data.enrollments.filter((e) => e.status === 'pending' && e.term));

	const hour = new Date().getHours();
	const greeting = hour < 12 ? 'สวัสดีตอนเช้า' : hour < 18 ? 'สวัสดีตอนบ่าย' : 'สวัสดีตอนเย็น';
</script>

<svelte:head><title>หน้าแรก · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
	<p class="text-muted">{greeting}</p>
	<h1 class="text-3xl md:text-4xl">{data.profile?.nickname || data.profile?.first_name} 👋</h1>

	<!-- Live check-in banners -->
	{#each data.openSessions as s (s.id)}
		<a
			href={staff ? `/terms/${s.term_id}/attendance/${s.id}` : '/checkin'}
			class="mt-6 flex items-center gap-4 rounded-3xl bg-ink p-5 text-white transition hover:bg-black"
		>
			<span class="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600">
				<Radio size={22} />
				<span class="absolute -top-1 -right-1 h-3 w-3 animate-ping rounded-full bg-sun-400"></span>
			</span>
			<div class="min-w-0 flex-1">
				<div class="text-sun-400">เปิดเช็คชื่ออยู่ · {s.term?.subject?.title} {s.term?.name}</div>
				<div class="truncate text-lg">{s.title}</div>
			</div>
			<span class="btn btn-sun hidden sm:inline-flex">
				{#if staff}แสดง QR{:else}<QrCode size={18} /> เช็คชื่อเลย{/if}
			</span>
		</a>
	{/each}

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
		<div class="space-y-10">
			{#if staff}
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-xl">คลาสที่สอน</h2>
						<a href="/teach" class="text-brand-600 hover:underline">จัดการ</a>
					</div>
					{#if data.pendingCount}
						<a href="/teach" class="mb-4 flex items-center gap-3 rounded-2xl bg-sun-50 px-5 py-4 text-sun-600 hover:bg-sun-100">
							<UserCheck size={20} />
							<span class="flex-1">มี {data.pendingCount} คำขอเข้าเรียนที่รออนุมัติ</span>
							<ArrowRight size={18} />
						</a>
					{/if}
					{#if data.teachTerms.length}
						<div class="grid gap-3 sm:grid-cols-2">
							{#each data.teachTerms as t (t.id)}
								<a href="/terms/{t.id}" class="card flex items-center gap-4 p-4 transition hover:shadow-md">
									<span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-sm text-white">
										{t.subject.code?.slice(0, 4) || t.subject.title.slice(0, 2).toUpperCase()}
									</span>
									<div class="min-w-0 flex-1">
										<div class="truncate">{t.subject.title}</div>
										<div class="text-sm text-muted">เทอม {t.name}</div>
									</div>
									<StatusBadge status={t.is_published ? 'published' : 'draft'} />
								</a>
							{/each}
						</div>
					{:else}
						<EmptyState title="ยังไม่มีคลาส" text="สร้างวิชาและเทอมเพื่อเริ่มสอนได้เลย">
							<a href="/teach" class="btn btn-primary">ไปที่หน้าการสอน</a>
						</EmptyState>
					{/if}
				</section>
			{/if}

			{#if !staff || approved.length || waiting.length}
				<section>
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-xl">คลาสของฉัน</h2>
						<a href="/explore" class="text-brand-600 hover:underline">หาคอร์สเพิ่ม</a>
					</div>
					{#if approved.length || waiting.length}
						<div class="grid gap-4 sm:grid-cols-2">
							{#each [...approved, ...waiting] as e (e.id)}
								{@const t = e.term!}
								<a
									href={e.status === 'approved' ? `/terms/${t.id}` : `/subjects/${t.subject?.id}`}
									class="group overflow-hidden rounded-3xl border border-line bg-white transition hover:shadow-lg"
								>
									<div class="relative h-28 overflow-hidden bg-brand-600 p-4 text-white">
										{#if t.subject?.cover_url}
											<img src={t.subject.cover_url} alt="" class="absolute inset-0 h-full w-full object-cover opacity-80" />
										{:else}
											<div class="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sun-400"></div>
										{/if}
										<div class="relative text-sm text-white/80">{t.subject?.code}</div>
										<div class="relative text-xl leading-tight font-medium">{t.subject?.title}</div>
									</div>
									<div class="flex items-center justify-between p-4">
										<div class="text-sm text-muted">
											เทอม {t.name}{#if t.start_date} · เริ่ม {formatDate(t.start_date)}{/if}
										</div>
										<StatusBadge status={e.status} />
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<EmptyState title="ยังไม่ได้เข้าร่วมคลาสไหนเลย" text="ดูคอร์สที่เปิดอยู่แล้วกดขอเข้าเรียนได้เลย">
							{#snippet icon()}<Compass size={26} />{/snippet}
							<a href="/explore" class="btn btn-primary">ค้นหาคอร์ส</a>
						</EmptyState>
					{/if}
				</section>
			{/if}

			{#if data.progress.length}
				<section>
					<h2 class="mb-4 text-xl">ดูต่อ</h2>
					<div class="space-y-3">
						{#each data.progress as p (p.content_id)}
							{#if p.content}
								<a href="/terms/{p.content.term_id}/content/{p.content.id}" class="card flex items-center gap-4 p-4 hover:shadow-md">
									<span class="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-600"><CirclePlay size={22} /></span>
									<div class="min-w-0 flex-1">
										<div class="truncate">{p.content.title}</div>
										<div class="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
											<div class="h-full rounded-full bg-brand-600" style="width:{percent(p.watched_seconds, p.duration_seconds)}%"></div>
										</div>
									</div>
									<span class="text-sm text-muted">{percent(p.watched_seconds, p.duration_seconds)}%</span>
								</a>
							{/if}
						{/each}
					</div>
				</section>
			{/if}
		</div>

		<aside class="space-y-6">
			{#if !staff}
				<a href="/checkin" class="flex items-center gap-4 rounded-3xl bg-sun-400 p-5 transition hover:bg-sun-300">
					<span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white"><QrCode size={24} class="text-brand-600" /></span>
					<div>
						<div class="text-lg">สแกนเพื่อเช็คชื่อ</div>
						<div class="text-sm text-ink/70">อยู่ในคลาสแล้ว? สแกน QR ของติวเตอร์ได้เลย</div>
					</div>
				</a>
			{/if}

			<section class="card p-5">
				<h2 class="mb-4 flex items-center gap-2 text-lg"><Megaphone size={20} class="text-brand-600" /> ประกาศ</h2>
				{#if data.announcements.length}
					<ul class="space-y-4">
						{#each data.announcements as a (a.id)}
							<li>
								<a href="/terms/{a.term?.id}/announcements" class="group block">
									<div class="flex items-start gap-2">
										{#if a.is_pinned}<Pin size={14} class="mt-1.5 shrink-0 text-brand-600" />{/if}
										<span class="group-hover:text-brand-600">{a.title}</span>
									</div>
									<div class="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
										<BookOpen size={12} />
										{a.term?.subject?.title} · {a.term?.name}
										<Clock size={12} class="ml-1" />
										{timeAgo(a.created_at)}
									</div>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-muted">ยังไม่มีอะไรใหม่ ประกาศจากคลาสของคุณจะแสดงที่นี่</p>
				{/if}
			</section>
		</aside>
	</div>
</div>
