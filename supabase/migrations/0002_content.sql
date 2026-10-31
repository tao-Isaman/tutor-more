-- =====================================================================
-- Content, view tracking, video progress, Q&A, announcements
-- =====================================================================

create type public.content_type as enum ('video', 'text', 'image', 'file', 'link');

create table public.contents (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  type public.content_type not null,
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 100000),          -- rich text / notes (markdown)
  storage_path text,                                        -- object in "course-media" bucket
  file_name text,
  mime_type text,
  size_bytes bigint,
  external_url text check (external_url is null or external_url ~* '^https?://'),
  duration_seconds int check (duration_seconds is null or duration_seconds >= 0),
  section text check (char_length(section) <= 120),        -- optional chapter grouping
  position int not null default 0,
  is_published boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contents_term_idx on public.contents (term_id, position);
create trigger contents_touch before update on public.contents
  for each row execute function public.touch_updated_at();

-- Who opened what (all content types)
create table public.content_views (
  content_id uuid not null references public.contents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count int not null default 1,
  primary key (content_id, user_id)
);
create index content_views_user_idx on public.content_views (user_id);

-- Precise video tracking: union of watched second-ranges, so re-watching or seeking doesn't inflate numbers.
create table public.video_progress (
  content_id uuid not null references public.contents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  watched int4multirange not null default '{}',
  watched_seconds int not null default 0,
  duration_seconds int not null default 0,
  last_position int not null default 0,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (content_id, user_id)
);
create index video_progress_user_idx on public.video_progress (user_id);

-- Q&A threads under content
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references public.contents (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index comments_content_idx on public.comments (content_id, created_at);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  body text not null check (char_length(body) <= 20000),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now()
);
create index announcements_term_idx on public.announcements (term_id, created_at desc);

