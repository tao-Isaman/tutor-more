import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:attendance');
	const { supabase, isStaff, user } = await parent();

	const [{ data: sessions }, { count: studentCount }, mine] = await Promise.all([
		supabase
			.from('attendance_sessions')
			.select('*, records:attendance_records(count)')
			.eq('term_id', params.id)
			.order('started_at', { ascending: false }),
		supabase.from('enrollments').select('id', { count: 'exact', head: true }).eq('term_id', params.id).eq('status', 'approved'),
		isStaff
			? Promise.resolve({ data: [] })
			: supabase.from('attendance_records').select('session_id, checked_in_at, method').eq('student_id', user!.id)
	]);

	return {
		sessions: (sessions ?? []).map((s) => ({ ...s, present: (s.records as unknown as { count: number }[])[0]?.count ?? 0 })),
		studentCount: studentCount ?? 0,
		mine: Object.fromEntries((mine.data ?? []).map((r) => [r.session_id, r]))
	};
};
