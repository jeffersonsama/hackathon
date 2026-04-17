-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'establishment_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'global_admin';