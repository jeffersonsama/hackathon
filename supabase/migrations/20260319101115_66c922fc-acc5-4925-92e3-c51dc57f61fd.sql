
-- Add requested_role column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS requested_role text;

-- Update handle_new_user to set pending + temporary 'user' role for alumni/teacher
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _role app_role;
  _status text;
  _requested_role text;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'student');
  _requested_role := NULL;
  
  IF _role = 'student' THEN
    _status := 'active';
    -- Keep role as student
  ELSIF _role IN ('teacher', 'alumni') THEN
    _status := 'pending';
    _requested_role := _role::text;
    _role := 'student'; -- temporary role while pending
  ELSE
    _status := 'pending';
    _requested_role := _role::text;
  END IF;

  INSERT INTO public.profiles (user_id, full_name, department, account_status, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    _status,
    _requested_role
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$function$;
