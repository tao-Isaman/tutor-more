// Each rule is proven to fire on a bad example, then the repo must pass them all.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { RULES, show, routeOf, type Files } from './rules.ts';

const fx = (o: Record<string, string>): Files => new Map(Object.entries(o));

test('R1 fires for a new migration without a rollback', () => {
	const f = RULES.rollbackPairs(fx({ 'supabase/migrations/0013_x.sql': '', 'supabase/migrations/0014_y.sql': '', 'supabase/rollback/0014_y.sql': '', 'supabase/migrations/0003_old.sql': '' }));
	assert.deepEqual(f.map((x) => x.where), ['supabase/migrations/0013_x.sql']);
});

test('R2 fires for a table without row-level security', () => {
	const f = RULES.rlsOnEveryTable(fx({ 'supabase/migrations/0013_x.sql': 'create table public.notes (id int);\ncreate table tags (id int);\nalter table tags enable row level security;' }));
	assert.deepEqual(f.map((x) => x.problem), ['table notes has no row-level security']);
});

test('R3 fires for a service-role key or private env in src', () => {
	const f = RULES.noPrivilegedKeys(fx({ 'src/routes/x/+page.server.ts': "import { SECRET } from '$env/static/private';", 'src/lib/a.ts': 'createClient(url, key)' }));
	assert.deepEqual(f.map((x) => x.where), ['src/routes/x/+page.server.ts:1']);
});

test('R4 fires for an app page that is neither protected nor public on purpose', () => {
	const f = RULES.appRoutesProtected(fx({
		'src/hooks.server.ts': "const PROTECTED = ['/home', '/admin'];",
		'src/routes/(app)/home/+page.svelte': '', 'src/routes/(app)/explore/+page.svelte': '', 'src/routes/(app)/billing/+page.svelte': '',
	}));
	assert.deepEqual(f.map((x) => x.where), ['src/routes/(app)/billing']);
});

test('R5 fires when the admin page load does not check the role', () => {
	const f = RULES.rolePagesChecked(fx({
		'src/routes/(app)/admin/+page.ts': 'const { profile } = requireUser(await parent());',
		'src/routes/(app)/teach/+page.ts': "requireRole(profile, ['tutor', 'admin']);",
	}));
	assert.deepEqual(f.map((x) => x.where), ['src/routes/(app)/admin/+page.ts']);
});

test('R6 fires for a committed credential and never prints it', () => {
	const fake = 'sk_live_' + 'A1b2C3d4E5f6G7h8I9j0';
	const f = RULES.noSecrets(fx({ 'src/lib/pay.ts': `const key = "${fake}";` }));
	assert.equal(f.length, 1);
	assert.ok(!show(f[0]).includes(fake));
});

test('R7 fires both ways', () => {
	assert.equal(routeOf('src/routes/(app)/terms/[id]/feed/+page.svelte'), '/terms/[id]/feed');
	const f = RULES.featureMap(fx({ 'docs/FEATURES.md': '| a | `/` |\n| b | `/gone` |', 'src/routes/+page.svelte': '', 'src/routes/login/+page.svelte': '' }));
	assert.deepEqual(f.map((x) => x.where).sort(), ['/login', 'docs/FEATURES.md /gone']);
});

test('the repo passes every guardrail', () => {
	const root = new URL('../../../', import.meta.url);
	const paths = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' })
		.split('\n').filter((p) => p && !/\.(png|jpe?g|gif|pdf|woff2?|ttf|ico|webp|mp3|mp4|svg|wav)$/i.test(p));
	const files: Files = new Map();
	for (const p of paths) { try { files.set(p, readFileSync(new URL(p, root), 'utf8')); } catch { /* deleted */ } }
	const fails = Object.values(RULES).flatMap((r) => r(files));
	assert.equal(fails.length, 0, `\n${fails.map(show).join('\n\n')}\n\n(See docs/GUARDRAILS.md.)\n`);
});
