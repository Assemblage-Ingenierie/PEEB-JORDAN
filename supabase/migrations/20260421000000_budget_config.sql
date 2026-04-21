-- ============================================================
-- PEEB Med Jordan — Add budget_config column
-- Migration: 20260421000000_budget_config
-- ============================================================

ALTER TABLE public.app_params
  ADD COLUMN IF NOT EXISTS budget_config jsonb;
