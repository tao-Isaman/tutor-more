-- =====================================================================
-- Attendance: QR check-in with rotating token and optional geofence
-- =====================================================================

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.terms (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  started_by uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  is_open boolean not null default true,
  require_location boolean not null default false,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  radius_m int not null default 100 check (radius_m between 10 and 5000),
  rotate_seconds int not null default 20 check (rotate_seconds between 10 and 300),
  check (not require_location or (latitude is not null and longitude is not null))
);
create index attendance_sessions_term_idx on public.attendance_sessions (term_id, started_at desc);

-- Secret lives in its own table that no client role can read.
create table public.attendance_session_secrets (
  session_id uuid primary key references public.attendance_sessions (id) on delete cascade,
  secret text not null default encode(extensions.gen_random_bytes(32), 'hex')
);

create table public.attendance_records (
  session_id uuid not null references public.attendance_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  method text not null default 'qr' check (method in ('qr', 'manual')),
  latitude double precision,
  longitude double precision,
  accuracy_m double precision,
  distance_m double precision,
  marked_by uuid references public.profiles (id) on delete set null,
  primary key (session_id, student_id)
);
create index attendance_records_student_idx on public.attendance_records (student_id);

create or replace function public.session_term(p_session_id uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select term_id from public.attendance_sessions where id = p_session_id
$$;

create or replace function public.create_session_secret()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.attendance_session_secrets (session_id) values (new.id);
  return new;
end $$;
create trigger attendance_sessions_secret after insert on public.attendance_sessions
  for each row execute function public.create_session_secret();

create or replace function public.guard_attendance_session()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.started_by := (select auth.uid());
    new.started_at := now();
  end if;
  if tg_op = 'UPDATE' and new.term_id <> old.term_id then
    raise exception 'Cannot move a session' using errcode = '42501';
  end if;
  if new.is_open then
    new.ended_at := null;
  elsif new.ended_at is null then
    new.ended_at := now();
  end if;
  return new;
end $$;
create trigger attendance_sessions_guard before insert or update on public.attendance_sessions
  for each row execute function public.guard_attendance_session();

-- Great-circle distance in metres
create or replace function public.distance_m(lat1 double precision, lon1 double precision,
                                             lat2 double precision, lon2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2)
    + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lon2 - lon1) / 2), 2)
  ))
$$;

create or replace function public.checkin_token_for(p_session_id uuid, p_window bigint)
returns text language sql stable security definer set search_path = '' as $$
  select left(encode(extensions.hmac(p_session_id::text || ':' || p_window::text, s.secret, 'sha256'), 'hex'), 24)
  from public.attendance_session_secrets s where s.session_id = p_session_id
$$;
revoke execute on function public.checkin_token_for(uuid, bigint) from public, anon, authenticated;

-- Tutor screen polls this to render the rotating QR.
create or replace function public.get_checkin_token(p_session_id uuid)
returns table (token text, expires_at timestamptz, rotate_seconds int)
language plpgsql security definer set search_path = '' as $$
declare
  s public.attendance_sessions;
  w bigint;
begin
  select * into s from public.attendance_sessions where id = p_session_id;
  if not found or not public.is_term_staff(s.term_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if not s.is_open then
    raise exception 'Session is closed' using errcode = 'P0001';
  end if;
  w := floor(extract(epoch from clock_timestamp()) / s.rotate_seconds)::bigint;
  return query select public.checkin_token_for(s.id, w),
                      to_timestamp((w + 1) * s.rotate_seconds),
                      s.rotate_seconds;
end $$;

-- Student check-in. Validates: logged in, approved in term, session open,
-- token is current (or the previous one, for scan latency), and geofence when enabled.
create or replace function public.check_in(
  p_session_id uuid, p_token text,
  p_latitude double precision default null, p_longitude double precision default null,
  p_accuracy double precision default null
) returns table (status text, message text, distance_m double precision, checked_in_at timestamptz)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_uid uuid := (select auth.uid());
  s public.attendance_sessions;
  w bigint;
  v_dist double precision;
  v_existing timestamptz;
  v_slack double precision;
begin
  if v_uid is null then
    return query select 'error', 'Please log in first', null::double precision, null::timestamptz; return;
  end if;

  select * into s from public.attendance_sessions where id = p_session_id;
  if not found then
    return query select 'error', 'Check-in session not found', null::double precision, null::timestamptz; return;
  end if;

  if not public.is_term_student(s.term_id) then
    return query select 'error', 'You are not an approved student of this class', null::double precision, null::timestamptz; return;
  end if;

  select r.checked_in_at into v_existing from public.attendance_records r
   where r.session_id = s.id and r.student_id = v_uid;
  if found then
    return query select 'already', 'You have already checked in', null::double precision, v_existing; return;
  end if;

  if not s.is_open then
    return query select 'error', 'This check-in session is closed', null::double precision, null::timestamptz; return;
  end if;

  w := floor(extract(epoch from clock_timestamp()) / s.rotate_seconds)::bigint;
  if p_token is null or p_token not in (public.checkin_token_for(s.id, w), public.checkin_token_for(s.id, w - 1)) then
    return query select 'expired', 'QR code expired — please scan the code on the screen again', null::double precision, null::timestamptz; return;
  end if;

  if s.require_location then
    if p_latitude is null or p_longitude is null then
      return query select 'location_required', 'Location is required to check in for this class', null::double precision, null::timestamptz; return;
    end if;
    v_dist := public.distance_m(s.latitude, s.longitude, p_latitude, p_longitude);
    -- allow for GPS inaccuracy, but cap the slack so a vague fix can't cover a whole city
    v_slack := least(greatest(coalesce(p_accuracy, 0), 0), 50);
    if v_dist - v_slack > s.radius_m then
      return query select 'too_far',
        format('You are about %s m from the classroom (allowed %s m)', round(v_dist::numeric), s.radius_m),
        v_dist, null::timestamptz;
      return;
    end if;
  end if;

  insert into public.attendance_records (session_id, student_id, method, latitude, longitude, accuracy_m, distance_m)
  values (s.id, v_uid, 'qr', p_latitude, p_longitude, p_accuracy, v_dist);

  return query select 'ok', 'Checked in successfully', v_dist, now();
end $$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.attendance_sessions enable row level security;
alter table public.attendance_session_secrets enable row level security;  -- no policies: invisible to clients
alter table public.attendance_records enable row level security;

create policy "attendance_sessions: members read" on public.attendance_sessions
  for select to authenticated using (public.can_access_term(term_id));
create policy "attendance_sessions: staff write" on public.attendance_sessions
  for all to authenticated using (public.is_term_staff(term_id)) with check (public.is_term_staff(term_id));

create policy "attendance_records: self or staff read" on public.attendance_records
  for select to authenticated
  using (student_id = (select auth.uid()) or public.is_term_staff(public.session_term(session_id)));
-- QR check-ins go through check_in(); staff can mark/unmark manually
create policy "attendance_records: staff manual insert" on public.attendance_records
  for insert to authenticated
  with check (public.is_term_staff(public.session_term(session_id)) and method = 'manual'
              and marked_by = (select auth.uid())
              and exists (select 1 from public.enrollments e
                          where e.term_id = public.session_term(session_id)
                            and e.student_id = attendance_records.student_id and e.status = 'approved'));
create policy "attendance_records: staff delete" on public.attendance_records
  for delete to authenticated using (public.is_term_staff(public.session_term(session_id)));
