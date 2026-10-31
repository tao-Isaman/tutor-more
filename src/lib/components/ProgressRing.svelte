<script lang="ts">
	let {
		value,
		size = 44,
		stroke = 4,
		label = '',
		track = 'rgba(255,255,255,0.18)',
		color = 'var(--color-sun-400)'
	}: { value: number; size?: number; stroke?: number; label?: string; track?: string; color?: string } = $props();
	const r = $derived((size - stroke) / 2);
	const c = $derived(2 * Math.PI * r);
</script>

<div class="relative inline-flex items-center justify-center" style="width:{size}px;height:{size}px">
	<svg width={size} height={size} class="-rotate-90">
		<circle cx={size / 2} cy={size / 2} {r} fill="none" stroke={track} stroke-width={stroke} />
		<circle
			cx={size / 2}
			cy={size / 2}
			{r}
			fill="none"
			stroke={color}
			stroke-width={stroke}
			stroke-linecap="round"
			stroke-dasharray={c}
			stroke-dashoffset={c * (1 - Math.min(100, Math.max(0, value)) / 100)}
			class="transition-[stroke-dashoffset] duration-500"
		/>
	</svg>
	<span class="absolute text-xs font-medium">{label}</span>
</div>
