import { error } from '@sveltejs/kit';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:subject');
	const { supabase, user } = await parent();

	const { data: subject } = await supabase
		.from('subjects')
		.select(`*, terms(*), subject_tutors(tutor:profiles(${PROFILE_LITE}, bio, school))`)
		.eq('id', params.id)
		.maybeSingle();
	if (!subject) error(404, 'Subject not found');

	const termIds = subject.terms.map((t) => t.id);
	const [seats, mine, staff] = await Promise.all([
		termIds.length ? supabase.rpc('term_seat_counts', { p_term_ids: termIds }) : Promise.resolve({ data: [] }),
		user && termIds.length
			? supabase.from('enrollments').select('term_id, status').eq('student_id', user.id).in('term_id', termIds)
			: Promise.resolve({ data: [] }),
		user ? supabase.rpc('is_admin') : Promise.resolve({ data: false })
	]);

	const isStaff = !!staff.data || (!!user && subject.subject_tutors.some((st) => st.tutor?.id === user.id));

	subject.terms.sort((a, b) => (b.start_date ?? b.created_at).localeCompare(a.start_date ?? a.created_at));

	return {
		subject,
		seats: Object.fromEntries((seats.data ?? []).map((s) => [s.term_id, s])),
		myStatus: Object.fromEntries((mine.data ?? []).map((e) => [e.term_id, e.status])) as Record<string, string>,
		isStaff
	};
};
