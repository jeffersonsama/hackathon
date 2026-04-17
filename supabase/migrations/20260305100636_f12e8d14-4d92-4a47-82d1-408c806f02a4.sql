
-- Add 'alumni' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'alumni';

-- Add account_status and department to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS department text DEFAULT '';

-- Add validation trigger: students must have active status auto, others pending
-- We'll handle this in application logic instead
