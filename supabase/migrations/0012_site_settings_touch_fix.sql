-- Only stamp updated_by with a user that still exists (avoids FK errors when that user is being deleted).
create or replace function public.touch_site_settings()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  new.id := true;
  new.updated_at := now();
  if v_uid is not null and exists (select 1 from public.profiles where id = v_uid) then
    new.updated_by := v_uid;
  end if;
  return new;
end $$;
revoke execute on function public.touch_site_settings() from public, anon, authenticated;
