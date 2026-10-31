import { requireUser } from '#lib/guards.ts';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:conversations');
	const { supabase, user, profile } = requireUser(await parent());

	const [{ data: conversations }, { data: unread }, contacts] = await Promise.all([
		supabase
			.from('conversations')
			.select(
				`*, student:profiles!conversations_student_id_fkey(${PROFILE_LITE}), tutor:profiles!conversations_tutor_id_fkey(${PROFILE_LITE})`
			)
			.order('last_message_at', { ascending: false }),
		supabase.from('messages').select('conversation_id').is('read_at', null).neq('sender_id', user.id),
		// Students can start a chat with the tutors of classes they applied to
		profile.role === 'student'
			? supabase
					.from('enrollments')
					.select(`term:terms(subject:subjects(title, subject_tutors(tutor:profiles(${PROFILE_LITE}))))`)
					.eq('student_id', user.id)
			: Promise.resolve({ data: [] })
	]);

	const unreadBy: Record<string, number> = {};
	for (const m of unread ?? []) unreadBy[m.conversation_id] = (unreadBy[m.conversation_id] ?? 0) + 1;

	type Tutor = { id: string; first_name: string; last_name: string; nickname: string; avatar_url: string | null; role: 'admin' | 'tutor' | 'student' };
	const tutorList = new Map<string, { tutor: Tutor; subjects: string[] }>();
	for (const e of contacts.data ?? []) {
		const subj = e.term?.subject;
		for (const st of subj?.subject_tutors ?? []) {
			if (!st.tutor) continue;
			const entry = tutorList.get(st.tutor.id) ?? { tutor: st.tutor, subjects: [] };
			if (subj && !entry.subjects.includes(subj.title)) entry.subjects.push(subj.title);
			tutorList.set(st.tutor.id, entry);
		}
	}

	return {
		conversations: (conversations ?? []).map((c) => ({
			...c,
			other: c.student_id === user.id ? c.tutor : c.student,
			unread: unreadBy[c.id] ?? 0
		})),
		tutors: [...tutorList.values()]
	};
};
