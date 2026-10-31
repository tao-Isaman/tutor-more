<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
</script>

<svelte:head><title>{page.status} · Tutor More Academy</title></svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
	<Logo size={64} />
	<div class="mt-8 text-7xl font-semibold text-brand-600">{page.status}</div>
	<h1 class="mt-2 text-2xl">
		{page.status === 404 ? "We couldn't find that page" : page.status === 403 ? 'No access' : 'Something went wrong'}
	</h1>
	<p class="mt-2 max-w-md text-muted">{page.error?.message}</p>
	<div class="mt-8 flex gap-3">
		<a href="/home" class="btn btn-primary">Go home</a>
		<button class="btn btn-soft" onclick={() => history.back()}>Go back</button>
	</div>
</div>
