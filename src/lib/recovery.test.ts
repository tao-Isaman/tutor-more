import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RECOVERY_COOLDOWN_S, linkProblem, passwordProblem, recoveryRedirect, recoveryTarget, sendStudentResetLink } from './recovery.ts';

test('the e-mail link comes back to /auth/confirm on the same site and lands on /reset-password', () => {
	assert.equal(recoveryRedirect('https://tutormore-academy.vercel.app'), 'https://tutormore-academy.vercel.app/auth/confirm?next=%2Freset-password');
	assert.equal(recoveryRedirect('https://tutormore-academy-git-x-sut-meme.vercel.app/'), 'https://tutormore-academy-git-x-sut-meme.vercel.app/auth/confirm?next=%2Freset-password');
});

test('after /auth/confirm a recovery always ends on /reset-password; other links keep a safe next', () => {
	assert.equal(recoveryTarget('recovery', '/home'), '/reset-password');
	assert.equal(recoveryTarget('recovery', null), '/reset-password');
	assert.equal(recoveryTarget('signup', '/subjects'), '/subjects');
	assert.equal(recoveryTarget('signup', 'https://evil.example'), '/home'); // no open redirect
	assert.equal(recoveryTarget('email', '//evil.example'), '/home');
});

test('a new password needs 8+ characters and the same confirmation (as in settings)', () => {
	assert.equal(passwordProblem('', ''), 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
	assert.equal(passwordProblem('1234567', '1234567'), 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
	assert.equal(passwordProblem('12345678', '12345679'), 'รหัสผ่านไม่ตรงกัน');
	assert.equal(passwordProblem('12345678', '12345678'), null);
});

test('a dead link is explained, never shown as a raw error', () => {
	assert.equal(linkProblem('link_expired'), 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว (ลิงก์ใช้ได้ครั้งเดียว ภายใน 1 ชั่วโมง) ขอลิงก์ใหม่ได้ด้านล่าง');
	assert.equal(linkProblem('no_session'), 'เปิดหน้านี้จากลิงก์ในอีเมลเท่านั้น ถ้าลิงก์ใช้ไม่ได้ ขอลิงก์ใหม่ได้ด้านล่าง');
	assert.equal(linkProblem(null), null);
	assert.equal(linkProblem('something_else'), linkProblem('link_expired'));
});

test('one reset e-mail per minute from a page (the mailer allows 30 an hour for the whole site)', () => {
	assert.equal(RECOVERY_COOLDOWN_S, 60);
});

type Call = [string, unknown];
function fakeClient(rpcResult: { data: unknown; error: unknown }, mailError: unknown = null) {
	const calls: Call[] = [];
	return {
		calls,
		rpc: async (fn: string, args: unknown) => (calls.push([fn, args]), rpcResult),
		auth: { resetPasswordForEmail: async (email: string, opts: unknown) => (calls.push(['mail:' + email, opts]), { error: mailError }) }
	};
}

test('staff reset: the database checks and records first, then the e-mail goes to the student', async () => {
	const c = fakeClient({ data: 'student@example.com', error: null });
	assert.equal(await sendStudentResetLink(c, 'u1', 'https://site.example'), null);
	assert.deepEqual(c.calls, [
		['request_student_password_reset', { p_student: 'u1' }],
		['mail:student@example.com', { redirectTo: 'https://site.example/auth/confirm?next=%2Freset-password' }]
	]);
});

test('staff reset refused by the database: no e-mail is sent and the reason is shown', async () => {
	const c = fakeClient({ data: null, error: { message: 'not a student of your terms' } });
	assert.equal(await sendStudentResetLink(c, 'u2', 'https://site.example'), 'นักเรียนคนนี้ไม่ได้อยู่ในคลาสของคุณ');
	assert.equal(c.calls.length, 1);
	const wait = fakeClient({ data: null, error: { message: 'a reset link was just sent to this student; wait a minute' } });
	assert.equal(await sendStudentResetLink(wait, 'u3', 'https://site.example'), 'เพิ่งส่งลิงก์ให้นักเรียนคนนี้ไป รอสัก 1 นาทีแล้วค่อยส่งใหม่');
});
