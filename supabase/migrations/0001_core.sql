-- =====================================================================
-- Tutor More Academy — core: users, roles, subjects, terms, enrollments
-- =====================================================================

create type public.app_role as enum ('admin', 'tutor', 'student');
create type public.education_level as enum ('high_school', 'university');
create type public.enrollment_status as enum ('pending', 'approved', 'rejected');

-- ---------------------------------------------------------------------
-- Profiles (visible to people who share a class) and private contacts
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 80),
  last_name text not null default '' check (char_length(last_name) <= 80),
  nickname text not null default '' check (char_length(nickname) <= 40),
  education_level public.education_level,
  school text check (char_length(school) <= 120),
  bio text check (char_length(bio) <= 500),
  avatar_url text,
  role public.app_role not null default 'student',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profile_contacts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  email text,
  phone text check (char_length(phone) <= 30),
  line_id text check (char_length(line_id) <= 60),
  facebook text check (char_length(facebook) <= 200),
  instagram text check (char_length(instagram) <= 60),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger profile_contacts_touch before update on public.profile_contacts
  for each row execute function public.touch_updated_at();

-- Create profile + contacts from sign-up metadata. Role is never taken from metadata.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  edu public.education_level;
begin
  begin
    edu := nullif(m ->> 'education_level', '')::public.education_level;
  exception when others then
    edu := null;
  end;

  insert into public.profiles (id, first_name, last_name, nickname, education_level, school)
  values (
    new.id,
    left(coalesce(m ->> 'first_name', ''), 80),
    left(coalesce(m ->> 'last_name', ''), 80),
    left(coalesce(m ->> 'nickname', ''), 40),
    edu,
    left(nullif(m ->> 'school', ''), 120)
  );

  insert into public.profile_contacts (user_id, email, phone, line_id, facebook, instagram)
  values (
    new.id,
    new.email,
    left(nullif(m ->> 'phone', ''), 30),
    left(nullif(m ->> 'line_id', ''), 60),
    left(nullif(m ->> 'facebook', ''), 200),
    left(nullif(m ->> 'instagram', ''), 60)
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Subjects / terms / enrollments
-- ---------------------------------------------------------------------
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  code text check (char_length(code) <= 20),
  title text not null check (char_length(title) between 1 and 120),
  title_th text check (char_length(title_th) <= 120),
  description text check (char_length(description) <= 4000),
  cover_url text,
  is_published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger subjects_touch before update on public.subjects
  for each row execute function public.touch_updated_at();

create table public.subject_tutors (
  subject_id uuid not null references public.subjects (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (subject_id, tutor_id)
);
create index subject_tutors_tutor_idx on public.subject_tutors (tutor_id);

create table public.terms (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  description text check (char_length(description) <= 4000),
  price numeric(10, 2) not null default 0 check (price >= 0),
  capacity int check (capacity is null or capacity > 0),
  start_date date,
  end_date date,
  schedule_note text check (char_length(schedule_note) <= 500),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index terms_subject_idx on public.terms (subject_id);
create trigger terms_touch before update on public.terms
  for each row execute function public.touch_updated_at();

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status public.enrollment_status not null default 'pending',
  message text check (char_length(message) <= 500),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id) on delete set null,
  unique (term_id, student_id)
);
create index enrollments_student_idx on public.enrollments (student_id);
create index enrollments_term_status_idx on public.enrollments (term_id, status);

-- ---------------------------------------------------------------------
-- Authorization helpers (security definer so policies don't recurse)
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin')
$$;

create or replace function public.is_subject_staff(p_subject_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.subject_tutors st
    join public.profiles p on p.id = st.tutor_id
    where st.subject_id = p_subject_id and st.tutor_id = (select auth.uid()) and p.role in ('tutor', 'admin')
  )
$$;

create or replace function public.is_term_staff(p_term_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.terms t
    join public.subject_tutors st on st.subject_id = t.subject_id
    join public.profiles p on p.id = st.tutor_id
    where t.id = p_term_id and st.tutor_id = (select auth.uid()) and p.role in ('tutor', 'admin')
  )
$$;

create or replace function public.is_term_student(p_term_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.enrollments
    where term_id = p_term_id and student_id = (select auth.uid()) and status = 'approved'
  )
$$;

create or replace function public.can_access_term(p_term_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_term_student(p_term_id) or public.is_term_staff(p_term_id)
$$;

-- Can the current user see this person's name/avatar? (self, staff, classmates, tutors, chat partners)
create or replace function public.can_see_profile(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    p_user_id = (select auth.uid())
    or public.is_admin()
    or exists (select 1 from public.profiles where id = p_user_id and role in ('tutor', 'admin'))
    or exists (
      -- I'm staff of a term this user enrolled (any status) in, or we're approved classmates
      select 1 from public.enrollments e
      where e.student_id = p_user_id
        and (public.is_term_staff(e.term_id) or (e.status = 'approved' and public.is_term_student(e.term_id)))
    )
$$;

-- Contacts are private: self, admin, or staff of a term the user applied to.
create or replace function public.can_see_contacts(p_user_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    p_user_id = (select auth.uid())
    or public.is_admin()
    or exists (select 1 from public.enrollments e where e.student_id = p_user_id and public.is_term_staff(e.term_id))
$$;

-- ---------------------------------------------------------------------
-- Guards
-- ---------------------------------------------------------------------
-- Only admins (or trusted server/SQL context with no JWT) can change roles.
create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard_role before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Enrollment rules: students may only create pending requests for published terms;
-- staff decisions are stamped; approvals respect capacity.
create or replace function public.guard_enrollment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_capacity int;
  v_approved int;
begin
  if tg_op = 'INSERT' then
    if not public.is_term_staff(new.term_id) then
      if new.student_id <> (select auth.uid()) then
        raise exception 'You can only enroll yourself' using errcode = '42501';
      end if;
      if not exists (select 1 from public.terms t join public.subjects s on s.id = t.subject_id
                     where t.id = new.term_id and t.is_published and s.is_published) then
        raise exception 'This term is not open for enrollment' using errcode = '42501';
      end if;
      new.status := 'pending';
      new.decided_at := null;
      new.decided_by := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.term_id <> old.term_id or new.student_id <> old.student_id then
      raise exception 'Cannot move an enrollment' using errcode = '42501';
    end if;
    if new.status is distinct from old.status then
      new.decided_at := now();
      new.decided_by := (select auth.uid());
    end if;
  end if;

  if new.status = 'approved' and (tg_op = 'INSERT' or old.status <> 'approved') then
    select capacity into v_capacity from public.terms where id = new.term_id for update;
    if v_capacity is not null then
      select count(*) into v_approved from public.enrollments
        where term_id = new.term_id and status = 'approved' and id <> new.id;
      if v_approved >= v_capacity then
        raise exception 'This term is full (% seats)', v_capacity using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger enrollments_guard before insert or update on public.enrollments
  for each row execute function public.guard_enrollment();

-- Adding a subject's creator as its tutor automatically.
create or replace function public.subject_add_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.created_by is not null then
    insert into public.subject_tutors (subject_id, tutor_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger subjects_add_creator after insert on public.subjects
  for each row execute function public.subject_add_creator();

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profile_contacts enable row level security;
alter table public.subjects enable row level security;
alter table public.subject_tutors enable row level security;
alter table public.terms enable row level security;
alter table public.enrollments enable row level security;

-- profiles
create policy "profiles: visible to related users" on public.profiles
  for select to authenticated using (public.can_see_profile(id));
create policy "profiles: tutors are public" on public.profiles
  for select to anon using (role in ('tutor', 'admin'));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admin updates anyone" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- contacts
create policy "contacts: read" on public.profile_contacts
  for select to authenticated using (public.can_see_contacts(user_id));
create policy "contacts: update self" on public.profile_contacts
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- subjects
create policy "subjects: published are public" on public.subjects
  for select to anon, authenticated using (is_published or public.is_subject_staff(id));
create policy "subjects: tutors create" on public.subjects
  for insert to authenticated
  with check (public.current_app_role() in ('tutor', 'admin') and created_by = (select auth.uid()));
create policy "subjects: staff update" on public.subjects
  for update to authenticated using (public.is_subject_staff(id)) with check (public.is_subject_staff(id));
create policy "subjects: admin delete" on public.subjects
  for delete to authenticated using (public.is_admin());

-- subject_tutors
create policy "subject_tutors: public read" on public.subject_tutors
  for select to anon, authenticated using (true);
create policy "subject_tutors: admin manage" on public.subject_tutors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- terms
create policy "terms: published are public" on public.terms
  for select to anon, authenticated
  using (
    (is_published and exists (select 1 from public.subjects s where s.id = subject_id and s.is_published))
    or public.is_subject_staff(subject_id)
    or public.is_term_student(id)
  );
create policy "terms: staff insert" on public.terms
  for insert to authenticated with check (public.is_subject_staff(subject_id));
create policy "terms: staff update" on public.terms
  for update to authenticated using (public.is_subject_staff(subject_id)) with check (public.is_subject_staff(subject_id));
create policy "terms: staff delete" on public.terms
  for delete to authenticated using (public.is_subject_staff(subject_id));

-- enrollments
create policy "enrollments: read own or as staff" on public.enrollments
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or public.is_term_staff(term_id)
    or (status = 'approved' and public.is_term_student(term_id))
  );
create policy "enrollments: request" on public.enrollments
  for insert to authenticated
  with check (student_id = (select auth.uid()) or public.is_term_staff(term_id));
create policy "enrollments: staff decide" on public.enrollments
  for update to authenticated using (public.is_term_staff(term_id)) with check (public.is_term_staff(term_id));
create policy "enrollments: cancel pending or staff remove" on public.enrollments
  for delete to authenticated
  using ((student_id = (select auth.uid()) and status = 'pending') or public.is_term_staff(term_id));

-- Public seat counter (approved count only, no personal data)
create or replace function public.term_seat_counts(p_term_ids uuid[])
returns table (term_id uuid, approved int, pending int)
language sql stable security definer set search_path = '' as $$
  select e.term_id,
         count(*) filter (where e.status = 'approved')::int,
         count(*) filter (where e.status = 'pending')::int
  from public.enrollments e
  where e.term_id = any (p_term_ids)
  group by e.term_id
$$;
