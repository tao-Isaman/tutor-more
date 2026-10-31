-- =====================================================================
-- Private chat (student <-> tutor), storage buckets, realtime
-- =====================================================================

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  unique (student_id, tutor_id),
  check (student_id <> tutor_id)
);
create index conversations_student_idx on public.conversations (student_id, last_message_at desc);
create index conversations_tutor_idx on public.conversations (tutor_id, last_message_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function public.is_conversation_member(p_conversation_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.conversations
    where id = p_conversation_id and (select auth.uid()) in (student_id, tutor_id)
  )
$$;

-- Open (or reuse) a chat with someone. Allowed when one side tutors a term the other applied to,
-- or the caller is an admin.
create or replace function public.start_conversation(p_other_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_my_role public.app_role;
  v_other_role public.app_role;
  v_student uuid;
  v_tutor uuid;
  v_id uuid;
begin
  if v_uid is null or p_other_id is null or p_other_id = v_uid then
    raise exception 'Invalid conversation' using errcode = '22023';
  end if;
  select role into v_my_role from public.profiles where id = v_uid;
  select role into v_other_role from public.profiles where id = p_other_id;
  if v_other_role is null then
    raise exception 'User not found' using errcode = 'P0002';
  end if;

  if v_my_role in ('tutor', 'admin') and v_other_role = 'student' then
    v_tutor := v_uid; v_student := p_other_id;
  elsif v_my_role = 'student' and v_other_role in ('tutor', 'admin') then
    v_tutor := p_other_id; v_student := v_uid;
  elsif v_my_role = 'admin' or v_other_role = 'admin' then
    -- staff-to-staff chats: the admin is stored as "tutor"
    if v_my_role = 'admin' then v_tutor := v_uid; v_student := p_other_id;
    else v_tutor := p_other_id; v_student := v_uid; end if;
  else
    raise exception 'Chats are between students and tutors' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_tutor and role = 'admin')
     and not exists (
       select 1 from public.enrollments e
       join public.terms t on t.id = e.term_id
       join public.subject_tutors st on st.subject_id = t.subject_id
       where e.student_id = v_student and st.tutor_id = v_tutor
     ) then
    raise exception 'You can only message tutors of classes you applied to' using errcode = '42501';
  end if;

  insert into public.conversations (student_id, tutor_id) values (v_student, v_tutor)
  on conflict (student_id, tutor_id) do update set student_id = excluded.student_id
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.on_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message_at = new.created_at, last_message_preview = left(new.body, 120)
   where id = new.conversation_id;
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function public.on_message_insert();

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_conversation_member(p_conversation_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  update public.messages set read_at = now()
   where conversation_id = p_conversation_id and sender_id <> (select auth.uid()) and read_at is null;
end $$;

create or replace function public.unread_message_count()
returns int language sql stable security definer set search_path = '' as $$
  select count(*)::int from public.messages m
  join public.conversations c on c.id = m.conversation_id
  where (select auth.uid()) in (c.student_id, c.tutor_id)
    and m.sender_id <> (select auth.uid()) and m.read_at is null
$$;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "conversations: members read" on public.conversations
  for select to authenticated using ((select auth.uid()) in (student_id, tutor_id));
create policy "messages: members read" on public.messages
  for select to authenticated using (public.is_conversation_member(conversation_id));
create policy "messages: members send" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()) and read_at is null and public.is_conversation_member(conversation_id));

-- ---------------------------------------------------------------------
-- Storage
--   course-media (private): <term_id>/<file>   — staff write, members read
--   avatars (public):       <user_id>/<file>   — owner writes
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('course-media', 'course-media', false), ('avatars', 'avatars', true)
on conflict (id) do nothing;

create or replace function public.storage_term_id(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end $$;

create policy "course-media: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'course-media' and public.can_access_term(public.storage_term_id(name)));
create policy "course-media: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'course-media' and public.is_term_staff(public.storage_term_id(name)));
create policy "course-media: staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'course-media' and public.is_term_staff(public.storage_term_id(name)));
create policy "course-media: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'course-media' and public.is_term_staff(public.storage_term_id(name)));

create policy "avatars: owner upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------
-- Realtime (RLS still applies to change feeds)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table
  public.messages, public.conversations, public.attendance_records, public.comments;

-- ---------------------------------------------------------------------
-- Lock down helper functions that should not be callable by anon
-- ---------------------------------------------------------------------
revoke execute on function public.handle_new_user() from public, anon, authenticated;
