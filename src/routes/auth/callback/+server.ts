import { redirect } from '@sveltejs/kit';
import { safeNext } from '#lib/utils.ts';
import type { RequestHandler } from './$types';

/** Landing point for email confirmation / password reset links (PKCE code exchange). */
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code');
	const next = safeNext(url.searchParams.get('next'));
	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, next);
	}
	redirect(303, '/login?error=link_expired');
};
