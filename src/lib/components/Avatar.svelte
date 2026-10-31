<script lang="ts">
	import { initials, type ProfileLite } from '#lib/utils.ts';

	let {
		profile,
		size = 40,
		ring = false
	}: { profile: Partial<ProfileLite> | null | undefined; size?: number; ring?: boolean } = $props();

	const palette = ['bg-brand-100 text-brand-700', 'bg-sun-100 text-sun-600', 'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700'];
	const tone = $derived(palette[(profile?.id?.charCodeAt(0) ?? 0) % palette.length]);
</script>

{#if profile?.avatar_url}
	<img
		src={profile.avatar_url}
		alt=""
		class="shrink-0 rounded-full object-cover {ring ? 'ring-4 ring-white shadow-md' : ''}"
		style="width:{size}px;height:{size}px"
	/>
{:else}
	<span
		class="inline-flex shrink-0 items-center justify-center rounded-full font-medium {tone} {ring
			? 'ring-4 ring-white shadow-md'
			: ''}"
		style="width:{size}px;height:{size}px;font-size:{Math.max(11, size * 0.36)}px"
		aria-hidden="true"
	>
		{initials(profile)}
	</span>
{/if}
