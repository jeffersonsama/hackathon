-- ═══════════════════════════════════════════════════
-- COMPREHENSIVE FIX MIGRATION
-- FIX 4: Force all exams public + simplify RLS
-- FIX 7: Announcements visible to all authenticated
-- FIX 10: Events admin-only creation
-- FIX 12: Groups INSERT policy fix
-- FIX 14: Classrooms recursion fix
-- FIX 15: class_id column on groups
-- FIX 5: Notification triggers
-- ═══════════════════════════════════════════════════

-- ═══ FIX 4: Exams — force public visibility ═══
UPDATE exams SET visibility = 'public' WHERE visibility != 'public';

DROP POLICY IF EXISTS "exams_select" ON exams;
CREATE POLICY "exams_select"
ON exams FOR SELECT TO authenticated
USING (true);

-- ═══ FIX 7: Announcements — visible to all ═══
DROP POLICY IF EXISTS "targeted roles read announcements" ON announcements;
DROP POLICY IF EXISTS "all users read announcements" ON announcements;
CREATE POLICY "all users read announcements"
ON announcements FOR SELECT TO authenticated
USING (
  (published = true AND (expires_at IS NULL OR expires_at > now()))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
);

-- ═══ FIX 10: Events — admin-only creation ═══
DROP POLICY IF EXISTS "events_insert" ON events;
CREATE POLICY "events_insert"
ON events FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'global_admin'::app_role)
    OR has_role(auth.uid(), 'establishment_admin'::app_role)
  )
);

-- ═══ FIX 12: Groups — fix INSERT policy ═══
DROP POLICY IF EXISTS "groups_insert" ON groups;
CREATE POLICY "groups_insert"
ON groups FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND created_by = auth.uid()
);

-- ═══ FIX 14: Classrooms — fix infinite recursion ═══
CREATE OR REPLACE FUNCTION public.is_classroom_member(_classroom_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classroom_members cm
    WHERE cm.classroom_id = _classroom_id
    AND cm.user_id = _user_id
  )
$$;

DROP POLICY IF EXISTS "classrooms_select" ON classrooms;
CREATE POLICY "classrooms_select"
ON classrooms FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR is_classroom_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

DROP POLICY IF EXISTS "cm_select" ON classroom_members;
CREATE POLICY "cm_select"
ON classroom_members FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR is_classroom_member(classroom_id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ═══ FIX 15: Groups — add class_id for linked groups ═══
ALTER TABLE groups ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES classrooms(id) ON DELETE CASCADE;

-- ═══ FIX 5: Notification triggers ═══

-- A. Notify on new exam
CREATE OR REPLACE FUNCTION public.notify_on_exam()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uploader_name text;
BEGIN
  SELECT full_name INTO _uploader_name FROM profiles WHERE user_id = NEW.created_by;
  INSERT INTO notifications (user_id, title, content, type, related_id, link)
  SELECT p.user_id, COALESCE(_uploader_name, 'Quelqu''un') || ' a déposé une épreuve',
    NEW.title || COALESCE(' — ' || NEW.matiere, ''), 'exam'::notification_type, NEW.id, '/exams'
  FROM profiles p WHERE p.user_id != NEW.created_by AND p.account_status = 'active' LIMIT 100;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_exam_insert ON exams;
CREATE TRIGGER on_exam_insert AFTER INSERT ON exams FOR EACH ROW EXECUTE FUNCTION notify_on_exam();

-- D. Notify on course enrollment
CREATE OR REPLACE FUNCTION public.notify_on_enrollment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _course_title text; _creator_id uuid; _student_name text;
BEGIN
  SELECT title, created_by INTO _course_title, _creator_id FROM courses WHERE id = NEW.course_id;
  SELECT full_name INTO _student_name FROM profiles WHERE user_id = NEW.user_id;
  INSERT INTO notifications (user_id, title, content, type, link)
  VALUES (NEW.user_id, 'Inscription confirmée', 'Vous êtes inscrit à : ' || _course_title, 'course_update'::notification_type, '/courses/' || NEW.course_id || '/learn');
  IF _creator_id IS NOT NULL AND _creator_id != NEW.user_id THEN
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (_creator_id, 'Nouvel inscrit', COALESCE(_student_name, 'Quelqu''un') || ' a rejoint ' || _course_title, 'course_update'::notification_type, '/courses/' || NEW.course_id || '/manage');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_enrollment ON course_enrollments;
CREATE TRIGGER on_enrollment AFTER INSERT ON course_enrollments FOR EACH ROW EXECUTE FUNCTION notify_on_enrollment();

-- E. Notify on quiz attempt
CREATE OR REPLACE FUNCTION public.notify_on_quiz_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _chapter_title text; _course_id uuid;
BEGIN
  SELECT ch.title, ch.course_id INTO _chapter_title, _course_id
  FROM course_quizzes cq JOIN course_chapters ch ON ch.id = cq.chapter_id WHERE cq.id = NEW.quiz_id;
  INSERT INTO notifications (user_id, title, content, type, link)
  VALUES (NEW.user_id, 'Quiz terminé',
    CASE WHEN NEW.is_correct THEN 'Bonne réponse ! — ' || _chapter_title ELSE 'Mauvaise réponse — ' || _chapter_title END,
    'system'::notification_type, '/courses/' || _course_id || '/learn');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_quiz_attempt ON quiz_attempts;
CREATE TRIGGER on_quiz_attempt AFTER INSERT ON quiz_attempts FOR EACH ROW EXECUTE FUNCTION notify_on_quiz_complete();

-- F. Notify on course completion
CREATE OR REPLACE FUNCTION public.notify_on_course_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _course_title text;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS NULL OR OLD.completed = false) THEN
    SELECT title INTO _course_title FROM courses WHERE id = NEW.course_id;
    INSERT INTO notifications (user_id, title, content, type, link)
    VALUES (NEW.user_id, 'Cours terminé !', 'Félicitations ! Vous avez complété : ' || _course_title, 'course_update'::notification_type, '/courses/' || NEW.course_id || '/learn');
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_course_complete ON course_enrollments;
CREATE TRIGGER on_course_complete AFTER UPDATE ON course_enrollments FOR EACH ROW EXECUTE FUNCTION notify_on_course_complete();

-- I. Notify on endorsement
CREATE OR REPLACE FUNCTION public.notify_on_endorsement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _skill_owner uuid; _skill_name text; _endorser_name text;
BEGIN
  SELECT ps.user_id, ps.skill_name INTO _skill_owner, _skill_name FROM profile_skills ps WHERE ps.id = NEW.skill_id;
  SELECT full_name INTO _endorser_name FROM profiles WHERE user_id = NEW.endorsed_by;
  INSERT INTO notifications (user_id, title, content, type, link)
  VALUES (_skill_owner, COALESCE(_endorser_name, 'Quelqu''un') || ' a validé une compétence', 'Validation de : ' || _skill_name, 'system'::notification_type, '/profile');
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS on_endorsement_notif ON skill_endorsements;
CREATE TRIGGER on_endorsement_notif AFTER INSERT ON skill_endorsements FOR EACH ROW EXECUTE FUNCTION notify_on_endorsement();