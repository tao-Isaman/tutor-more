import { error } from '@sveltejs/kit';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:students');
	const { supabase, isStaff } = await parent();
	if (!isStaff) error(403, 'Tutors only');

	const { data: rows } = await supabase
		.from('enrollments')
		.select(`*, student:profiles!enrollments_student_id_fkey(${PROFILE_LITE}, education_level, school)`)
		.eq('term_id', params.id)
		.order('requested_at');

	const ids = (rows ?? []).map((r) => r.student_id);
	const [{ data: contacts }, { data: sessions }, { data: records }] = await Promise.all([
		ids.length ? supabase.from('profile_contacts').select('*').in('user_id', ids) : Promise.resolve({ data: [] }),
		supabase.from('attendance_sessions').select('id').eq('term_id', params.id),
		supabase.from('attendance_records').select('student_id, session:attendance_sessions!inner(term_id)').eq('session.term_id', params.id)
	]);

	const attended = new Map<string, number>();
	for (const r of records ?? []) attended.set(r.student_id, (attended.get(r.student_id) ?? 0) + 1);

	return {
		enrollments: rows ?? [],
		contacts: Object.fromEntries((contacts ?? []).map((c) => [c.user_id, c])),
		sessionCount: sessions?.length ?? 0,
		attended: Object.fromEntries(attended)
	};
};
