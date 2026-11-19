-- Undoes 0013: drops the staff reset function and its audit table (the audit rows go with it — export first if kept).
begin;
drop function if exists public.request_student_password_reset(uuid);
drop table if exists public.password_reset_audit;
commit;
