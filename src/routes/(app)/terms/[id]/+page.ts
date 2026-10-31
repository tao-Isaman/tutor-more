import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:contents');
	const { supabase, user, isStaff } = await parent();

	const [contents, views, progress] = await Promise.all([
		supabase.from('contents').select('*').eq('term_id', params.id).order('position').order('created_at'),
		isStaff ? Promise.resolve({ data: [] }) : supabase.from('content_views').select('content_id').eq('user_id', user!.id),
		isStaff
			? Promise.resolve({ data: [] })
			: supabase.from('video_progress').select('content_id, watched_seconds, duration_seconds, completed_at').eq('user_id', user!.id)
	]);

	return {
		contents: contents.data ?? [],
		viewed: new Set((views.data ?? []).map((v) => v.content_id)),
		progress: Object.fromEntries((progress.data ?? []).map((p) => [p.content_id, p]))
	};
};
