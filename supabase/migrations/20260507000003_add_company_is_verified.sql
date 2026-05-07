-- Add is_verified as a generated column on companies (verified_at IS NOT NULL)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN
  GENERATED ALWAYS AS (verified_at IS NOT NULL) STORED;
