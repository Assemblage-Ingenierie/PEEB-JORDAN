-- ============================================================
-- PEEB Med Jordan — Replace open anon RLS with role-based RLS
-- Migration: 20260609000001_rls_roles
-- ============================================================
-- The initial schema granted the public `anon` role full read/write on
-- buildings and app_params. Since the anon key ships to the browser, that
-- left the whole database open to anyone with the URL. This migration removes
-- those policies and replaces them with authenticated, role-aware policies:
--
--   viewer  → read buildings + params (filtering is client-side)
--   editor  → read + write buildings
--   admin   → editor rights + write app_params
--
-- Helpers (peeb_is_approved / peeb_can_edit / peeb_is_admin) come from
-- 20260609000000_auth_profiles.sql.
-- ============================================================

-- ── Drop the open anon policies ────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon_select_buildings" ON public.buildings;
DROP POLICY IF EXISTS "anon_insert_buildings" ON public.buildings;
DROP POLICY IF EXISTS "anon_update_buildings" ON public.buildings;
DROP POLICY IF EXISTS "anon_delete_buildings" ON public.buildings;
DROP POLICY IF EXISTS "anon_select_params"    ON public.app_params;
DROP POLICY IF EXISTS "anon_insert_params"    ON public.app_params;
DROP POLICY IF EXISTS "anon_update_params"    ON public.app_params;

-- ── buildings: read = any approved user, write = editor/admin ──────────────────
CREATE POLICY "buildings_select" ON public.buildings
  FOR SELECT TO authenticated
  USING (public.peeb_is_approved());

CREATE POLICY "buildings_insert" ON public.buildings
  FOR INSERT TO authenticated
  WITH CHECK (public.peeb_can_edit());

CREATE POLICY "buildings_update" ON public.buildings
  FOR UPDATE TO authenticated
  USING (public.peeb_can_edit())
  WITH CHECK (public.peeb_can_edit());

CREATE POLICY "buildings_delete" ON public.buildings
  FOR DELETE TO authenticated
  USING (public.peeb_can_edit());

-- ── app_params: read = any approved user, write = admin only ───────────────────
CREATE POLICY "params_select" ON public.app_params
  FOR SELECT TO authenticated
  USING (public.peeb_is_approved());

CREATE POLICY "params_insert" ON public.app_params
  FOR INSERT TO authenticated
  WITH CHECK (public.peeb_is_admin());

CREATE POLICY "params_update" ON public.app_params
  FOR UPDATE TO authenticated
  USING (public.peeb_is_admin())
  WITH CHECK (public.peeb_is_admin());

-- ── Remove leftover junk table ─────────────────────────────────────────────────
DROP TABLE IF EXISTS public."SVG SUPA pour Pause";
