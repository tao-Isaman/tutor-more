import { requireRole, requireUser } from '#lib/guards.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, depends }) => {
	depends('app:admin');
	const { supabase, profile } = requireUser(await parent());
	requireRole(profile, ['admin']);

	const [{ data: users }, { data: contacts }, { data: subjects }] = await Promise.all([
		supabase.from('profiles').select('*').order('created_at', { ascending: false }),
		supabase.from('profile_contacts').select('user_id, email, phone'),
		supabase.from('subjects').select('id, title, code, subject_tutors(tutor_id)').order('title')
	]);

	return {
		users: users ?? [],
		contacts: Object.fromEntries((contacts ?? []).map((c) => [c.user_id, c])),
		subjects: subjects ?? []
	};
};
