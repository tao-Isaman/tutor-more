-- Emails that become admin automatically on sign-up (one-time; the invite is consumed).
-- Add more with:  insert into public.admin_invites (email) values ('someone@example.com');
create table public.admin_invites (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admin_invites enable row level security;  -- no policies: not readable/writable by clients

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  edu public.education_level;
  v_role public.app_role := 'student';
begin
  begin
    edu := nullif(m ->> 'education_level', '')::public.education_level;
  exception when others then
    edu := null;
  end;

  delete from public.admin_invites where email = lower(new.email);
  if found then
    v_role := 'admin';
  end if;

  insert into public.profiles (id, first_name, last_name, nickname, education_level, school, role)
  values (
    new.id,
    left(coalesce(m ->> 'first_name', ''), 80),
    left(coalesce(m ->> 'last_name', ''), 80),
    left(coalesce(m ->> 'nickname', ''), 40),
    edu,
    left(nullif(m ->> 'school', ''), 120),
    v_role
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
revoke execute on function public.handle_new_user() from public, anon, authenticated;

insert into public.admin_invites (email) values ('tao.isaman@gmail.com');
