<script lang="ts">
	import { X } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let {
		open = $bindable(false),
		title,
		width = 'max-w-lg',
		children,
		footer
	}: { open: boolean; title: string; width?: string; children: Snippet; footer?: Snippet } = $props();

	let dialog = $state<HTMLDialogElement>();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) dialog.showModal();
		if (!open && dialog.open) dialog.close();
	});
</script>

<dialog
	bind:this={dialog}
	onclose={() => (open = false)}
	onclick={(e) => e.target === dialog && (open = false)}
	class="m-auto w-[calc(100%-2rem)] {width} rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
>
	{#if open}
		<div class="flex items-center justify-between border-b border-line px-6 py-4">
			<h2 class="text-lg">{title}</h2>
			<button class="btn-ghost -mr-2 rounded-full p-2" onclick={() => (open = false)} aria-label="ปิด">
				<X size={20} />
			</button>
		</div>
		<div class="max-h-[70vh] overflow-y-auto px-6 py-5">
			{@render children()}
		</div>
		{#if footer}
			<div class="flex justify-end gap-2 border-t border-line px-6 py-4">
				{@render footer()}
			</div>
		{/if}
	{/if}
</dialog>
