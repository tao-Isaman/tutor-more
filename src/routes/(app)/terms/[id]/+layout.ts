import { error, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/guards.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ parent, params, depends }) => {
	depends('app:term');
	const { supabase } = requireUser(await parent());

	const [{ data: term }, { data: isStaff }, { data: isStudent }] = await Promise.all([
		supabase
			.from('terms')
			.select('*, subject:subjects(id, code, title, title_th, cover_url, subject_tutors(tutor_id))')
			.eq('id', params.id)
			.maybeSingle(),
		supabase.rpc('is_term_staff', { p_term_id: params.id }),
		supabase.rpc('is_term_student', { p_term_id: params.id })
	]);

	if (!term || !term.subject) error(404, 'ไม่พบคลาสนี้');
	// Not approved yet → back to the public subject page to request/await approval
	if (!isStaff && !isStudent) redirect(303, `/subjects/${term.subject.id}`);

	return { term, subject: term.subject, isStaff: !!isStaff };
};
