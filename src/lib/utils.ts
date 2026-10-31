import type { Tables } from './database.types';

export type Profile = Tables<'profiles'>;
export type ProfileLite = Pick<Profile, 'id' | 'first_name' | 'last_name' | 'nickname' | 'avatar_url' | 'role'>;

export const PROFILE_LITE = 'id, first_name, last_name, nickname, avatar_url, role';

export function fullName(p: Partial<ProfileLite> | null | undefined): string {
	if (!p) return 'ไม่ทราบชื่อ';
	const name = `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim();
	return name || p.nickname || 'ผู้ใช้ไม่มีชื่อ';
}

/** "Golf (Isaman S.)" style — nickname first, as Thai students address each other */
export function displayName(p: Partial<ProfileLite> | null | undefined): string {
	if (!p) return 'ไม่ทราบชื่อ';
	if (p.nickname) return `${p.nickname} · ${fullName(p)}`;
	return fullName(p);
}

export function initials(p: Partial<ProfileLite> | null | undefined): string {
	const src = p?.nickname || p?.first_name || '?';
	return src.slice(0, 2).toUpperCase();
}

export const EDUCATION_LABEL: Record<string, string> = {
	high_school: 'มัธยม',
	university: 'มหาวิทยาลัย'
};

export const ROLE_LABEL: Record<string, string> = { admin: 'แอดมิน', tutor: 'ติวเตอร์', student: 'นักเรียน' };

export function isStaffRole(role: string | null | undefined) {
	return role === 'tutor' || role === 'admin';
}

const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat('th-TH', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});
const timeFmt = new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit' });

export const formatDate = (d: string | Date | null | undefined) => (d ? dateFmt.format(new Date(d)) : '—');
export const formatDateTime = (d: string | Date | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : '—');
export const formatTime = (d: string | Date | null | undefined) => (d ? timeFmt.format(new Date(d)) : '—');

export function timeAgo(d: string | Date): string {
	const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
	if (s < 45) return 'เมื่อสักครู่';
	const m = Math.round(s / 60);
	if (m < 60) return `${m} นาทีที่แล้ว`;
	const h = Math.round(m / 60);
	if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
	const days = Math.round(h / 24);
	if (days < 7) return `${days} วันที่แล้ว`;
	return formatDate(d);
}

export function formatBaht(n: number | null | undefined) {
	if (!n) return 'ฟรี';
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

/** Common Supabase Auth / network errors, shown in Thai. */
const KNOWN_ERRORS: [RegExp, string][] = [
	[/invalid login credentials/i, 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'],
	[/already registered|already been registered/i, 'อีเมลนี้สมัครสมาชิกแล้ว'],
	[/email not confirmed/i, 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ'],
	[/password should be at least/i, 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'],
	[/rate limit/i, 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่'],
	[/invalid email|unable to validate email/i, 'รูปแบบอีเมลไม่ถูกต้อง'],
	[/same password|different from the old/i, 'รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม'],
	[/failed to fetch|network/i, 'เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต'],
	[/payload too large|exceeded the maximum allowed size/i, 'ไฟล์มีขนาดใหญ่เกินกำหนด'],
	[/duplicate key/i, 'มีข้อมูลนี้อยู่แล้ว'],
	[/^not allowed$/i, 'คุณไม่มีสิทธิ์ทำรายการนี้'],
	[/session is closed/i, 'รอบเช็คชื่อนี้ปิดแล้ว']
];

/** Turn a Supabase/PostgREST error into a message fit for a toast. */
export function errorMessage(e: unknown): string {
	if (!e) return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
	if (typeof e === 'string') return e;
	if (typeof e === 'object' && 'message' in e && typeof e.message === 'string') {
		if (e.message.includes('row-level security')) return 'คุณไม่มีสิทธิ์ทำรายการนี้';
		const known = KNOWN_ERRORS.find(([pattern]) => pattern.test((e as { message: string }).message));
		return known ? known[1] : e.message;
	}
	return 'เกิดข้อผิดพลาด กรุณาลองใหม่';
}

/** Only allow same-site relative redirects (prevents open-redirects via ?next=). */
export function safeNext(next: string | null | undefined, fallback = '/home') {
	if (!next || !next.startsWith('/') || next.startsWith('//')) return fallback;
	return next;
}
