import { error } from '@sveltejs/kit';
import { PROFILE_LITE } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:content');
	const { supabase, user, isStaff } = await parent();

	const { data: content } = await supabase
		.from('contents')
		.select('*')
		.eq('id', params.cid)
		.eq('term_id', params.id)
		.maybeSingle();
	if (!content) error(404, 'ไม่พบบทเรียนนี้');

	const [signed, progress, siblings, comments, audience] = await Promise.all([
		content.storage_path
			? supabase.storage.from('course-media').createSignedUrl(content.storage_path, 60 * 60 * 3)
			: Promise.resolve({ data: null }),
		supabase
			.from('video_progress')
			.select('watched_seconds, duration_seconds, last_position, completed_at')
			.eq('content_id', content.id)
			.eq('user_id', user!.id)
			.maybeSingle(),
		supabase.from('contents').select('id, title, type').eq('term_id', params.id).order('position').order('created_at'),
		supabase
			.from('comments')
			.select(`*, author:profiles(${PROFILE_LITE})`)
			.eq('content_id', content.id)
			.order('created_at'),
		isStaff
			? Promise.all([
					supabase
						.from('enrollments')
						.select(`student:profiles!enrollments_student_id_fkey(${PROFILE_LITE})`)
						.eq('term_id', params.id)
						.eq('status', 'approved'),
					supabase.from('content_views').select('user_id, first_viewed_at, last_viewed_at, view_count').eq('content_id', content.id),
					supabase.from('video_progress').select('user_id, watched_seconds, duration_seconds, completed_at, updated_at').eq('content_id', content.id)
				])
			: Promise.resolve(null)
	]);

	const idx = (siblings.data ?? []).findIndex((s) => s.id === content.id);

	let viewers = null;
	if (audience) {
		const [students, views, prog] = audience;
		const vMap = new Map((views.data ?? []).map((v) => [v.user_id, v]));
		const pMap = new Map((prog.data ?? []).map((p) => [p.user_id, p]));
		viewers = (students.data ?? [])
			.map((s) => s.student)
			.filter((s) => !!s)
			.map((s) => ({ student: s, view: vMap.get(s.id) ?? null, progress: pMap.get(s.id) ?? null }))
			.sort((a, b) => (b.progress?.watched_seconds ?? (b.view ? 0.5 : 0)) - (a.progress?.watched_seconds ?? (a.view ? 0.5 : 0)));
	}

	return {
		content,
		mediaUrl: signed.data?.signedUrl ?? null,
		myProgress: progress.data,
		prev: idx > 0 ? siblings.data![idx - 1] : null,
		next: idx >= 0 && idx < (siblings.data?.length ?? 0) - 1 ? siblings.data![idx + 1] : null,
		comments: comments.data ?? [],
		viewers
	};
};
