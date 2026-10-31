import { error } from '@sveltejs/kit';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params }) => {
	const { supabase, isStaff } = await parent();
	if (!isStaff) error(403, 'Tutors only');

	const [{ data: report, error: err }, { data: contents }, { data: students }] = await Promise.all([
		supabase.rpc('term_content_report', { p_term_id: params.id }),
		supabase.from('contents').select('id, title, type, duration_seconds, section').eq('term_id', params.id).order('position').order('created_at'),
		supabase
			.from('enrollments')
			.select(`student:profiles!enrollments_student_id_fkey(${PROFILE_LITE})`)
			.eq('term_id', params.id)
			.eq('status', 'approved')
	]);
	if (err) error(500, err.message);

	return {
		report: report ?? [],
		contents: contents ?? [],
		students: (students ?? []).map((s) => s.student).filter((s) => !!s)
	};
};
