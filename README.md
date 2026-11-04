# Tutor More Academy (SUT)

Learning platform for Tutor More Academy: subjects → terms → lessons, QR attendance with geofence,
video watch tracking, Q&A, announcements with read receipts, and private tutor ↔ student chat.

**Stack:** SvelteKit 3 (Svelte 5 runes, TypeScript) · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS, Storage, Realtime)
**Fonts:** Kanit (UI) · Sarabun (reading content) · **Colours:** red `#e11d2a` / yellow `#ffc400` / white

## Run locally

```bash
cp .env.example .env     # already points at the tutormore-academy Supabase project
npm install
npm run dev
```

## Roles

| Role    | Can do |
|---------|--------|
| Student | Request to join terms, view lessons once approved, check in by QR, ask questions, chat with their tutors |
| Tutor   | Everything for subjects they're assigned to: terms, lessons, approvals, attendance, insights, announcements |
| Admin   | Everything, plus change user roles and assign tutors to subjects (`/admin`) |

Everyone signs up as a **student**. Roles can't be set from the sign-up form (enforced in the DB).
Make the first admin in the Supabase SQL editor after registering:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## How the key features work

- **Permissions** are enforced in Postgres with Row Level Security (`supabase/migrations`), not just in the UI.
  Contact details live in a separate `profile_contacts` table only visible to the user, their tutors and admins.
- **QR check-in:** each session has a server-side secret. The QR encodes `/checkin?s=<session>&t=<token>` where
  the token is an HMAC of the current time window (rotates every 10–60 s; the previous window is still accepted).
  Students can't read the secret. With *Require location* on, `check_in()` checks the distance (haversine) to the
  tutor's position, allowing for GPS accuracy (capped at 50 m). Browser-reported GPS can still be spoofed by a
  determined student. The rotating QR plus the tutor's live list are what keep it honest in practice.
- **Video tracking:** the player reports actually played `[from, to)` second ranges. The DB merges them as an
  `int4multirange`, so rewatching doesn't inflate totals, and a report can't claim more seconds than have passed
  since the previous report. 90 % watched = completed. Tutors see per-student progress per lesson plus a class matrix (Insights).
- **Class feed (กระดานข่าว)** — tutors post text with up to 10 images (auto-compressed to WebP) or one video;
  every class member can like posts, comment, like comments and reply. Replies are two levels like Facebook:
  replying to a reply stays in the same thread and @mentions that person. Like/comment counts are kept by
  database triggers that clients can't forge; new comments arrive in realtime.
- **Uploads** use resumable TUS uploads with progress, into the private `course-media` bucket (`<term_id>/…`). Playback uses
  signed URLs (3 h).

## Supabase project checklist

1. **Auth → URL Configuration:** set *Site URL* to your domain and add `https://<domain>/auth/callback` to Redirect URLs
   (and `http://localhost:5173/auth/callback` for dev).
2. **Auth → Email:** confirmation emails are on by default and use Supabase's rate-limited mailer. Set up custom SMTP
   before launch, or turn *Confirm email* off.
3. **Storage → Settings:** the free plan caps uploads at **50 MB per file**. Lesson videos usually need the Pro plan with a larger limit.

## Project layout

```
supabase/migrations/     schema, RLS, RPCs (check_in, record_video_progress, …)
src/hooks.server.ts      Supabase SSR client + auth guard for protected routes
src/lib/components/      Logo, Avatar, Modal, VideoPlayer (tracking), QrScanner, QaThread, forms…
src/routes/              / · /login · /register · /explore · /subjects/[id]
  (app)/home             dashboard
  (app)/terms/[id]/      lessons · content/[cid] · announcements · attendance(/[sid] live QR) · students · insights · settings
  (app)/checkin          student scanner
  (app)/messages         private chat ("Room")
  (app)/teach · admin · profile · settings
```

## Deploy

`adapter-auto` works on Vercel/Netlify/Cloudflare. Set `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY`
in the host's environment variables.
