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
	<title>ติวเตอร์มอร์ อะคาเดมี | Tutor More Academy</title>
	<meta name="description" content="ติวเตอร์มอร์ อะคาเดมี สถาบันกวดวิชาวิศวกรรมสำหรับนักศึกษา มทส. รวมบทเรียน วิดีโอ เช็คชื่อ และถาม-ตอบไว้ในที่เดียว" />
</svelte:head>

<Toaster />
{@render children()}
