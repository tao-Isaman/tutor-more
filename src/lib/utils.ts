import type { Tables } from './database.types';

export type Profile = Tables<'profiles'>;
export type ProfileLite = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'nickname' | 'avatar_url' | 'role'>;

export const PROFILE_LITE = 'id, first_name, last_name, nickname, avatar_url, role';

export function fullName(p: Partial<ProfileLite> | null | undefined): string {
	if (!p) return 'Unknown';
	const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
	return name || p.nickname || 'Unnamed user';
}

/** "Golf (Isaman S.)" style — nickname first, as Thai students address each other */
export function displayName(p: Partial<ProfileLite> | null | undefined): string {
	if (!p) return 'Unknown';
	if (p.nickname) return `${p.nickname} · ${fullName(p)}`;
	return fullName(p);
}

export function initials(p: Partial<ProfileLite> | null | undefined): string {
	const src = p?.nickname || p?.first_name || '?';
	return src.slice(0, 2).toUpperCase();
}

export const EDUCATION_LABEL: Record<string, string> = {
	high_school: 'High school (มัธยม)',
	university: 'University (มหาวิทยาลัย)'
};

export const ROLE_LABEL: Record<string, string> = { admin: 'Admin', tutor: 'Tutor', student: 'Student' };

export function isStaffRole(role: string | null | undefined) {
	return role === 'tutor' || role === 'admin';
}

const dateFmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('en-GB', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : '—');
export const formatDateTime = (d: string | Date | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : '—');
export const formatTime = (d: string | Date | null | undefined) => (d ? timeFmt.format(new Date(d)) : '—');

export function timeAgo(d: string | Date): string {
	const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
	if (s < 45) return 'just now';
	const m = Math.round(s / 60);
	if (m < 60) return `${m}m ago`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h}h ago`;
	const days = Math.round(h / 24);
	if (days < 7) return `${days}d ago`;
	return formatDate(d);
}

export function formatBaht(n: number | null | undefined) {
	if (!n) return 'Free';
	return `฿${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatDuration(totalSeconds: number | null | undefined) {
	const t = Math.max(0, Math.round(totalSeconds ?? 0));
	const h = Math.floor(t / 3600);
	const m = Math.floor((t % 3600) / 60);
	const s = t % 60;
	const mm = h ? String(m).padStart(2, '0') : String(m);
	return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')}`;
}

export function formatBytes(n: number | null | undefined) {
	if (!n) return '';
	const u = ['B', 'KB', 'MB', 'GB'];
	let i = 0;
	let v = n;
	while (v >= 1024 && i < u.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${u[i]}`;
}

export function percent(part: number, whole: number) {
	if (!whole) return 0;
	return Math.min(100, Math.round((part / whole) * 100));
}

/** Turn a Supabase/PostgREST error into a message fit for a toast. */
export function errorMessage(e: unknown): string {
	if (!e) return 'Something went wrong';
	if (typeof e === 'string') return e;
	if (typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
		if (e.message.includes('row-level security')) return "You don't have permission to do that";
		return e.message;
	}
	return 'Something went wrong';
}

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/home') {
	if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
	return next;
}
