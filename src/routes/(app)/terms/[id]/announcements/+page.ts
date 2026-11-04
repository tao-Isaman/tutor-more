import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:announcements');
	const { supabase, isStaff, user } = await parent();

	const [{ data: items }, students] = await Promise.all([
		supabase
			.from('announcements')
			.select(`*, author:profiles!announcements_author_id_fkey(${PROFILE_LITE}), reads:announcement_reads(user_id, read_at)`)
			.eq('term_id', params.id)
			.order('is_pinned', { ascending: false })
			.order('created_at', { ascending: false }),
		isStaff
			? supabase
					.from('enrollments')
					.select(`student:profiles!enrollments_student_id_fkey(${PROFILE_LITE})`)
					.eq('term_id', params.id)
					.eq('status', 'approved')
			: Promise.resolve({ data: [] })
	]);

	return {
		announcements: items ?? [],
		students: (students.data ?? []).map((s) => s.student).filter((s) => !!s),
		userId: user!.id
	};
};
