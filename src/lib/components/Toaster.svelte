<script lang="ts">
	import { CircleAlert, CircleCheck, Info, X } from '@lucide/svelte';
	import { fly } from 'svelte/transition';
	import { dismiss, toasts } from '#lib/toast.svelte.ts';
</script>

<div class="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
	{#each toasts as t (t.id)}
		<div
			transition:fly={{ y: -16, duration: 200 }}
			class="pointer-events-auto flex max-w-md items-center gap-3 rounded-full bg-ink py-2.5 pr-3 pl-4 text-[15px] text-white shadow-xl"
		>
			{#if t.kind === 'success'}
				<CircleCheck size={18} class="text-sun-400" />
			{:else if t.kind === 'error'}
				<CircleAlert size={18} class="text-brand-400" />
			{:else}
				<Info size={18} class="text-neutral-300" />
			{/if}
			<span>{t.message}</span>
			<button class="rounded-full p-1 hover:bg-white/10" onclick={() => dismiss(t.id)} aria-label="Dismiss">
				<X size={14} />
			</button>
		</div>
	{/each}
</div>
