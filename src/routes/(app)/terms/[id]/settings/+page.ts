import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ parent }) => {
	const { isStaff } = await parent();
	if (!isStaff) error(403, 'เฉพาะติวเตอร์เท่านั้น');
};
