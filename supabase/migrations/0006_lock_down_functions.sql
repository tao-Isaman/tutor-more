-- Trigger functions are never called directly.
revoke execute on function
  public.handle_new_user(), public.guard_profile_role(), public.guard_enrollment(),
  public.subject_add_creator(), public.create_session_secret(), public.on_message_insert(),
  public.guard_attendance_session(), public.touch_updated_at()
from public, anon, authenticated;

-- Signed-out visitors only need what the public catalog policies use.
revoke execute on all functions in schema public from anon;
revoke execute on all functions in schema public from public;
grant execute on function public.is_subject_staff(uuid), public.is_term_student(uuid),
  public.term_seat_counts(uuid[]) to anon;

-- Signed-in API surface (helpers are also used inside RLS policies).
grant execute on function
  public.current_app_role(), public.is_admin(), public.is_subject_staff(uuid), public.is_term_staff(uuid),
  public.is_term_student(uuid), public.can_access_term(uuid), public.can_see_profile(uuid),
  public.can_see_contacts(uuid), public.content_term(uuid), public.can_view_content(uuid),
  public.session_term(uuid), public.is_conversation_member(uuid), public.storage_term_id(text),
  public.distance_m(double precision, double precision, double precision, double precision),
  public.term_seat_counts(uuid[]), public.record_content_view(uuid),
  public.record_video_progress(uuid, int, int, int, int), public.term_content_report(uuid),
  public.mark_announcement_read(uuid), public.get_checkin_token(uuid),
  public.check_in(uuid, text, double precision, double precision, double precision),
  public.start_conversation(uuid), public.mark_conversation_read(uuid), public.unread_message_count()
to authenticated;

-- Future functions default to not-executable by anon.
alter default privileges in schema public revoke execute on functions from public, anon;
