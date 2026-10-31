-- A single progress report may only cover as much video as could actually have played since the
-- previous report (allowing up to 2x playback speed), and never more than 60 seconds.
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
  v_last timestamptz;
  v_max_span int := 60;
  r public.video_progress;
begin
  if v_uid is null or not public.can_view_content(p_content_id) then
    raise exception 'Not allowed' using errcode = '42501';
  end if;

  select vp.updated_at into v_last from public.video_progress vp
   where vp.content_id = p_content_id and vp.user_id = v_uid;
  if found then
    v_max_span := least(60, ceil(extract(epoch from now() - v_last) * 2)::int + 5);
  end if;

  if v_to > v_from and v_to - v_from <= v_max_span then
    if v_dur > 0 then
      v_from := least(v_from, v_dur);
      v_to := least(v_to, v_dur);
    end if;
    if v_to > v_from then
      v_range := int4multirange(int4range(v_from, v_to));
    end if;
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

  insert into public.content_views (content_id, user_id) values (p_content_id, v_uid)
  on conflict (content_id, user_id) do update set last_viewed_at = now();

  return query select r.watched_seconds, r.duration_seconds, r.completed_at is not null;
end $$;
