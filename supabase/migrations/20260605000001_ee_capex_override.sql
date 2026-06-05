ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS ee_capex_override double precision;
