-- ============================================================
-- PEEB Med Jordan — Initial Schema
-- Migration: 20260420000000_initial_schema
-- ============================================================

-- ── Buildings ──────────────────────────────────────────────────────────────────
-- Each row is one public building in Jordan.
-- `measures` stores the 9 renovation measures as JSONB (fixed set, always
--  loaded together with the building — JSONB avoids a join).
-- Keys inside `measures` use camelCase to match the JS data model directly.
CREATE TABLE IF NOT EXISTS public.buildings (
  id                  text        PRIMARY KEY,
  name                text        NOT NULL,
  typology            text        NOT NULL,
  governorate         text        NOT NULL DEFAULT '',
  region              text        NOT NULL DEFAULT '',
  address             text        NOT NULL DEFAULT '',
  lat                 float8,
  lng                 float8,
  area                float8,
  year_built          int4,
  floors              int4,
  baseline_eui        float8,
  operating_hours     text        NOT NULL DEFAULT '',
  funding_source      text        NOT NULL DEFAULT '',
  status              text        NOT NULL DEFAULT 'Planning',
  priority            text,
  site_observations   text        NOT NULL DEFAULT '',
  images              text[]      NOT NULL DEFAULT '{}',
  manually_ineligible boolean     NOT NULL DEFAULT false,
  peeb_selected       boolean     NOT NULL DEFAULT false,
  afd_loan            float8      NOT NULL DEFAULT 0,
  national_budget     float8      NOT NULL DEFAULT 0,
  others              float8      NOT NULL DEFAULT 0,
  is_draft            boolean     NOT NULL DEFAULT false,
  measures            jsonb       NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── App Parameters ─────────────────────────────────────────────────────────────
-- Singleton table (always id = 1). Stores global programme settings:
-- currency, energy cost, unit costs per measure, scoring config, and the
-- savings-rate matrix by typology.
CREATE TABLE IF NOT EXISTS public.app_params (
  id                  int4        PRIMARY KEY DEFAULT 1,
  currency            text        NOT NULL DEFAULT 'JOD',
  exchange_rate       float8      NOT NULL DEFAULT 1.36,
  energy_cost         float8      NOT NULL DEFAULT 0.085,
  unit_costs          jsonb       NOT NULL DEFAULT '{"insulation":25,"windows":80,"hvac":130,"lighting":20,"pv":150,"solarThermal":120}',
  score_config        jsonb,
  savings_by_typology jsonb,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Enforce exactly one row
  CONSTRAINT single_row CHECK (id = 1)
);

-- ── Auto-update `updated_at` ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER buildings_set_updated_at
  BEFORE UPDATE ON public.buildings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER app_params_set_updated_at
  BEFORE UPDATE ON public.app_params
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
-- This is a single-organisation internal tool with no user authentication.
-- RLS is enabled on all tables (Supabase security requirement for exposed
-- schemas). Full access is granted to the `anon` role intentionally.
-- When user authentication is added, replace these policies with
-- auth.uid()-based rules.

ALTER TABLE public.buildings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_params ENABLE ROW LEVEL SECURITY;

-- buildings
CREATE POLICY "anon_select_buildings" ON public.buildings
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_buildings" ON public.buildings
  FOR INSERT TO anon WITH CHECK (true);

-- UPDATE requires both USING (which rows to target) and WITH CHECK (new values)
CREATE POLICY "anon_update_buildings" ON public.buildings
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_buildings" ON public.buildings
  FOR DELETE TO anon USING (true);

-- app_params (singleton)
CREATE POLICY "anon_select_params" ON public.app_params
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_params" ON public.app_params
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_params" ON public.app_params
  FOR UPDATE TO anon USING (true) WITH CHECK (true);
