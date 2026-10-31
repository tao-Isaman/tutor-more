import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { supabase } = await parent();
	const { data: subjects } = await supabase
		.from('subjects')
		.select('id, code, title, title_th, description, cover_url, terms(id, name, price, is_published, start_date)')
		.eq('is_published', true)
		.order('created_at', { ascending: false })
		.limit(6);
	return { subjects: subjects ?? [] };
};
