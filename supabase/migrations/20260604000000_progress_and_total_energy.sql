ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS total_baseline_kwh double precision,
  ADD COLUMN IF NOT EXISTS total_project_kwh  double precision,
  ADD COLUMN IF NOT EXISTS gain_override      double precision,
  ADD COLUMN IF NOT EXISTS design_progress    text,
  ADD COLUMN IF NOT EXISTS works_progress     text;
