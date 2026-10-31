import { requireUser } from '#lib/guards.ts';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase, user } = requireUser(await parent());
	const { data: contacts } = await supabase.from('profile_contacts').select('*').eq('user_id', user.id).maybeSingle();
	return { contacts };
};
