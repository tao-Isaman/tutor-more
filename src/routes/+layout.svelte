<script lang="ts">
	import '../app.css';
	import { invalidate } from '$app/navigation';
	import Toaster from '#lib/components/Toaster.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	$effect(() => {
		const { data: sub } = data.supabase.auth.onAuthStateChange((_event, newSession) => {
			if (newSession?.expires_at !== data.session?.expires_at) invalidate('supabase:auth');
		});
		return () => sub.subscription.unsubscribe();
	});
</script>

<svelte:head>
	<title>Tutor More Academy</title>
	<meta name="description" content="Tutor More Academy — engineering tutoring for SUT students. Lessons, attendance and Q&A in one place." />
</svelte:head>

<Toaster />
{@render children()}
