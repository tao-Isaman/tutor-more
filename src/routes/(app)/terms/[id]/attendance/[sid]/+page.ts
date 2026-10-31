import { error } from '@sveltejs/kit';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:session');
	const { supabase, isStaff } = await parent();
	if (!isStaff) error(403, 'เฉพาะติวเตอร์เท่านั้นที่เปิดหน้าเช็คชื่อได้');

	const [{ data: session }, { data: students }, { data: records }] = await Promise.all([
		supabase.from('attendance_sessions').select('*').eq('id', params.sid).eq('term_id', params.id).maybeSingle(),
		supabase
			.from('enrollments')
			.select(`student:profiles!enrollments_student_id_fkey(${PROFILE_LITE})`)
			.eq('term_id', params.id)
			.eq('status', 'approved'),
		supabase.from('attendance_records').select('*').eq('session_id', params.sid)
	]);
	if (!session) error(404, 'ไม่พบรอบเช็คชื่อนี้');

	return {
		session,
		students: (students ?? []).map((s) => s.student).filter((s) => !!s),
		records: records ?? []
	};
};
