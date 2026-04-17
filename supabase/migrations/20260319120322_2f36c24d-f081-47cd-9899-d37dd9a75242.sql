
-- Add missing columns to courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS access_type text DEFAULT 'open';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS join_code text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';

-- Add missing columns to classrooms (academic_year, max_students already handled by existing schema)
-- classrooms already has invite_code

-- Update exams: add missing columns
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS exam_type text DEFAULT 'Autre';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'public';
ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS download_count integer DEFAULT 0;

-- Generate join codes for courses
CREATE OR REPLACE FUNCTION public.generate_course_join_code()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.join_code IS NULL AND NEW.access_type = 'code' THEN
    NEW.join_code := substr(md5(random()::text), 1, 8);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_course_join_code ON public.courses;
CREATE TRIGGER trg_course_join_code
  BEFORE INSERT ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.generate_course_join_code();

-- Drop conflicting RLS policies on courses
DROP POLICY IF EXISTS "courses_select" ON public.courses;
DROP POLICY IF EXISTS "courses_insert" ON public.courses;
DROP POLICY IF EXISTS "courses_update" ON public.courses;
DROP POLICY IF EXISTS "courses_delete" ON public.courses;
DROP POLICY IF EXISTS "anyone reads public courses" ON public.courses;
DROP POLICY IF EXISTS "students read public courses" ON public.courses;
DROP POLICY IF EXISTS "teachers manage own courses" ON public.courses;
DROP POLICY IF EXISTS "students manage own courses" ON public.courses;
DROP POLICY IF EXISTS "students create courses" ON public.courses;
DROP POLICY IF EXISTS "admins delete any course" ON public.courses;
DROP POLICY IF EXISTS "active users create courses" ON public.courses;
DROP POLICY IF EXISTS "owner manages own course" ON public.courses;
DROP POLICY IF EXISTS "owner deletes own course" ON public.courses;
DROP POLICY IF EXISTS "authenticated users read public courses" ON public.courses;

-- New courses RLS
CREATE POLICY "courses_select" ON public.courses FOR SELECT TO authenticated
  USING (
    is_public = true
    OR created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR is_course_enrolled(id, auth.uid())
  );

CREATE POLICY "courses_insert" ON public.courses FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "courses_update" ON public.courses FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "courses_delete" ON public.courses FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'global_admin')
  );

-- Drop conflicting classrooms policies
DROP POLICY IF EXISTS "classrooms_select" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_insert" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_update" ON public.classrooms;
DROP POLICY IF EXISTS "classrooms_delete" ON public.classrooms;
DROP POLICY IF EXISTS "teachers manage own classes" ON public.classrooms;
DROP POLICY IF EXISTS "anyone reads classes" ON public.classrooms;
DROP POLICY IF EXISTS "admins delete any class" ON public.classrooms;
DROP POLICY IF EXISTS "authenticated users read classes" ON public.classrooms;
DROP POLICY IF EXISTS "teachers create classes" ON public.classrooms;
DROP POLICY IF EXISTS "only teachers create classes" ON public.classrooms;
DROP POLICY IF EXISTS "owner manages own class" ON public.classrooms;
DROP POLICY IF EXISTS "owner or admin deletes class" ON public.classrooms;

-- New classrooms RLS
CREATE POLICY "classrooms_select" ON public.classrooms FOR SELECT TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.classroom_members WHERE classroom_id = classrooms.id AND user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "classrooms_insert" ON public.classrooms FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'teacher')
  );

CREATE POLICY "classrooms_update" ON public.classrooms FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "classrooms_delete" ON public.classrooms FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'global_admin')
  );

-- Drop conflicting classroom_members policies
DROP POLICY IF EXISTS "cm_select" ON public.classroom_members;
DROP POLICY IF EXISTS "cm_insert" ON public.classroom_members;
DROP POLICY IF EXISTS "cm_delete" ON public.classroom_members;
DROP POLICY IF EXISTS "students join classes" ON public.classroom_members;
DROP POLICY IF EXISTS "students read own memberships" ON public.classroom_members;
DROP POLICY IF EXISTS "members read class members" ON public.classroom_members;
DROP POLICY IF EXISTS "active users join classes" ON public.classroom_members;
DROP POLICY IF EXISTS "owner removes members" ON public.classroom_members;

-- New classroom_members RLS
CREATE POLICY "cm_select" ON public.classroom_members FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_members.classroom_id AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

CREATE POLICY "cm_insert" ON public.classroom_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "cm_delete" ON public.classroom_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.classrooms WHERE id = classroom_members.classroom_id AND created_by = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- Exams RLS: drop old and recreate
DROP POLICY IF EXISTS "exams_select" ON public.exams;
DROP POLICY IF EXISTS "exams_insert" ON public.exams;
DROP POLICY IF EXISTS "exams_update" ON public.exams;
DROP POLICY IF EXISTS "exams_delete" ON public.exams;
DROP POLICY IF EXISTS "anyone reads public exams" ON public.exams;
DROP POLICY IF EXISTS "active users deposit exams" ON public.exams;
DROP POLICY IF EXISTS "owner manages own exam" ON public.exams;
DROP POLICY IF EXISTS "admin deletes any exam" ON public.exams;

CREATE POLICY "exams_select" ON public.exams FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "exams_insert" ON public.exams FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "exams_update" ON public.exams FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "exams_delete" ON public.exams FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'global_admin')
  );
