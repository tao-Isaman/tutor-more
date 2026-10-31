<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, text = '', icon, children }: { title: string; text?: string; icon?: Snippet; children?: Snippet } =
		$props();
</script>

<div class="flex flex-col items-center justify-center rounded-2xl bg-neutral-50 px-6 py-14 text-center">
	{#if icon}
		<div class="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
			{@render icon()}
		</div>
	{/if}
	<h3 class="text-lg">{title}</h3>
	{#if text}<p class="mt-1 max-w-sm text-muted">{text}</p>{/if}
	{#if children}<div class="mt-5">{@render children()}</div>{/if}
</div>
