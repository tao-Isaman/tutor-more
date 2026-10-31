import { requireRole, requireUser } from '#lib/guards.ts';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:teach');
	const { supabase, user, profile } = requireUser(await parent());
	requireRole(profile, ['tutor', 'admin']);

	const subjectsQuery =
		profile.role === 'admin'
			? supabase.from('subjects').select('*, terms(id, name, is_published, start_date, capacity)').order('created_at', { ascending: false })
			: supabase
					.from('subjects')
					.select('*, subject_tutors!inner(tutor_id), terms(id, name, is_published, start_date, capacity)')
					.eq('subject_tutors.tutor_id', user.id)
					.order('created_at', { ascending: false });

	const [{ data: subjects }, { data: pending }] = await Promise.all([
		subjectsQuery,
		supabase
			.from('enrollments')
			.select(`id, message, requested_at, term_id, student:profiles!enrollments_student_id_fkey(${PROFILE_LITE}), term:terms(name, subject:subjects(title))`)
			.eq('status', 'pending')
			.neq('student_id', user.id)
			.order('requested_at')
	]);

	return { subjects: subjects ?? [], pending: pending ?? [] };
};
