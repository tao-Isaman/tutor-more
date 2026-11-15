# Guardrails

Rules this project was corrected on, as checks that run in `npm test`. A check fails with
`✗ [rule] where: problem → the supported way`. When someone corrects the team, the fix comes
with a new row here and a check, not a new line of prose.

Status: **Enforced** = a check stops it. **Tested** = a test proves the check fires.
**Gap** = known hole or allow-listed violation.

## Checks (`src/lib/guardrails/rules.ts`, run by `src/lib/guardrails/guardrails.test.ts`)

| Rule | What it stops | Status | Added |
|---|---|---|---|
| R1 rollback | a migration after `0012` without `supabase/rollback/<same name>` | Enforced · Tested | 2026-11-16, team rule "prepare rollback before any prod DB change" |
| R2 rls | a `create table` with no `enable row level security` in the migrations (24 tables today, all on) | Enforced · Tested | 2026-11-16 |
| R3 keys | a service-role key or `$env/*/private` in `src/`: the app runs as the user under RLS | Enforced · Tested | 2026-11-16 |
| R4 protected | a page under `src/routes/(app)` that is not in `PROTECTED` (`src/hooks.server.ts`) and not a public catalog page (`/explore`, `/subjects`) | Enforced · Tested | 2026-11-16 |
| R5 role | the `/admin` or `/teach` load not calling `requireRole(...)` | Enforced · Tested | 2026-11-16 |
| R6 secret | a committed credential. The value is never printed | Enforced · Tested | 2026-11-16, team rule "no keys in repos" |
| R7 features | a page or endpoint missing from `docs/FEATURES.md`, or a row whose route is gone | Enforced · Tested | 2026-11-16, feature map |

## Allow-listed today (Gap)

| Gap | Why it is allowed | To close it |
|---|---|---|
| G1 migrations `0001`–`0012` have no rollback | written before the rollback rule | write rollbacks when one of them is next touched |

## Not checked yet (Gap)

| Gap | Why | Next step |
|---|---|---|
| G2 signed-in screens (lessons, attendance, chat, admin) are not driven | no local Supabase on this machine (no Docker); never prod, never the boss's account | signed-out driving for now |

## Evidence (`npm run drive`)

`scripts/drive.mjs` starts `vite dev` with `PUBLIC_SUPABASE_URL` pointing at 127.0.0.1, which
overrides `.env` (production), so no request leaves this machine. It runs `scripts/drive/scenarios.mjs`
in Chrome at 390×844 and saves screenshots (with `--video` a .webm) to `artifacts/<date>/`, which git
ignores. It also proves that `/home`, `/admin` and a term page send a signed-out visitor to `/login`.
