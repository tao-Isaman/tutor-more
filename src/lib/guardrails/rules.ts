// Guardrails: rules the team was corrected on, turned into checks. Each rule is a pure
// function over the repo's files and returns failures shaped "✗ where: problem → supported path".
// Run by guardrails.test.ts in `npm test`. Rows and gaps: docs/GUARDRAILS.md.

export type Files = Map<string, string>; // repo-relative path -> content
export type Failure = { rule: string; where: string; problem: string; fix: string };

export const show = (f: Failure) => `✗ [${f.rule}] ${f.where}: ${f.problem}\n  → ${f.fix}`;

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;
const isCode = (p: string) => /^src\/.*\.(ts|svelte|js)$/.test(p) && !p.includes(".test.") && !p.startsWith("src/lib/guardrails/");

/** Known violations, recorded as Gap in docs/GUARDRAILS.md. Remove an entry when it is fixed. */
export const ALLOW = {
  rollbackUpTo: 12, // 0001–0012 were written before the rollback rule
  rls: new Set<string>(),
};

/** R1: every migration after 0012 has supabase/rollback/<same name>. */
export function rollbackPairs(files: Files): Failure[] {
  const names = (dir: string) => [...files.keys()].filter((p) => p.startsWith(dir)).map((p) => p.slice(dir.length));
  const rollbacks = new Set(names("supabase/rollback/"));
  return names("supabase/migrations/")
    .filter((n) => /^\d{4}_.*\.sql$/.test(n) && Number(n.slice(0, 4)) > ALLOW.rollbackUpTo && !rollbacks.has(n))
    .map((n) => ({ rule: "R1 rollback", where: `supabase/migrations/${n}`, problem: "no rollback script",
      fix: `add supabase/rollback/${n} that undoes it (drop what it creates, restore what it changes)` }));
}

/** R2: every table the migrations create has row-level security turned on. */
export function rlsOnEveryTable(files: Files): Failure[] {
  const sql = [...files].filter(([p]) => p.startsWith("supabase/migrations/") && p.endsWith(".sql"));
  const all = sql.map(([, s]) => s.toLowerCase()).join("\n");
  const out: Failure[] = [];
  for (const [path, text] of sql) {
    for (const m of text.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?\s*\(/gi)) {
      const t = m[1].toLowerCase();
      const on = new RegExp(`alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?(?:public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`);
      if (!on.test(all) && !ALLOW.rls.has(t)) out.push({
        rule: "R2 rls", where: `${path}:${lineOf(text, m.index!)}`, problem: `table ${t} has no row-level security`,
        fix: `add "alter table public.${t} enable row level security;" and policies that scope rows to the member's organisation`,
      });
    }
  }
  return out;
}

/** R3: the app runs as the signed-in user under RLS: no service-role key, no private env in src/. */
export function noPrivilegedKeys(files: Files): Failure[] {
  const out: Failure[] = [];
  for (const [path, text] of files) {
    if (!isCode(path)) continue;
    const m = /service_role|SERVICE_ROLE|sb_secret_|\$env\/(static|dynamic)\/private/.exec(text);
    if (m) out.push({ rule: "R3 keys", where: `${path}:${lineOf(text, m.index)}`, problem: `uses ${m[0]}`,
      fix: "do it as the user under RLS; privileged work goes in a SECURITY DEFINER function in a migration" });
  }
  return out;
}

/** Catalog pages that are public on purpose (hooks.server.ts says so). */
export const PUBLIC_IN_APP = new Set(["explore", "subjects"]);

