-- User-facing database messages in Thai

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
    return query select 'error', 'กรุณาเข้าสู่ระบบก่อน', null::double precision, null::timestamptz; return;
  end if;

  select * into s from public.attendance_sessions where id = p_session_id;
  if not found then
    return query select 'error', 'ไม่พบรอบเช็คชื่อนี้', null::double precision, null::timestamptz; return;
  end if;

  if not public.is_term_student(s.term_id) then
    return query select 'error', 'คุณยังไม่ได้เป็นนักเรียนของคลาสนี้ (รออนุมัติ)', null::double precision, null::timestamptz; return;
  end if;

  select r.checked_in_at into v_existing from public.attendance_records r
   where r.session_id = s.id and r.student_id = v_uid;
  if found then
    return query select 'already', 'คุณเช็คชื่อไปแล้ว', null::double precision, v_existing; return;
  end if;

  if not s.is_open then
    return query select 'error', 'ติวเตอร์ปิดการเช็คชื่อรอบนี้แล้ว', null::double precision, null::timestamptz; return;
  end if;

  w := floor(extract(epoch from clock_timestamp()) / s.rotate_seconds)::bigint;
  if p_token is null or p_token not in (public.checkin_token_for(s.id, w), public.checkin_token_for(s.id, w - 1)) then
    return query select 'expired', 'QR หมดอายุแล้ว กรุณาสแกน QR บนจออีกครั้ง', null::double precision, null::timestamptz; return;
  end if;

  if s.require_location then
    if p_latitude is null or p_longitude is null then
      return query select 'location_required', 'คลาสนี้ต้องเปิดตำแหน่ง (Location) เพื่อเช็คชื่อ', null::double precision, null::timestamptz; return;
    end if;
    v_dist := public.distance_m(s.latitude, s.longitude, p_latitude, p_longitude);
    -- allow for GPS inaccuracy, but cap the slack so a vague fix can't cover a whole city
    v_slack := least(greatest(coalesce(p_accuracy, 0), 0), 50);
    if v_dist - v_slack > s.radius_m then
      return query select 'too_far',
        format('คุณอยู่ห่างจากห้องเรียนประมาณ %s เมตร (อนุญาตไม่เกิน %s เมตร)', round(v_dist::numeric), s.radius_m),
        v_dist, null::timestamptz;
      return;
    end if;
  end if;

  insert into public.attendance_records (session_id, student_id, method, latitude, longitude, accuracy_m, distance_m)
  values (s.id, v_uid, 'qr', p_latitude, p_longitude, p_accuracy, v_dist);

  return query select 'ok', 'เช็คชื่อสำเร็จ', v_dist, now();
end $$;

create or replace function public.guard_enrollment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_capacity int;
  v_approved int;
begin
  if tg_op = 'INSERT' then
    if not public.is_term_staff(new.term_id) then
      if new.student_id <> (select auth.uid()) then
        raise exception 'สมัครเรียนได้เฉพาะบัญชีของตัวเองเท่านั้น' using errcode = '42501';
      end if;
      if not exists (select 1 from public.terms t join public.subjects s on s.id = t.subject_id
                     where t.id = new.term_id and t.is_published and s.is_published) then
        raise exception 'เทอมนี้ยังไม่เปิดรับสมัคร' using errcode = '42501';
      end if;
      new.status := 'pending';
      new.decided_at := null;
      new.decided_by := null;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.term_id <> old.term_id or new.student_id <> old.student_id then
      raise exception 'ไม่สามารถย้ายการสมัครเรียนได้' using errcode = '42501';
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
        raise exception 'เทอมนี้เต็มแล้ว (% ที่นั่ง)', v_capacity using errcode = 'P0001';
      end if;
    end if;
  end if;
  return new;
end $$;

create or replace function public.guard_profile_role()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'เฉพาะแอดมินเท่านั้นที่เปลี่ยนบทบาทผู้ใช้ได้' using errcode = '42501';
  end if;
  return new;
end $$;

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
    raise exception 'ไม่สามารถเริ่มแชทได้' using errcode = '22023';
  end if;
  select role into v_my_role from public.profiles where id = v_uid;
  select role into v_other_role from public.profiles where id = p_other_id;
  if v_other_role is null then
    raise exception 'ไม่พบผู้ใช้' using errcode = 'P0002';
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
    raise exception 'แชทได้เฉพาะระหว่างนักเรียนกับติวเตอร์' using errcode = '42501';
  end if;

  if not exists (select 1 from public.profiles where id = v_tutor and role = 'admin')
     and not exists (
       select 1 from public.enrollments e
       join public.terms t on t.id = e.term_id
       join public.subject_tutors st on st.subject_id = t.subject_id
       where e.student_id = v_student and st.tutor_id = v_tutor
     ) then
    raise exception 'ทักได้เฉพาะติวเตอร์ของคลาสที่คุณสมัครเรียน' using errcode = '42501';
  end if;

  insert into public.conversations (student_id, tutor_id) values (v_student, v_tutor)
  on conflict (student_id, tutor_id) do update set student_id = excluded.student_id
  returning id into v_id;
  return v_id;
end $$;
