
-- FIX: Groups SELECT policy - add created_by so creator can see their private group immediately
DROP POLICY IF EXISTS "groups_select" ON groups;
CREATE POLICY "groups_select" ON groups FOR SELECT TO authenticated
USING (
  is_public = true
  OR created_by = auth.uid()
  OR is_group_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- FIX: Classrooms SELECT policy - allow all authenticated to see active classrooms (for join by code)
DROP POLICY IF EXISTS "classrooms_select" ON classrooms;
CREATE POLICY "classrooms_select" ON classrooms FOR SELECT TO authenticated
USING (
  is_active = true
  OR created_by = auth.uid()
  OR is_classroom_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- FIX: Notification trigger for new signup requests (notify admins)
CREATE OR REPLACE FUNCTION public.notify_on_signup_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.account_status = 'pending' AND NEW.requested_role IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    SELECT ur.user_id,
      'Nouvelle demande d''inscription',
      COALESCE(NEW.full_name, 'Quelqu''un') || ' demande le rôle ' || NEW.requested_role,
      'system'::notification_type,
      '/admin'
    FROM user_roles ur WHERE ur.role IN ('admin'::app_role, 'global_admin'::app_role);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_signup_request ON profiles;
CREATE TRIGGER on_signup_request
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION notify_on_signup_request();

-- FIX: Notification trigger for announcement publication
CREATE OR REPLACE FUNCTION public.notify_on_announcement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_announcement_publish ON announcements;
CREATE TRIGGER on_announcement_publish
  AFTER INSERT OR UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION notify_on_announcement();
