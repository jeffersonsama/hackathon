
-- 1. Trigger: auto-create profile + role on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Trigger: update updated_at on profiles
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3. Trigger: update updated_at on courses
CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 4. Trigger: update updated_at on groups
CREATE TRIGGER groups_updated_at
  BEFORE UPDATE ON public.groups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 5. Trigger: validate conversation type
CREATE TRIGGER validate_conversation_type_trigger
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_conversation_type();

-- 6. Trigger: validate message type
CREATE TRIGGER validate_message_type_trigger
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_message_type();

-- 7. Trigger: validate presence status
CREATE TRIGGER validate_presence_status_trigger
  BEFORE INSERT OR UPDATE ON public.user_presence
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_presence_status();

-- 8. Trigger: validate call session
CREATE TRIGGER validate_call_session_trigger
  BEFORE INSERT OR UPDATE ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_call_session();

-- 9. Trigger: update conversation last message
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_conversation_last_message();

-- 10. Trigger: log call end
CREATE TRIGGER log_call_end_trigger
  AFTER UPDATE ON public.call_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.log_call_end();

-- 11. Trigger: sync endorsement count
CREATE TRIGGER sync_endorsement_count_trigger
  AFTER INSERT OR DELETE ON public.skill_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_endorsement_count();

-- 12. Trigger: generate course join code
CREATE TRIGGER generate_course_join_code_trigger
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_course_join_code();

-- 13. Notification triggers
CREATE TRIGGER notify_on_enrollment_trigger
  AFTER INSERT ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_enrollment();

CREATE TRIGGER notify_on_course_complete_trigger
  AFTER UPDATE ON public.course_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_course_complete();

CREATE TRIGGER notify_on_exam_trigger
  AFTER INSERT ON public.exams
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_exam();

CREATE TRIGGER notify_on_announcement_trigger
  AFTER INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_announcement();

CREATE TRIGGER notify_new_post_trigger
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_post();

CREATE TRIGGER notify_new_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER notify_on_conversation_message_trigger
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_conversation_message();

CREATE TRIGGER notify_on_quiz_complete_trigger
  AFTER INSERT ON public.quiz_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_quiz_complete();

CREATE TRIGGER notify_on_endorsement_trigger
  AFTER INSERT ON public.skill_endorsements
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_endorsement();

CREATE TRIGGER notify_classroom_join_trigger
  AFTER INSERT ON public.classroom_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_classroom_join();

CREATE TRIGGER notify_group_join_trigger
  AFTER INSERT ON public.group_members
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_group_join();

CREATE TRIGGER notify_on_signup_request_trigger
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_signup_request();
