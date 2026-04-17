
-- Fix exams SELECT: public exams should be visible to all authenticated users
DROP POLICY IF EXISTS "exams_select" ON exams;
CREATE POLICY "exams_select"
ON exams FOR SELECT TO authenticated
USING (
  visibility = 'public'
  OR created_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);
