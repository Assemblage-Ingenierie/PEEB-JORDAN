-- ============================================================
-- PEEB Med Jordan — Authentication: profiles, roles, RLS
-- Migration: 20260609000000_auth_profiles
-- ============================================================
-- Adds the user-profile layer on top of Supabase Auth.
--
--   status        — permission tier: viewer | editor | admin
--   is_approved   — gate: a new account has no access until an admin approves it
--   job_title     — free-text "métier" (informational, NOT a permission)
--
-- Mirrors the battle-tested pattern from Assemblage-Ingenierie/AI-Chantier-CD:
--   • SECURITY DEFINER helpers to avoid RLS recursion in policies
--   • auto-profile trigger on INSERT *and* UPDATE of auth.users
--     (Google OAuth first sign-in can fire UPDATE rather than INSERT)
--   • backfill for any users that already exist
-- ============================================================

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  first_name  text,
  last_name   text,
  job_title   text,
  status      text        NOT NULL DEFAULT 'viewer'
                          CHECK (status IN ('viewer', 'editor', 'admin')),
  is_approved boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ── Permission helpers (SECURITY DEFINER → bypass RLS, no recursion) ───────────
CREATE OR REPLACE FUNCTION public.peeb_is_approved()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_approved = true
  );
$$;

CREATE OR REPLACE FUNCTION public.peeb_can_edit()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_approved = true AND status IN ('editor', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.peeb_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_approved = true AND status = 'admin'
  );
$$;

-- ── Auto-create profile on new auth user ──────────────────────────────────────
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
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- INSERT — email/password & magic-link signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.peeb_handle_new_user();

-- UPDATE — Google OAuth: the first sign-in can arrive as an UPDATE
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email_confirmed_at, last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.peeb_handle_new_user();

-- Backfill: any auth.users without a profile yet
INSERT INTO public.profiles (id, email, first_name, last_name, job_title, status, is_approved)
SELECT
  u.id,
  COALESCE(u.email, u.raw_user_meta_data->>'email'),
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.raw_user_meta_data->>'job_title',
  'viewer',
  false
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ── Anti-lockout: never let the last approved admin be removed/demoted ─────────
CREATE OR REPLACE FUNCTION public.peeb_protect_last_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  was_admin   boolean;
  still_admin boolean;
  other_admins integer;
BEGIN
  was_admin := (OLD.status = 'admin' AND OLD.is_approved = true);
  IF NOT was_admin THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    still_admin := (NEW.status = 'admin' AND NEW.is_approved = true);
    IF still_admin THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT count(*) INTO other_admins
  FROM public.profiles
  WHERE status = 'admin' AND is_approved = true AND id <> OLD.id;

  IF other_admins = 0 THEN
    RAISE EXCEPTION 'Cannot remove or demote the last approved administrator.';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect_last_admin ON public.profiles;
CREATE TRIGGER profiles_protect_last_admin
  BEFORE UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.peeb_protect_last_admin();

-- ── RLS policies on profiles ───────────────────────────────────────────────────
-- SELECT: a user sees their own profile; admins see everyone
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.peeb_is_admin());

-- INSERT: a user may only create their own row (belt-and-suspenders with trigger)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- UPDATE: admins only → prevents self-promotion / self-approval
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.peeb_is_admin())
  WITH CHECK (public.peeb_is_admin());

-- DELETE: admins only
CREATE POLICY "profiles_delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (public.peeb_is_admin());