/** R4: every page under src/routes/(app) is in hooks.server.ts PROTECTED, or public on purpose. */
export function appRoutesProtected(files: Files): Failure[] {
  const hooks = files.get("src/hooks.server.ts") ?? "";
  const list = /const PROTECTED\s*=\s*\[([^\]]*)\]/.exec(hooks);
  if (!list) return [{ rule: "R4 protected", where: "src/hooks.server.ts", problem: "no PROTECTED list found", fix: "keep the signed-in routes in `const PROTECTED = [...]`" }];
  const protectedTops = new Set([...list[1].matchAll(/['"]\/([^'"/]+)['"]/g)].map((m) => m[1]));
  const out: Failure[] = [];
  const tops = new Set([...files.keys()].map((p) => /^src\/routes\/\(app\)\/([^/]+)\//.exec(p)?.[1]).filter(Boolean) as string[]);
  for (const t of tops) if (!protectedTops.has(t) && !PUBLIC_IN_APP.has(t)) out.push({ rule: "R4 protected", where: `src/routes/(app)/${t}`,
    problem: "a signed-out visitor can open it", fix: `add '/${t}' to PROTECTED in src/hooks.server.ts (or to PUBLIC_IN_APP in the rule if it is a public catalog page)` });
  return out;
}

const ROLE_PAGES: Record<string, string> = { "src/routes/(app)/admin/+page.ts": "'admin'", "src/routes/(app)/teach/+page.ts": "'tutor'" };

/** R5: the admin and teaching pages check the role in their load, not only in the UI. */
export function rolePagesChecked(files: Files): Failure[] {
  return Object.entries(ROLE_PAGES).filter(([p, role]) => {
    const t = files.get(p);
    return !t || !new RegExp(`requireRole\\([^)]*${role}`).test(t);
  }).map(([p, role]) => ({ rule: "R5 role", where: p, problem: `load does not call requireRole(profile, [${role}, ...])`,
    fix: "call requireUser(await parent()) then requireRole(profile, [...]) from #lib/guards.ts" }));
}

// Shapes of real credentials. Values are never printed, only where they are.
const SECRET_SHAPES: [string, RegExp][] = [
  ["Stripe live key", /\b[sr]k_live_[A-Za-z0-9]{16,}/],
  ["Supabase secret key", /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ["JWT", /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/],
  ["Google API key", /\bAIza[0-9A-Za-z_-]{35}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{36,}\b/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}/],
  ["Anthropic key", /\bsk-ant-[A-Za-z0-9_-]{32,}/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

/** R6: no credential is committed. */
export function noSecrets(files: Files): Failure[] {
  const out: Failure[] = [];
  for (const [path, text] of files) {
    if (path.startsWith("src/lib/guardrails/") || path.startsWith(".claude/")) continue; // the patterns above, test fixtures, tool skills
    for (const [what, re] of SECRET_SHAPES) {
      const m = re.exec(text);
      if (m) out.push({ rule: "R6 secret", where: `${path}:${lineOf(text, m.index)}`, problem: `looks like a ${what} (value not shown)`,
        fix: "remove it, rotate it, and read it at run time from the environment (Vercel env / .env.local, which git ignores)" });
    }
  }
  return out;
}

/** The URL a SvelteKit route file serves: "(group)" folders vanish, "[id]" stays. */
export function routeOf(path: string): string {
  const parts = path.replace(/^src\/routes\//, "").split("/").slice(0, -1).filter((p) => !/^\(.*\)$/.test(p));
  return "/" + parts.join("/");
}

/** R7: docs/FEATURES.md names every page and endpoint, and nothing that is gone. */
export function featureMap(files: Files): Failure[] {
  const map = files.get("docs/FEATURES.md");
  if (!map) return [{ rule: "R7 features", where: "docs/FEATURES.md", problem: "missing", fix: "add the feature map (see docs/GUARDRAILS.md)" }];
  const listed = new Set([...map.matchAll(/`(\/[^`\s]*)`/g)].map((m) => m[1]));
  const routes = new Set([...files.keys()].filter((p) => /^src\/routes\/(.*\/)?\+(page\.svelte|server\.ts)$/.test(p)).map(routeOf));
  const out: Failure[] = [];
  for (const r of routes) if (!listed.has(r)) out.push({ rule: "R7 features", where: r, problem: "route is not in the feature map",
    fix: `add a row for \`${r}\` to docs/FEATURES.md` });
  for (const r of listed) if (!routes.has(r)) out.push({ rule: "R7 features", where: `docs/FEATURES.md ${r}`, problem: "the map lists a route that does not exist",
    fix: "remove or rename the row so the map matches src/routes" });
  return out;
}

export const RULES = { rollbackPairs, rlsOnEveryTable, noPrivilegedKeys, appRoutesProtected, rolePagesChecked, noSecrets, featureMap };
