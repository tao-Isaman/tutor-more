import { requireUser } from '#lib/guards.ts';
import { isStaffRole } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase, user, profile } = requireUser(await parent());
	const staff = isStaffRole(profile.role);

	const [enrollments, teaching, announcements, progress, pending, openSessions] = await Promise.all([
		supabase
			.from('enrollments')
			.select(
				'id, status, requested_at, term:terms(id, name, start_date, end_date, subject:subjects(id, code, title, title_th, cover_url))'
			)
			.eq('student_id', user.id)
			.order('requested_at', { ascending: false }),
		staff
			? profile.role === 'admin'
				? supabase.from('terms').select('id, name, is_published, subject:subjects(id, title, code)').order('created_at', { ascending: false })
				: supabase
						.from('subject_tutors')
						.select('subject:subjects(id, title, code, terms(id, name, is_published))')
						.eq('tutor_id', user.id)
			: Promise.resolve({ data: null }),
		supabase
			.from('announcements')
			.select('id, title, created_at, is_pinned, term:terms(id, name, subject:subjects(title))')
			.order('created_at', { ascending: false })
			.limit(5),
		supabase
			.from('video_progress')
			.select('content_id, watched_seconds, duration_seconds, last_position, updated_at, completed_at, content:contents(id, title, term_id)')
			.eq('user_id', user.id)
			.is('completed_at', null)
			.order('updated_at', { ascending: false })
			.limit(3),
		staff
			? supabase.from('enrollments').select('id, term_id', { count: 'exact', head: true }).eq('status', 'pending')
			: Promise.resolve({ count: 0 }),
		supabase
			.from('attendance_sessions')
			.select('id, title, term_id, started_at, term:terms(name, subject:subjects(title))')
			.eq('is_open', true)
			.order('started_at', { ascending: false })
	]);

	// Normalise "terms I teach" for both admins and tutors
	type TeachTerm = { id: string; name: string; is_published: boolean; subject: { id: string; title: string; code: string | null } };
	let teachTerms: TeachTerm[] = [];
	if (staff && teaching.data) {
		if (profile.role === 'admin') {
			teachTerms = (teaching.data as unknown as TeachTerm[]).filter((t) => t.subject);
		} else {
			type Row = { subject: { id: string; title: string; code: string | null; terms: Omit<TeachTerm, 'subject'>[] } | null };
			teachTerms = (teaching.data as unknown as Row[]).flatMap((r) =>
				r.subject ? r.subject.terms.map((t) => ({ ...t, subject: { id: r.subject!.id, title: r.subject!.title, code: r.subject!.code } })) : []
			);
		}
	}

	return {
		enrollments: enrollments.data ?? [],
		teachTerms,
		announcements: announcements.data ?? [],
		progress: progress.data ?? [],
		pendingCount: pending.count ?? 0,
		openSessions: openSessions.data ?? []
	};
};
