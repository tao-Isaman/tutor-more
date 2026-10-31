<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Compass,
		GraduationCap,
		House,
		LogOut,
		MessageCircle,
		QrCode,
		Settings,
		ShieldCheck
	} from '@lucide/svelte';
	import Avatar from '#lib/components/Avatar.svelte';
	import Logo from '#lib/components/Logo.svelte';
	import { isStaffRole } from '#lib/utils.ts';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	const role = $derived(data.profile?.role);
	let unread = $state(0);

	type NavItem = { href: string; label: string; icon: typeof House; badge?: number };
	const nav = $derived(
		[
			data.user && { href: '/home', label: 'Home', icon: House },
			{ href: '/explore', label: 'Explore', icon: Compass },
			data.user && role === 'student' && { href: '/checkin', label: 'Check in', icon: QrCode },
			data.user && isStaffRole(role) && { href: '/teach', label: 'Teach', icon: GraduationCap },
			data.user && { href: '/messages', label: 'Room', icon: MessageCircle, badge: unread },
			data.user && role === 'admin' && { href: '/admin', label: 'Admin', icon: ShieldCheck }
		].filter(Boolean) as NavItem[]
	);

	const active = (href: string) => page.url.pathname === href || page.url.pathname.startsWith(href + '/');

	async function refreshUnread() {
		if (!data.user) return;
		const { data: n } = await data.supabase.rpc('unread_message_count');
		unread = n ?? 0;
	}

	$effect(() => {
		if (!data.user) return;
		void refreshUnread();
		const channel = data.supabase
			.channel('nav-unread')
			.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => void refreshUnread())
			.subscribe();
		return () => void data.supabase.removeChannel(channel);
	});

	async function logout() {
		await data.supabase.auth.signOut();
		await invalidateAll();
		await goto('/');
	}
</script>

<div class="min-h-dvh md:flex">
	<!-- Desktop rail (Fastwork-style) -->
	<aside class="sticky top-0 hidden h-dvh w-[104px] shrink-0 flex-col items-center py-6 md:flex">
		<a href={data.user ? '/home' : '/'} class="mb-6 transition hover:scale-105" aria-label="Tutor More Academy home">
			<Logo size={46} />
		</a>

		{#if data.user}
			<a
				href="/profile"
				class="mb-4 rounded-2xl p-2 transition {active('/profile') ? 'bg-white shadow-md' : 'hover:bg-white/70'}"
				aria-label="Your profile"
			>
				<Avatar profile={data.profile} size={46} />
			</a>
		{/if}

		<nav class="flex flex-1 flex-col items-center gap-1">
			{#each nav as item (item.href)}
				<a
					href={item.href}
					class="group relative flex w-[84px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[13px] transition
						{active(item.href) ? 'bg-white font-normal text-brand-600 shadow-sm' : 'text-neutral-600 hover:bg-white/70 hover:text-ink'}"
				>
					<item.icon size={24} strokeWidth={1.6} />
					{item.label}
					{#if item.badge}
						<span class="absolute top-1.5 right-4 min-w-5 rounded-full bg-brand-600 px-1.5 text-center text-[11px] leading-5 text-white">
							{item.badge > 99 ? '99+' : item.badge}
						</span>
					{/if}
				</a>
			{/each}
		</nav>

		{#if data.user}
			<a
				href="/settings"
				class="flex w-[84px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[13px] transition
					{active('/settings') ? 'bg-white text-brand-600 shadow-sm' : 'text-neutral-600 hover:bg-white/70'}"
			>
				<Settings size={24} strokeWidth={1.6} />
				Settings
			</a>
			<button
				onclick={logout}
				class="mt-1 flex w-[84px] flex-col items-center gap-1 rounded-2xl py-2.5 text-[13px] text-neutral-500 transition hover:bg-white/70 hover:text-brand-600"
			>
				<LogOut size={22} strokeWidth={1.6} />
				Log out
			</button>
		{:else}
			<a href="/login" class="btn btn-primary btn-sm">Log in</a>
		{/if}
	</aside>

	<!-- Mobile top bar -->
	<header class="sticky top-0 z-30 flex items-center justify-between bg-canvas/90 px-4 py-2.5 backdrop-blur md:hidden">
		<a href={data.user ? '/home' : '/'} class="flex items-center gap-2">
			<Logo size={30} />
			<span class="font-medium">Tutor More</span>
		</a>
		{#if data.user}
			<div class="flex items-center gap-1">
				<a href="/settings" class="btn-ghost rounded-full p-2" aria-label="Settings"><Settings size={20} /></a>
				<a href="/profile" aria-label="Your profile"><Avatar profile={data.profile} size={34} /></a>
			</div>
		{:else}
			<a href="/login" class="btn btn-primary btn-sm">Log in</a>
		{/if}
	</header>

	<main class="min-w-0 flex-1 pb-24 md:p-3 md:pb-3 md:pl-0">
		<div class="min-h-[calc(100dvh-1.5rem)] bg-white md:rounded-[28px] md:shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
			{@render children()}
		</div>
	</main>

	<!-- Mobile bottom nav -->
	{#if data.user}
		<nav class="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-white/95 px-1 pt-1.5 pb-[max(env(safe-area-inset-bottom),0.4rem)] backdrop-blur md:hidden">
			{#each nav.slice(0, 5) as item (item.href)}
				<a
					href={item.href}
					class="relative flex min-w-14 flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[11px] {active(item.href)
						? 'text-brand-600'
						: 'text-neutral-500'}"
				>
					<item.icon size={22} strokeWidth={1.7} />
					{item.label}
					{#if item.badge}
						<span class="absolute top-0 right-2 h-2 w-2 rounded-full bg-brand-600"></span>
					{/if}
				</a>
			{/each}
		</nav>
	{/if}
</div>
