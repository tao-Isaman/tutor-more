import { redirect } from '@sveltejs/kit';
import type { EmailOtpType } from '@supabase/supabase-js';
import { recoveryTarget } from '#lib/recovery.ts';
import type { RequestHandler } from './$types';

/**
 * Landing point of the password-reset e-mail. The link carries a token_hash that is verified here on the server, so it
 * works on whichever device opens it (the PKCE ?code= link only worked in the browser that asked for the e-mail).
 * A ?code= link (sent before the template changed) is still accepted. Dead links go to /forgot-password with a reason.
 */
export const GET: RequestHandler = async ({ url, locals: { supabase } }) => {
	const tokenHash = url.searchParams.get('token_hash');
	const type = url.searchParams.get('type') as EmailOtpType | null;
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next');

	if (tokenHash && type) {
		const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
		if (!error) redirect(303, recoveryTarget(type, next));
	} else if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) redirect(303, recoveryTarget(next === '/reset-password' ? 'recovery' : null, next));
	}
	redirect(303, '/forgot-password?error=link_expired');
};
