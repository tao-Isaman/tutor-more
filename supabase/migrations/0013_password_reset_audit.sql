-- =====================================================================
-- Staff send a student a password-reset link, with an audit of who asked for whom.
-- Not applied yet — needs the owner's approval. Rollback: supabase/rollback/0013_password_reset_audit.sql
--
-- No service-role key (guardrail R3): the app calls request_student_password_reset() as the signed-in staff member;
-- the function checks the caller in the database, records the request and returns the student's e-mail; the app then
-- sends the normal reset e-mail (resetPasswordForEmail). The link goes to the student's mailbox — staff never see
-- or set the password. Who may: admins for anyone but themselves; tutors only for students of their own terms —
-- the same rule as seeing a student's contact details (can_see_contacts).
-- =====================================================================

create table public.password_reset_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,      -- staff member who asked
  student_id uuid not null references auth.users (id) on delete cascade,
  method text not null default 'email_link' check (method in ('email_link')),
  created_at timestamptz not null default now()
);
create index password_reset_audit_student_idx on public.password_reset_audit (student_id, created_at desc);

alter table public.password_reset_audit enable row level security;
-- Read: admins see everything; a tutor sees the requests they made. Writes only through the function below.
create policy "reset audit: admin or own requests" on public.password_reset_audit
  for select to authenticated using (public.is_admin() or actor_id = (select auth.uid()));
revoke all on public.password_reset_audit from anon;
grant select on public.password_reset_audit to authenticated;

create or replace function public.request_student_password_reset(p_student uuid)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare
  v_caller uuid := (select auth.uid());
  v_role public.app_role := public.current_app_role();
  v_email text;
begin
  if v_caller is null or v_role is null or v_role not in ('admin', 'tutor') then
    raise exception 'only staff can send a reset link' using errcode = '42501';
  end if;
  if p_student = v_caller then
    raise exception 'use "forgot password" for your own account' using errcode = '22023';
  end if;
  if not public.can_see_contacts(p_student) then
    raise exception 'not a student of your terms' using errcode = '42501';
  end if;
  if exists (select 1 from public.password_reset_audit a
             where a.student_id = p_student and a.created_at > now() - interval '60 seconds') then
    raise exception 'a reset link was just sent to this student; wait a minute' using errcode = '22023';
  end if;
  select u.email into v_email from auth.users u where u.id = p_student;
  if v_email is null then
    raise exception 'this account has no e-mail address' using errcode = '22023';
  end if;
  insert into public.password_reset_audit (actor_id, student_id) values (v_caller, p_student);
  return v_email;
end $$;

-- New functions in public are executable by anon/authenticated by default: anon gets nothing.
revoke execute on function public.request_student_password_reset(uuid) from public, anon;
grant execute on function public.request_student_password_reset(uuid) to authenticated;
