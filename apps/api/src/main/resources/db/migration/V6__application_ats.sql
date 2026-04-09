-- flyway:executeInTransaction false
-- V6: Application ATS overhaul
-- Adds new ATS statuses and snapshot columns.
-- Note: Legacy status rename UPDATEs omitted — safe on fresh DB (no legacy rows).
-- On a live DB upgrade, run the UPDATEs manually in a separate session after migration.

-- ─── 1. Add new enum values ───────────────────────────────────────────────────
-- ALTER TYPE ADD VALUE is not transactional in PostgreSQL; executeInTransaction
-- false ensures each statement auto-commits so new values are visible immediately.
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'APPLIED';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'INTERVIEW_PENDING';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'HIRED';

-- ─── 2. Add snapshot + flag columns ──────────────────────────────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS worker_snapshot  JSONB NOT NULL DEFAULT '{}';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_snapshot    JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_snapshot JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_scouted       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. Add status_updated_at ────────────────────────────────────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 4. Index for scouted applications ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_is_scouted ON applications (is_scouted) WHERE is_scouted = TRUE;
