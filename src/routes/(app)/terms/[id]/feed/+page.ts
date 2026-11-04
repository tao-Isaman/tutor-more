import { error } from '@sveltejs/kit';
import { loadFeedPage } from '#lib/feed.ts';
import { errorMessage } from '#lib/utils.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent, params, depends }) => {
	depends('app:feed');
	const { supabase, user } = await parent();
	try {
		return await loadFeedPage(supabase, params.id, user!.id);
	} catch (e) {
		error(500, errorMessage(e));
	}
};
