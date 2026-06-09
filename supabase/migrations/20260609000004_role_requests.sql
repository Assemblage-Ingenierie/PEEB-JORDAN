-- ============================================================
-- PEEB Med Jordan — Auto-approve viewers + role-upgrade requests
-- Migration: 20260609000004_role_requests
-- ============================================================
-- New authorisation model:
--   • Any new account is immediately a VIEWER and approved (read access).
--   • A user can REQUEST an upgrade to editor or admin (requested_status).
--   • Only an admin accepts (status := requested_status) or rejects (clear).
--
-- requested_status is freely self-settable (it's only a request, not a grant);
-- the existing peeb_guard_self_update trigger still freezes status/is_approved
-- for non-admins, so a request can never escalate privileges by itself.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS requested_status text
  CHECK (requested_status IS NULL OR requested_status IN ('editor', 'admin'));

-- New users approved by default
ALTER TABLE public.profiles ALTER COLUMN is_approved SET DEFAULT true;

-- Signup trigger now creates an approved viewer
CREATE OR REPLACE FUNCTION public.peeb_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, job_title, status, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'email'),
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    NEW.raw_user_meta_data->>'job_title',
    'viewer',
    true
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: grant access to anyone currently pending under the old model
UPDATE public.profiles SET is_approved = true WHERE is_approved = false;
