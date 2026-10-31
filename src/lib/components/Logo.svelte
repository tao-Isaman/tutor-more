<script lang="ts">
	/** Vector redraw of the Tutor More Academy badge (original artwork: /logo-original.png). */
	let { size = 44, class: klass = '' }: { size?: number; class?: string } = $props();
</script>

<svg
	viewBox="0 0 90 105"
	width={size}
	height={size * (105 / 90)}
	class={klass}
	role="img"
	aria-label="Tutor More Academy"
>
	<rect x="1.5" y="1.5" width="87" height="102" rx="3" fill="#e11d2a" stroke="#111" stroke-width="3" />
	<ellipse cx="45" cy="17" rx="38" ry="8.5" fill="#fff" stroke="#111" stroke-width="1" />
	<text
		x="45"
		y="20.5"
		text-anchor="middle"
		font-family="Kanit, sans-serif"
		font-weight="600"
		font-size="8"
		textLength="68"
		lengthAdjust="spacingAndGlyphs"
		fill="#1d3fbf">สถาบันกวดวิชาติวเตอร์มอร์</text
	>
	<path d="M8 31h26v8H26v24h-10V39H8z" fill="#ffc400" stroke="#111" stroke-width="0.8" />
	<text
		x="35"
		y="62"
		textLength="47"
		lengthAdjust="spacingAndGlyphs"
		font-family="'Arial Black', Arial, sans-serif"
		font-weight="900"
		font-size="19"
		fill="#ffc400"
		stroke="#111"
		stroke-width="0.6">UTOR</text
	>
	<text
		x="45"
		y="82"
		text-anchor="middle"
		textLength="62"
		lengthAdjust="spacingAndGlyphs"
		font-family="'Arial Black', Arial, sans-serif"
		font-weight="900"
		font-size="19"
		fill="#ffc400"
		stroke="#111"
		stroke-width="0.6">MORE</text
	>
	<rect x="5" y="87" width="80" height="13" fill="#ffc400" />
	<text
		x="45"
		y="97"
		text-anchor="middle"
		font-family="Arial, sans-serif"
		font-weight="700"
		font-size="7.4"
		textLength="72"
		lengthAdjust="spacingAndGlyphs"
		fill="#e11d2a">TUTOR MORE ACADEMIC</text
	>
</svg>
