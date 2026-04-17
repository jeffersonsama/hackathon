
-- ═══════════════════════════════════════════════════
-- FIX: Create missing auth trigger + backfill users
-- ═══════════════════════════════════════════════════

-- 1. Recreate the trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  INSERT INTO public.profiles (user_id, full_name, department, account_status, requested_role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 2. Backfill existing orphan users
INSERT INTO public.profiles (user_id, full_name, department, account_status, requested_role)
SELECT
  au.id,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE(au.raw_user_meta_data->>'department', ''),
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'student') = 'student' THEN 'active'
    ELSE 'pending'
  END,
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'student') != 'student' 
    THEN au.raw_user_meta_data->>'role'
    ELSE NULL
  END
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT
  au.id,
  CASE 
    WHEN COALESCE(au.raw_user_meta_data->>'role', 'student') = 'student' THEN 'student'::app_role
    ELSE 'student'::app_role
  END
FROM auth.users au
LEFT JOIN public.user_roles ur ON ur.user_id = au.id
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Also create user_presence for backfilled users
INSERT INTO public.user_presence (user_id, status)
SELECT p.user_id, 'offline'
FROM public.profiles p
LEFT JOIN public.user_presence up ON up.user_id = p.user_id
WHERE up.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;
