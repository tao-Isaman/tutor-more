import { createServerClient } from '@supabase/ssr';
import { redirect } from '@sveltejs/kit';
import { sequence, type Handle } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_PUBLISHABLE_KEY, PUBLIC_SUPABASE_URL } from '$app/env/public';
import type { Database } from '#lib/database.types.ts';

const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient<Database>(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * getSession() reads the cookie without verifying it, so the JWT is validated with getUser()
	 * before anything on the server trusts it.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) return { session: null, user: null };

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) return { session: null, user: null };

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range' || name === 'x-supabase-api-version'
	});
};

/** Routes that require a signed-in user. Catalog pages (/explore, /subjects) stay public. */
const PROTECTED = ['/home', '/terms', '/checkin', '/messages', '/teach', '/admin', '/profile', '/settings'];

const authGuard: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	const path = event.url.pathname;
	if (!session && PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
		const next = path + event.url.search;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	if (session && (path === '/login' || path === '/register')) {
		redirect(303, '/home');
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, authGuard);