create table public.announcement_reads (
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (announcement_id, user_id)
);
create index announcement_reads_user_idx on public.announcement_reads (user_id);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.content_term(p_content_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select term_id from public.contents where id = p_content_id
$$;

create or replace function public.can_view_content(p_content_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.contents c
    where c.id = p_content_id
      and (public.is_term_staff(c.term_id) or (c.is_published and public.is_term_student(c.term_id)))
  )
$$;

-- Record that the current user opened a piece of content.
create or replace function public.record_content_view(p_content_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not public.can_view_content(p_content_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.content_views as cv (content_id, user_id)
  values (p_content_id, (select auth.uid()))
  on conflict (content_id, user_id) do update
    set last_viewed_at = now(),
        view_count = cv.view_count + 1;
end $$;

-- Add a watched [from, to) second range to the current user's progress.
create or replace function public.record_video_progress(
  p_content_id uuid, p_from int, p_to int, p_position int, p_duration int
) returns table (watched_seconds int, duration_seconds int, completed boolean)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  v_dur int := greatest(coalesce(p_duration, 0), 0);
  v_from int := greatest(coalesce(p_from, 0), 0);
  v_to int := greatest(coalesce(p_to, 0), 0);
  v_range int4multirange := '{}';
  r public.video_progress;
begin
  if v_uid is null or not public.can_view_content(p_content_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if v_dur > 0 then
    v_from := least(v_from, v_dur);
    v_to := least(v_to, v_dur);
  end if;
  -- a single report can't claim more than 5 minutes (client flushes every ~10s)
  if v_to > v_from and v_to - v_from <= 300 then
    v_range := int4multirange(int4range(v_from, v_to));
  end if;

  insert into public.video_progress as vp (content_id, user_id, watched, duration_seconds, last_position)
  values (p_content_id, v_uid, v_range, v_dur, greatest(coalesce(p_position, 0), 0))
  on conflict (content_id, user_id) do update
    set watched = vp.watched + excluded.watched,
        duration_seconds = greatest(vp.duration_seconds, excluded.duration_seconds),
        last_position = excluded.last_position,
        updated_at = now()
  returning * into r;

  update public.video_progress vp
     set watched_seconds = (select coalesce(sum(upper(x) - lower(x)), 0) from unnest(r.watched) x),
         completed_at = case
           when vp.completed_at is null and r.duration_seconds > 0
                and (select coalesce(sum(upper(x) - lower(x)), 0) from unnest(r.watched) x) >= r.duration_seconds * 0.9
           then now() else vp.completed_at end
   where vp.content_id = p_content_id and vp.user_id = v_uid
  returning vp.* into r;

  -- also counts as a view
  insert into public.content_views (content_id, user_id) values (p_content_id, v_uid)
  on conflict (content_id, user_id) do update set last_viewed_at = now();

  return query select r.watched_seconds, r.duration_seconds, r.completed_at is not null;
end $$;

-- Tutor analytics: per-student status for every content in a term.
create or replace function public.term_content_report(p_term_id uuid)
returns table (
  content_id uuid, student_id uuid, viewed_at timestamptz, view_count int,
  watched_seconds int, duration_seconds int, completed boolean
)
language plpgsql stable security definer set search_path = '' as $$
#variable_conflict use_column
begin
  if not public.is_term_staff(p_term_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  return query
    select c.id, e.student_id, cv.last_viewed_at, coalesce(cv.view_count, 0),
           coalesce(vp.watched_seconds, 0), coalesce(nullif(vp.duration_seconds, 0), c.duration_seconds, 0),
           vp.completed_at is not null
    from public.contents c
    join public.enrollments e on e.term_id = c.term_id and e.status = 'approved'
    left join public.content_views cv on cv.content_id = c.id and cv.user_id = e.student_id
    left join public.video_progress vp on vp.content_id = c.id and vp.user_id = e.student_id
    where c.term_id = p_term_id;
end $$;

create or replace function public.mark_announcement_read(p_announcement_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.announcements a
                 where a.id = p_announcement_id and public.can_access_term(a.term_id)) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  insert into public.announcement_reads (announcement_id, user_id)
  values (p_announcement_id, (select auth.uid()))
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.contents enable row level security;
alter table public.content_views enable row level security;
alter table public.video_progress enable row level security;
alter table public.comments enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;

create policy "contents: members read" on public.contents
  for select to authenticated
  using (public.is_term_staff(term_id) or (is_published and public.is_term_student(term_id)));
create policy "contents: staff insert" on public.contents
  for insert to authenticated with check (public.is_term_staff(term_id));
create policy "contents: staff update" on public.contents
  for update to authenticated using (public.is_term_staff(term_id)) with check (public.is_term_staff(term_id));
create policy "contents: staff delete" on public.contents
  for delete to authenticated using (public.is_term_staff(term_id));

-- tracking tables: written only through RPCs above; readable by self + staff
create policy "content_views: self or staff" on public.content_views
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_term_staff(public.content_term(content_id)));
create policy "video_progress: self or staff" on public.video_progress
  for select to authenticated
  using (user_id = (select auth.uid()) or public.is_term_staff(public.content_term(content_id)));

create policy "comments: members read" on public.comments
  for select to authenticated using (public.can_view_content(content_id));
create policy "comments: members write" on public.comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_view_content(content_id));
create policy "comments: author or staff update" on public.comments
  for update to authenticated
  using (user_id = (select auth.uid()) or public.is_term_staff(public.content_term(content_id)))
  with check (user_id = (select auth.uid()) or public.is_term_staff(public.content_term(content_id)));
create policy "comments: author or staff delete" on public.comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_term_staff(public.content_term(content_id)));

create policy "announcements: members read" on public.announcements
  for select to authenticated using (public.can_access_term(term_id));
create policy "announcements: staff write" on public.announcements
  for all to authenticated using (public.is_term_staff(term_id)) with check (public.is_term_staff(term_id));

create policy "announcement_reads: self or staff" on public.announcement_reads
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (select 1 from public.announcements a where a.id = announcement_id and public.is_term_staff(a.term_id))
  );
