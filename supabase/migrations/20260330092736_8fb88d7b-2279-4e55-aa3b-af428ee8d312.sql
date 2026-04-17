-- 1. Update announcement notification trigger to also notify on content/title modifications
CREATE OR REPLACE FUNCTION public.notify_on_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.published = true AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.published IS NULL OR OLD.published = false))) THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    SELECT p.user_id,
      'Nouvelle annonce officielle',
      NEW.title,
      'system'::notification_type,
      '/announcements'
    FROM profiles p
    WHERE p.account_status = 'active'
      AND p.user_id != COALESCE(NEW.published_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 200;
  ELSIF TG_OP = 'UPDATE' AND NEW.published = true AND OLD.published = true
    AND (NEW.title IS DISTINCT FROM OLD.title OR NEW.content IS DISTINCT FROM OLD.content) THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    SELECT p.user_id,
      'Annonce modifiée',
      NEW.title,
      'system'::notification_type,
      '/announcements'
    FROM profiles p
    WHERE p.account_status = 'active'
      AND p.user_id != COALESCE(NEW.published_by, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 200;
  END IF;
  RETURN NEW;
END; $function$;

-- 2. Recreate classrooms SELECT policy to ensure proper visibility
DROP POLICY IF EXISTS classrooms_select ON classrooms;
CREATE POLICY classrooms_select ON classrooms FOR SELECT TO authenticated
USING (
  (is_active = true)
  OR (created_by = auth.uid())
  OR is_classroom_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);