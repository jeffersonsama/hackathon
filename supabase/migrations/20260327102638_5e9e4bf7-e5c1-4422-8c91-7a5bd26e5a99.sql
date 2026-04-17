
-- Tighten notification insert: allow inserting for self OR via trigger (which runs as SECURITY DEFINER)
-- Since SECURITY DEFINER functions bypass RLS anyway, we can safely restrict this
DROP POLICY IF EXISTS "notif_insert" ON notifications;
CREATE POLICY "notif_insert" ON notifications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'teacher'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role));
