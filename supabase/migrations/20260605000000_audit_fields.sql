ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS existing_audit  boolean,
  ADD COLUMN IF NOT EXISTS audit_author    text,
  ADD COLUMN IF NOT EXISTS audit_date      text,
  ADD COLUMN IF NOT EXISTS audit_file_url  text,
  ADD COLUMN IF NOT EXISTS source          text;
