
-- Schedule modules table
CREATE TABLE public.schedule_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  faculty text NOT NULL,
  level text NOT NULL,
  teacher_id uuid NOT NULL,
  classroom_id uuid REFERENCES public.classrooms(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads schedule_modules" ON public.schedule_modules
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins insert schedule_modules" ON public.schedule_modules
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

CREATE POLICY "admins update schedule_modules" ON public.schedule_modules
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

CREATE POLICY "admins delete schedule_modules" ON public.schedule_modules
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

-- Schedule slots table
CREATE TABLE public.schedule_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.schedule_modules(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time time NOT NULL,
  end_time time NOT NULL,
  room text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.schedule_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone reads schedule_slots" ON public.schedule_slots
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins insert schedule_slots" ON public.schedule_slots
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

CREATE POLICY "admins update schedule_slots" ON public.schedule_slots
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

CREATE POLICY "admins delete schedule_slots" ON public.schedule_slots
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'global_admin'::app_role) OR has_role(auth.uid(), 'establishment_admin'::app_role));

-- Trigger: auto-create classroom when a schedule module is created
CREATE OR REPLACE FUNCTION public.auto_create_schedule_classroom()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _classroom_id uuid;
BEGIN
  INSERT INTO classrooms (name, subject, description, created_by)
  VALUES (
    NEW.name,
    NEW.faculty,
    'Classe automatique pour le module ' || NEW.name || ' (' || NEW.faculty || ' - ' || NEW.level || ')',
    NEW.created_by
  )
  RETURNING id INTO _classroom_id;

  -- Add teacher as member
  INSERT INTO classroom_members (classroom_id, user_id, role)
  VALUES (_classroom_id, NEW.teacher_id, 'teacher');

  -- Update module with classroom_id
  NEW.classroom_id := _classroom_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_create_schedule_classroom
  BEFORE INSERT ON public.schedule_modules
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_schedule_classroom();

-- Update notify_new_post to filter by faculty
CREATE OR REPLACE FUNCTION public.notify_new_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _author_name text;
DECLARE _author_faculty text;
DECLARE _author_role text;
BEGIN
  SELECT full_name, department INTO _author_name, _author_faculty FROM profiles WHERE user_id = NEW.user_id;
  SELECT role INTO _author_role FROM user_roles WHERE user_id = NEW.user_id LIMIT 1;
  
  INSERT INTO notifications (user_id, title, content, type, link)
  SELECT p.user_id, 'Nouvelle publication',
         COALESCE(_author_name, 'Quelqu''un') || ' a publié quelque chose',
         'post'::notification_type, '/feed'
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id != NEW.user_id 
    AND p.account_status = 'active'
    AND p.department = _author_faculty
    AND NOT (_author_role = 'student' AND ur.role = 'teacher'::app_role);
  RETURN NEW;
END;
$$;

-- Update notify_on_exam to filter by faculty
CREATE OR REPLACE FUNCTION public.notify_on_exam()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uploader_name text;
DECLARE _uploader_faculty text;
DECLARE _uploader_role text;
BEGIN
  SELECT full_name, department INTO _uploader_name, _uploader_faculty FROM profiles WHERE user_id = NEW.created_by;
  SELECT role INTO _uploader_role FROM user_roles WHERE user_id = NEW.created_by LIMIT 1;
  
  INSERT INTO notifications (user_id, title, content, type, related_id, link)
  SELECT p.user_id, COALESCE(_uploader_name, 'Quelqu''un') || ' a déposé une épreuve',
    NEW.title || COALESCE(' — ' || NEW.matiere, ''), 'exam'::notification_type, NEW.id, '/exams'
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.user_id
  WHERE p.user_id != NEW.created_by 
    AND p.account_status = 'active'
    AND p.department = _uploader_faculty
    AND NOT (_uploader_role = 'student' AND ur.role = 'teacher'::app_role)
  LIMIT 100;
  RETURN NEW;
END;
$$;

-- Update handle_new_user to also store niveau from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _role app_role;
  _status text;
  _requested_role text;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  _requested_role := NULL;
  
  IF _role = 'student' THEN
    _status := 'active';
  ELSIF _role IN ('teacher', 'alumni') THEN
    _status := 'pending';
    _requested_role := _role::text;
    _role := 'student';
  ELSE
    _status := 'pending';
    _requested_role := _role::text;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, department, niveau, account_status, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'niveau', ''),
    _status,
    _requested_role
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN NEW;
END;
$$;
