<script lang="ts">
	import { page } from '$app/state';
	import Logo from '#lib/components/Logo.svelte';
</script>

<svelte:head><title>{page.status} · ติวเตอร์มอร์</title></svelte:head>

<div class="flex min-h-dvh flex-col items-center justify-center bg-white px-6 text-center">
	<Logo size={64} />
	<div class="mt-8 text-7xl font-semibold text-brand-600">{page.status}</div>
	<h1 class="page-title mt-2">
		{page.status === 404 ? 'ไม่พบหน้าที่คุณต้องการ' : page.status === 403 ? 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้' : 'เกิดข้อผิดพลาด'}
	</h1>
	<p class="mt-2 max-w-md text-muted">{page.error?.message}</p>
	<div class="mt-8 flex gap-3">
		<a href="/home" class="btn btn-primary">กลับหน้าแรก</a>
		<button class="btn btn-soft" onclick={() => history.back()}>ย้อนกลับ</button>
	</div>
</div>
