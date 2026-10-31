import { error, redirect } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';
import type { Profile } from './utils.ts';

/** Use in universal loads under protected routes (hooks already redirect, this narrows types). */
export function requireUser<T extends { user: User | null; profile: Profile | null }>(p: T) {
	if (!p.user || !p.profile) redirect(303, '/login');
	return p as T & { user: User; profile: Profile };
}

export function requireRole(profile: Profile, roles: Profile['role'][]) {
	if (!roles.includes(profile.role)) error(403, 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้');
}
