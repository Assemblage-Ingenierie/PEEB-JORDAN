-- ============================================================
-- PEEB Med Jordan — Allow users to complete their OWN profile
-- Migration: 20260609000003_profile_self_update
-- ============================================================
-- Google OAuth signups arrive with no first_name/last_name/job_title (Google
-- doesn't pass our custom metadata). A post-auth "complete your profile" modal
-- lets the user fill those in. To support that we must let a user UPDATE their
-- own profiles row — but they must NOT be able to change their permission tier
-- or approval. A BEFORE UPDATE guard freezes status/is_approved for non-admins,
-- so even a crafted REST call can only edit names/job_title.
-- ============================================================

-- Widen the UPDATE policy: self OR admin (status/approval still protected below)
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.peeb_is_admin())
  WITH CHECK (id = auth.uid() OR public.peeb_is_admin());

-- Guard: a non-admin editing their own row cannot change status / is_approved
CREATE OR REPLACE FUNCTION public.peeb_guard_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = OLD.id AND NOT public.peeb_is_admin() THEN
    NEW.status      := OLD.status;
    NEW.is_approved := OLD.is_approved;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_self_update ON public.profiles;
CREATE TRIGGER profiles_guard_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.peeb_guard_self_update();

REVOKE EXECUTE ON FUNCTION public.peeb_guard_self_update() FROM PUBLIC, anon, authenticated;
