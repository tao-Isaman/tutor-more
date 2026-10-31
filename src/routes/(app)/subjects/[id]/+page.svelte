<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import { CalendarDays, Clock, LoaderCircle, Pencil, Plus, Users } from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Markdown from '#lib/components/Markdown.svelte';
	import Modal from '#lib/components/Modal.svelte';
	import StatusBadge from '#lib/components/StatusBadge.svelte';
	import SubjectForm from '#lib/components/SubjectForm.svelte';
	import TermForm from '#lib/components/TermForm.svelte';
	import { toast } from '#lib/toast.svelte.ts';
	import { errorMessage, formatBaht, formatDate, fullName } from '#lib/utils.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const s = $derived(data.subject);
	const tutors = $derived(s.subject_tutors.map((x) => x.tutor).filter((t) => !!t));

	let editOpen = $state(false);
	let termOpen = $state(false);
	let joinTerm = $state<(typeof s.terms)[number] | null>(null);
	let joinMessage = $state('');
	let busy = $state(false);

	async function requestJoin() {
		if (!data.user || !joinTerm) return;
		busy = true;
		const { error } = await data.supabase
			.from('enrollments')
			.insert({ term_id: joinTerm.id, student_id: data.user.id, message: joinMessage.trim() || null });
		busy = false;
		if (error) {
			toast.error(error.code === '23505' ? 'You already requested this term' : errorMessage(error));
			return;
		}
		toast('Request sent! Your tutor will review it soon.');
		joinTerm = null;
		joinMessage = '';
		await invalidate('app:subject');
	}

	async function cancelRequest(termId: string) {
		if (!data.user || !confirm('Cancel your enrollment request?')) return;
		const { error } = await data.supabase
			.from('enrollments')
			.delete()
			.eq('term_id', termId)
			.eq('student_id', data.user.id)
			.eq('status', 'pending');
		if (error) return toast.error(errorMessage(error));
		toast('Request cancelled');
		await invalidate('app:subject');
	}

	function startJoin(t: (typeof s.terms)[number]) {
		if (!data.user) {
			void goto(`/login?next=${encodeURIComponent(page.url.pathname)}`);
			return;
		}
		joinTerm = t;
	}
</script>

<svelte:head><title>{s.title} · Tutor More Academy</title></svelte:head>

