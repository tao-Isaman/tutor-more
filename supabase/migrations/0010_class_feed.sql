-- =====================================================================
-- Class feed (กระดานข่าว): Facebook-style posts with images/video,
-- likes, comments and one level of replies.
-- Tutors post; every member of the class can like, comment and reply.
-- =====================================================================

create table public.feed_posts (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null default '' check (char_length(body) <= 10000),
  is_pinned boolean not null default false,
  like_count int not null default 0,
  comment_count int not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index feed_posts_term_idx on public.feed_posts (term_id, is_pinned desc, created_at desc);

create table public.feed_post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  kind text not null check (kind in ('image', 'video')),
  storage_path text not null,      -- course-media bucket: <term_id>/feed/<file>
  mime_type text,
  width int,
  height int,
  size_bytes bigint,
  position int not null default 0
);
create index feed_post_media_post_idx on public.feed_post_media (post_id, position);

create table public.feed_post_likes (
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index feed_post_likes_user_idx on public.feed_post_likes (user_id);

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.feed_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  parent_id uuid references public.feed_comments (id) on delete cascade, -- always a top-level comment
  reply_to_user_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  like_count int not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index feed_comments_post_idx on public.feed_comments (post_id, created_at);
create index feed_comments_parent_idx on public.feed_comments (parent_id);

create table public.feed_comment_likes (
  comment_id uuid not null references public.feed_comments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index feed_comment_likes_user_idx on public.feed_comment_likes (user_id);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.feed_post_term(p_post_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select term_id from public.feed_posts where id = p_post_id
$$;

create or replace function public.feed_comment_post(p_comment_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select post_id from public.feed_comments where id = p_comment_id
$$;

-- Posts: stamp author; editing body marks edited_at; counters can't be set by clients.
create or replace function public.guard_feed_post()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.author_id := (select auth.uid());
    new.created_at := now();
    new.like_count := 0;
    new.comment_count := 0;
    new.edited_at := null;
  else
    if new.term_id <> old.term_id then
      raise exception 'ย้ายโพสต์ไปคลาสอื่นไม่ได้' using errcode = '42501';
    end if;
    -- counters are maintained by triggers only (they run as definer with auth.uid() unchanged,
    -- so compare against a session flag set by those triggers)
    if coalesce(current_setting('app.feed_counter', true), '') <> '1' then
      new.like_count := old.like_count;
      new.comment_count := old.comment_count;
      new.author_id := old.author_id;
      new.created_at := old.created_at;
      if new.body is distinct from old.body then
        new.edited_at := now();
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger feed_posts_guard before insert or update on public.feed_posts
  for each row execute function public.guard_feed_post();

-- Comments: replies always hang off the top-level comment (2 levels, like Facebook).
create or replace function public.guard_feed_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_parent public.feed_comments;
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.like_count := 0;
    new.edited_at := null;
    if new.parent_id is not null then
      select * into v_parent from public.feed_comments where id = new.parent_id;
      if not found or v_parent.post_id <> new.post_id then
        raise exception 'ไม่พบความคิดเห็นที่ต้องการตอบกลับ' using errcode = '22023';
      end if;
      if v_parent.parent_id is not null then
        -- replying to a reply: keep it in the same thread, mention that person
        new.reply_to_user_id := coalesce(new.reply_to_user_id, v_parent.user_id);
        new.parent_id := v_parent.parent_id;
      end if;
    else
      new.reply_to_user_id := null;
    end if;
  else
    if coalesce(current_setting('app.feed_counter', true), '') <> '1' then
      if new.post_id <> old.post_id or new.parent_id is distinct from old.parent_id or new.user_id <> old.user_id then
        raise exception 'แก้ไขได้เฉพาะข้อความ' using errcode = '42501';
      end if;
      new.like_count := old.like_count;
      new.created_at := old.created_at;
      if new.body is distinct from old.body then
        new.edited_at := now();
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger feed_comments_guard before insert or update on public.feed_comments
  for each row execute function public.guard_feed_comment();

-- Counters
create or replace function public.feed_bump_post_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.feed_counter', '1', true);
  update public.feed_posts
     set like_count = greatest(0, like_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = coalesce(new.post_id, old.post_id);
  perform set_config('app.feed_counter', '', true);
  return null;
end $$;
create trigger feed_post_likes_count after insert or delete on public.feed_post_likes
  for each row execute function public.feed_bump_post_likes();

create or replace function public.feed_bump_comment_likes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.feed_counter', '1', true);
  update public.feed_comments
     set like_count = greatest(0, like_count + case when tg_op = 'INSERT' then 1 else -1 end)
   where id = coalesce(new.comment_id, old.comment_id);
  perform set_config('app.feed_counter', '', true);
  return null;
end $$;
create trigger feed_comment_likes_count after insert or delete on public.feed_comment_likes
  for each row execute function public.feed_bump_comment_likes();

create or replace function public.feed_bump_comments()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform set_config('app.feed_counter', '1', true);
  update public.feed_posts
     set comment_count = (select count(*) from public.feed_comments c where c.post_id = coalesce(new.post_id, old.post_id))
   where id = coalesce(new.post_id, old.post_id);
  perform set_config('app.feed_counter', '', true);
  return null;
end $$;
create trigger feed_comments_count after insert or delete on public.feed_comments
  for each row execute function public.feed_bump_comments();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.feed_posts enable row level security;
alter table public.feed_post_media enable row level security;
alter table public.feed_post_likes enable row level security;
alter table public.feed_comments enable row level security;
alter table public.feed_comment_likes enable row level security;

create policy "feed_posts: members read" on public.feed_posts
  for select to authenticated using (public.can_access_term(term_id));
create policy "feed_posts: staff post" on public.feed_posts
  for insert to authenticated with check (public.is_term_staff(term_id));
create policy "feed_posts: staff edit" on public.feed_posts
  for update to authenticated using (public.is_term_staff(term_id)) with check (public.is_term_staff(term_id));
create policy "feed_posts: staff delete" on public.feed_posts
  for delete to authenticated using (public.is_term_staff(term_id));

create policy "feed_post_media: members read" on public.feed_post_media
  for select to authenticated using (public.can_access_term(public.feed_post_term(post_id)));
create policy "feed_post_media: staff write" on public.feed_post_media
  for all to authenticated
  using (public.is_term_staff(public.feed_post_term(post_id)))
  with check (
    public.is_term_staff(public.feed_post_term(post_id))
    and storage_path like public.feed_post_term(post_id)::text || '/feed/%'
  );

create policy "feed_post_likes: members read" on public.feed_post_likes
  for select to authenticated using (public.can_access_term(public.feed_post_term(post_id)));
create policy "feed_post_likes: like" on public.feed_post_likes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_access_term(public.feed_post_term(post_id)));
create policy "feed_post_likes: unlike" on public.feed_post_likes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "feed_comments: members read" on public.feed_comments
  for select to authenticated using (public.can_access_term(public.feed_post_term(post_id)));
create policy "feed_comments: members write" on public.feed_comments
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.can_access_term(public.feed_post_term(post_id)));
create policy "feed_comments: author edits" on public.feed_comments
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "feed_comments: author or staff delete" on public.feed_comments
  for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_term_staff(public.feed_post_term(post_id)));

create policy "feed_comment_likes: members read" on public.feed_comment_likes
  for select to authenticated
  using (public.can_access_term(public.feed_post_term(public.feed_comment_post(comment_id))));
create policy "feed_comment_likes: like" on public.feed_comment_likes
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.can_access_term(public.feed_post_term(public.feed_comment_post(comment_id)))
  );
create policy "feed_comment_likes: unlike" on public.feed_comment_likes
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- Privileges & realtime
-- ---------------------------------------------------------------------
revoke execute on function public.guard_feed_post(), public.guard_feed_comment(), public.feed_bump_post_likes(),
  public.feed_bump_comment_likes(), public.feed_bump_comments() from public, anon, authenticated;
revoke execute on function public.feed_post_term(uuid), public.feed_comment_post(uuid) from public, anon;
grant execute on function public.feed_post_term(uuid), public.feed_comment_post(uuid) to authenticated;

alter publication supabase_realtime add table public.feed_posts, public.feed_comments;
