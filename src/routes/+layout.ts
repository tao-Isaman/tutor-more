import { createBrowserClient, createServerClient, isBrowser } from '@supabase/ssr';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import type { Database } from '#lib/database.types.ts';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ data, depends, fetch }) => {
	depends('supabase:auth');

	const supabase = isBrowser()
		? createBrowserClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: { fetch }
			})
		: createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
				global: { fetch },
				cookies: { getAll: () => data.cookies }
			});

	// Session was already verified by hooks.server.ts (safeGetSession); safe to read here.
	const {
		data: { session }
	} = await supabase.auth.getSession();
	const user = session?.user ?? null;

	const profile = user
		? ((await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()).data ?? null)
		: null;

	return { supabase, session, user, profile };
};