<div class="mx-auto max-w-6xl px-5 py-8 md:px-10 md:py-10">
	<!-- Hero -->
	<div class="relative overflow-hidden rounded-[28px] bg-brand-600 text-white">
		{#if s.cover_url}
			<img src={s.cover_url} alt="" class="absolute inset-0 h-full w-full object-cover opacity-40" />
		{:else}
			<div class="absolute -top-20 -right-16 h-72 w-72 rounded-full bg-sun-400"></div>
		{/if}
		<div class="relative flex flex-col gap-4 p-8 sm:flex-row sm:items-end sm:justify-between md:p-10">
			<div>
				{#if s.code}<div class="text-white/80">{s.code}</div>{/if}
				<h1 class="text-3xl font-semibold text-white md:text-5xl">{s.title}</h1>
				{#if s.title_th}<div class="mt-1 text-xl text-sun-300">{s.title_th}</div>{/if}
			</div>
			{#if data.isStaff}
				<div class="flex gap-2">
					<button class="btn bg-white/15 text-white hover:bg-white/25" onclick={() => (editOpen = true)}><Pencil size={16} /> Edit</button>
					<button class="btn btn-sun" onclick={() => (termOpen = true)}><Plus size={16} /> New term</button>
				</div>
			{/if}
		</div>
	</div>

	<div class="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
		<div class="space-y-8">
			{#if !s.is_published}
				<div class="rounded-2xl bg-neutral-100 px-5 py-3 text-muted">Draft — only tutors and admins can see this subject.</div>
			{/if}
			{#if s.description}
				<section>
					<h2 class="mb-2 text-xl">About this course</h2>
					<Markdown source={s.description} />
				</section>
			{/if}

			<section>
				<h2 class="mb-4 text-xl">Terms</h2>
				{#if s.terms.length === 0}
					<p class="text-muted">No terms yet.</p>
				{/if}
				<div class="space-y-4">
					{#each s.terms as t (t.id)}
						{@const seat = data.seats[t.id]}
						{@const status = data.myStatus[t.id]}
						{@const full = t.capacity != null && (seat?.approved ?? 0) >= t.capacity}
						<article class="card p-5 md:p-6">
							<div class="flex flex-wrap items-start justify-between gap-3">
								<div>
									<div class="flex items-center gap-2">
										<h3 class="text-xl">Term {t.name}</h3>
										{#if !t.is_published}<StatusBadge status="draft" />{/if}
									</div>
									<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
										{#if t.start_date}
											<span class="flex items-center gap-1.5"><CalendarDays size={15} /> {formatDate(t.start_date)} – {formatDate(t.end_date)}</span>
										{/if}
										{#if t.capacity}
											<span class="flex items-center gap-1.5"><Users size={15} /> {seat?.approved ?? 0}/{t.capacity} seats</span>
										{/if}
									</div>
								</div>
								<div class="text-right">
									<div class="text-2xl font-medium text-brand-600">{formatBaht(t.price)}</div>
								</div>
							</div>
							{#if t.schedule_note}
								<p class="mt-3 flex items-start gap-2 text-sm"><Clock size={15} class="mt-0.5 shrink-0 text-muted" /> {t.schedule_note}</p>
							{/if}
							{#if t.description}<Markdown source={t.description} class="mt-2 text-[15px]" />{/if}

							<div class="mt-5 flex flex-wrap items-center gap-2">
								{#if data.isStaff}
									<a href="/terms/{t.id}" class="btn btn-dark">Open class</a>
								{:else if status === 'approved'}
									<a href="/terms/{t.id}" class="btn btn-primary">Go to class</a>
								{:else if status === 'pending'}
									<StatusBadge status="pending" />
									<button class="btn btn-ghost btn-sm" onclick={() => cancelRequest(t.id)}>Cancel request</button>
								{:else if status === 'rejected'}
									<span class="text-sm text-muted">Your request was not approved. Message the tutor for details.</span>
								{:else if full}
									<span class="badge bg-neutral-100 text-muted">Full</span>
								{:else if t.is_published}
									<button class="btn btn-primary" onclick={() => startJoin(t)}>Request to join</button>
								{/if}
							</div>
						</article>
					{/each}
				</div>
			</section>
		</div>

		<aside class="space-y-4">
			<h2 class="text-xl">Tutors</h2>
			{#each tutors as tutor (tutor.id)}
				<div class="card flex items-start gap-4 p-5">
					<Avatar profile={tutor} size={56} />
					<div class="min-w-0">
						<div class="text-lg">พี่{tutor.nickname || tutor.first_name}</div>
						<div class="text-sm text-muted">{fullName(tutor)}</div>
						{#if tutor.school}<div class="mt-1 text-sm">{tutor.school}</div>{/if}
						{#if tutor.bio}<p class="mt-2 line-clamp-4 text-sm text-muted">{tutor.bio}</p>{/if}
					</div>
				</div>
			{:else}
				<p class="text-muted">Tutors will be announced soon.</p>
			{/each}
		</aside>
	</div>
</div>

<Modal bind:open={() => joinTerm !== null, (v) => !v && (joinTerm = null)} title="Request to join · Term {joinTerm?.name ?? ''}">
	<div class="space-y-4">
		<div class="rounded-2xl bg-sun-50 p-4 text-sm">
			<div class="text-base">{s.title} · {formatBaht(joinTerm?.price)}</div>
			<p class="mt-1 text-muted">
				Your tutor will confirm your seat (and payment, if any). You'll get access to lessons as soon as you're approved.
			</p>
		</div>
		<div>
			<label class="label" for="msg">Message to tutor <span class="text-muted">(optional)</span></label>
			<textarea id="msg" class="input min-h-24" maxlength="500" placeholder="e.g. Transferred ฿2,000 at 14:05 from KBank" bind:value={joinMessage}></textarea>
		</div>
	</div>
	{#snippet footer()}
		<button class="btn btn-soft" onclick={() => (joinTerm = null)}>Cancel</button>
		<button class="btn btn-primary" disabled={busy} onclick={requestJoin}>
			{#if busy}<LoaderCircle size={18} class="animate-spin" />{/if} Send request
		</button>
	{/snippet}
</Modal>

{#if data.isStaff && data.user}
	<Modal bind:open={editOpen} title="Edit subject">
		<SubjectForm
			supabase={data.supabase}
			userId={data.user.id}
			subject={s}
			onsaved={() => {
				editOpen = false;
				void invalidate('app:subject');
			}}
		/>
	</Modal>
	<Modal bind:open={termOpen} title="New term">
		<TermForm
			supabase={data.supabase}
			subjectId={s.id}
			onsaved={(id) => {
				termOpen = false;
				void goto(`/terms/${id}`);
			}}
		/>
	</Modal>
{/if}
