
-- Fix profiles UPDATE policy to include all admin roles
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- Fix user_roles INSERT policy to include all admin roles
DROP POLICY IF EXISTS "roles_insert" ON public.user_roles;
CREATE POLICY "roles_insert" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- Fix user_roles UPDATE policy
DROP POLICY IF EXISTS "roles_update" ON public.user_roles;
CREATE POLICY "roles_update" ON public.user_roles
FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- Fix user_roles DELETE policy
DROP POLICY IF EXISTS "roles_delete" ON public.user_roles;
CREATE POLICY "roles_delete" ON public.user_roles
FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- Fix user_roles SELECT policy so admins can see all roles
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;
CREATE POLICY "roles_select" ON public.user_roles
FOR SELECT TO authenticated
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'establishment_admin'::app_role)
  OR has_role(auth.uid(), 'global_admin'::app_role)
);

-- Add unique constraint on user_roles(user_id, role) if not exists for upsert
-- Actually we need unique on just user_id for the upsert pattern (one role per user)
-- Check: the table already has unique(user_id, role). We need to handle upsert differently.
