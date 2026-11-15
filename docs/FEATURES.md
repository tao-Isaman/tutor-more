# Tutor More — feature map

What a person can do, where they reach it, and where it lives. A test (`src/lib/guardrails`, rule R7)
fails when a page or endpoint under `src/routes` is missing here, or a row points at a route that no
longer exists. "Check" names the driver scenario (`npm run drive -- <name>`) or the test that proves it.

Who: **anyone** = not signed in · **student** · **tutor** · **admin** · staff = tutor or admin.

## Public

| Feature | Who | Route | How to reach it | Code | Check |
|---|---|---|---|---|---|
| Landing page | anyone | `/` | open the site | `src/routes/+page.svelte` | drive `landing` |
| Sign in | anyone | `/login` | landing → sign in | `src/routes/login/+page.svelte` | drive `login` |
| Register | anyone | `/register` | sign in → register | `src/routes/register/+page.svelte` | drive `register` |
| Finish sign-in from an e-mail or Google | anyone | `/auth/callback` | the link in the e-mail | `src/routes/auth/callback/+server.ts` | — |
| Course catalogue (public on purpose) | anyone | `/explore` | menu → ค้นหาคอร์ส | `src/routes/(app)/explore/` | drive `explore` |
| One subject and its terms (public on purpose) | anyone | `/subjects/[id]` | ค้นหาคอร์ส → a subject | `src/routes/(app)/subjects/[id]/` | — |

## Signed in

| Feature | Who | Route | How to reach it | Code | Check |
|---|---|---|---|---|---|
| Home: my classes | student, staff | `/home` | menu → หน้าแรก | `src/routes/(app)/home/` | guardrail R4 |
| Check in to a class by QR | student | `/checkin` | menu → เช็คชื่อ | `src/routes/(app)/checkin/` | guardrail R4 |
| Chat | everyone signed in | `/messages` | menu → แชท | `src/routes/(app)/messages/` | guardrail R4 |
| Profile | everyone signed in | `/profile` | the avatar | `src/routes/(app)/profile/` | guardrail R4 |
| Account settings | everyone signed in | `/settings` | settings icon | `src/routes/(app)/settings/` | guardrail R4 |
| Teaching: my subjects and terms | staff | `/teach` | menu → การสอน | `src/routes/(app)/teach/` | guardrail R5 |
| Admin: users, invites, site settings | admin | `/admin` | menu → แอดมิน | `src/routes/(app)/admin/` | guardrail R5 |

## A term (class)

| Feature | Who | Route | How to reach it | Code | Check |
|---|---|---|---|---|---|
| Lessons | members of the term | `/terms/[id]` | a class → บทเรียน | `src/routes/(app)/terms/[id]/` | guardrail R4 |
| One lesson: video, files, text | members | `/terms/[id]/content/[cid]` | บทเรียน → a lesson | `src/routes/(app)/terms/[id]/content/[cid]/`, `src/lib/media.ts` | `src/lib/media.test.ts` |
| Class feed | members | `/terms/[id]/feed` | กระดานข่าว | `src/routes/(app)/terms/[id]/feed/`, `src/lib/feed.ts` | — |
| Announcements | members | `/terms/[id]/announcements` | ประกาศ | `src/routes/(app)/terms/[id]/announcements/` | — |
| Attendance sessions | members (staff run them) | `/terms/[id]/attendance` | เช็คชื่อ | `src/routes/(app)/terms/[id]/attendance/` | — |
| One attendance session, its QR | staff | `/terms/[id]/attendance/[sid]` | เช็คชื่อ → a session | `src/routes/(app)/terms/[id]/attendance/[sid]/` | — |
| Students | staff | `/terms/[id]/students` | นักเรียน | `src/routes/(app)/terms/[id]/students/` | — |
| Learning statistics | staff | `/terms/[id]/insights` | สถิติการเรียน | `src/routes/(app)/terms/[id]/insights/` | — |
| Term settings | staff | `/terms/[id]/settings` | ตั้งค่า | `src/routes/(app)/terms/[id]/settings/` | — |
