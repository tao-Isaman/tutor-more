import { requireUser } from '#lib/guards.ts';
import { isStaffRole } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase, user, profile } = requireUser(await parent());
	const staff = isStaffRole(profile.role);

	const [contacts, enrollments, attendance, completed, questions, teaching] = await Promise.all([
		supabase.from('profile_contacts').select('*').eq('user_id', user.id).maybeSingle(),
		supabase
			.from('enrollments')
			.select('id, status, term:terms(id, name, subject:subjects(id, title, title_th, code))')
			.eq('student_id', user.id)
			.eq('status', 'approved'),
		supabase.from('attendance_records').select('session_id', { count: 'exact', head: true }).eq('student_id', user.id),
		supabase.from('video_progress').select('content_id', { count: 'exact', head: true }).eq('user_id', user.id).not('completed_at', 'is', null),
		supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
		staff
			? supabase.from('subject_tutors').select('subject:subjects(id, title, title_th, code, terms(id))').eq('tutor_id', user.id)
			: Promise.resolve({ data: [] })
	]);

	const subjects = (teaching.data ?? []).map((t) => t.subject).filter((s) => !!s);
	const termIds = subjects.flatMap((s) => s.terms.map((t) => t.id));
	const studentCount = termIds.length
		? (await supabase.from('enrollments').select('student_id', { count: 'exact', head: true }).in('term_id', termIds).eq('status', 'approved')).count
		: 0;

	return {
		contacts: contacts.data,
		classes: (enrollments.data ?? []).filter((e) => e.term),
		stats: {
			attended: attendance.count ?? 0,
			completed: completed.count ?? 0,
			questions: questions.count ?? 0,
			subjects: subjects.length,
			students: studentCount ?? 0
		},
		subjects
	};
};
