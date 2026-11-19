/**
 * Password recovery, the parts with rules (pages and the /auth/confirm route stay thin).
 *
 * Flow: /forgot-password sends the e-mail (resetPasswordForEmail) → the link in it goes to /auth/confirm with a
 * token_hash, verified on the server, so it works on any device (the old ?code= link only worked in the browser that
 * asked for it — a code verifier lives there) → /reset-password sets the new password → into the app.
 */
import { safeNext } from './utils.ts';

/** One reset e-mail per minute from a page; the project's mailer allows 30 an hour for the whole site. */
export const RECOVERY_COOLDOWN_S = 60;

/** redirectTo for resetPasswordForEmail. The recovery e-mail template links to
 *  {{ .SiteURL }}/auth/confirm?token_hash=…&type=recovery&next=/reset-password and does not use it (so a reset sent
 *  from the Supabase dashboard, with no redirectTo, works too); it still matters if the template is ever reverted
 *  to {{ .ConfirmationURL }}, where Supabase redirects here with ?code=. */
export function recoveryRedirect(origin: string): string {
	return `${origin.replace(/\/+$/, '')}/auth/confirm?next=${encodeURIComponent('/reset-password')}`;
}

/** Where /auth/confirm sends a verified link: a recovery always to /reset-password, anything else to a safe next. */
export function recoveryTarget(type: string | null, next: string | null): string {
	return type === 'recovery' ? '/reset-password' : safeNext(next);
}

/** Same rule as changing the password in settings: 8+ characters, typed twice the same. */
export function passwordProblem(next: string, confirm: string): string | null {
	if (next.length < 8) return 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
	if (next !== confirm) return 'รหัสผ่านไม่ตรงกัน';
	return null;
}

/** ?error= on /forgot-password and /reset-password, in words a student understands. */
export function linkProblem(code: string | null): string | null {
	if (!code) return null;
	if (code === 'no_session') return 'เปิดหน้านี้จากลิงก์ในอีเมลเท่านั้น ถ้าลิงก์ใช้ไม่ได้ ขอลิงก์ใหม่ได้ด้านล่าง';
	return 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว (ลิงก์ใช้ได้ครั้งเดียว ภายใน 1 ชั่วโมง) ขอลิงก์ใหม่ได้ด้านล่าง';
}

/** What sendStudentResetLink needs from a Supabase client (the signed-in staff member's own client, under RLS). */
export interface ResetClient {
	rpc(fn: 'request_student_password_reset', args: { p_student: string }): PromiseLike<{ data: unknown; error: unknown }>;
	auth: { resetPasswordForEmail(email: string, opts: { redirectTo: string }): PromiseLike<{ error: unknown }> };
}

const STAFF_RESET_ERRORS: [RegExp, string][] = [
	[/only staff/, 'เฉพาะแอดมินหรือติวเตอร์เท่านั้น'],
	[/not a student of your terms/, 'นักเรียนคนนี้ไม่ได้อยู่ในคลาสของคุณ'],
	[/wait a minute/, 'เพิ่งส่งลิงก์ให้นักเรียนคนนี้ไป รอสัก 1 นาทีแล้วค่อยส่งใหม่'],
	[/your own account/, 'บัญชีของตัวเองให้ใช้ "ลืมรหัสผ่าน?" ที่หน้าเข้าสู่ระบบ'],
	[/no e-mail/, 'บัญชีนี้ไม่มีอีเมล']
];

/**
 * Staff sends a student a reset link. The database decides who may (request_student_password_reset: role, own
 * students only, one a minute) and records it before anything is sent; the e-mail then goes to the student's own
 * mailbox. Returns null when sent, otherwise a message for the staff member.
 */
export async function sendStudentResetLink(client: ResetClient, studentId: string, origin: string): Promise<string | null> {
	const { data: email, error } = await client.rpc('request_student_password_reset', { p_student: studentId });
	if (error || typeof email !== 'string') {
		const msg = (error as { message?: string } | null)?.message ?? '';
		return STAFF_RESET_ERRORS.find(([re]) => re.test(msg))?.[1] ?? 'ส่งลิงก์ไม่สำเร็จ กรุณาลองใหม่';
	}
	const { error: mailError } = await client.auth.resetPasswordForEmail(email, { redirectTo: recoveryRedirect(origin) });
	return mailError ? 'บันทึกคำขอแล้ว แต่ส่งอีเมลไม่สำเร็จ (ระบบส่งเมลอาจเต็มโควตา) ลองใหม่ภายหลัง' : null;
}
