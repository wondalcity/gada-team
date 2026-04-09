-- V4__critical_fixes.sql
-- Critical fixes identified by frontend review agents (worker web + admin)
-- Applied: 2026-04-01

-- ============================================================
-- FIX 1: Job welfare benefits (worker web review)
-- ============================================================
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS accommodation_provided  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS meal_provided           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transportation_provided BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- FIX 2: Team member invitation flow (worker web review)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
  END IF;
END $$;

ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS invitation_status invitation_status NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN IF NOT EXISTS invited_by        BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS invited_at        TIMESTAMPTZ;

-- Backfill: existing rows are already accepted
UPDATE team_members SET invitation_status = 'ACCEPTED' WHERE invitation_status IS NULL;

-- ============================================================
-- FIX 3: Scout expiry + deleted_at (worker web review)
-- ============================================================
ALTER TABLE scouts
    ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scouts_expires_at ON scouts (expires_at) WHERE response IS NULL;

-- ============================================================
-- FIX 4: Worker preferred regions (worker web review)
-- ============================================================
ALTER TABLE worker_profiles
    ADD COLUMN IF NOT EXISTS preferred_regions JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_worker_profiles_preferred_regions
    ON worker_profiles USING gin (preferred_regions);

-- ============================================================
-- FIX 5: Certification verification lifecycle (worker web review)
-- Replace is_verified boolean with a full status enum
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('UNSUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE certifications
    ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNSUBMITTED',
    ADD COLUMN IF NOT EXISTS verified_by         BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason    TEXT;

-- Migrate existing is_verified data
UPDATE certifications
SET verification_status = CASE WHEN is_verified = TRUE THEN 'VERIFIED'::verification_status
                               ELSE 'UNSUBMITTED'::verification_status END
WHERE verification_status = 'UNSUBMITTED';

-- ============================================================
-- FIX 6: Company admin fields (admin review)
-- ============================================================
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS verified_by       BIGINT REFERENCES users (id);

-- ============================================================
-- FIX 7: Job poster tracking (admin review)
-- ============================================================
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS poster_user_id  BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS closed_by       BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS closed_reason   TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_poster_user_id ON jobs (poster_user_id);

-- ============================================================
-- FIX 8: Application rejection reason + status timestamps (admin review)
-- ============================================================
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS shortlisted_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ;

-- ============================================================
-- FIX 9: Audit log request correlation (admin review)
-- ============================================================
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(36);  -- UUID correlation ID

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs (request_id) WHERE request_id IS NOT NULL;

-- ============================================================
-- FIX 10: SMS retry fields (admin review)
-- ============================================================
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS retry_count    SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS max_retries    SMALLINT NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_sms_logs_retry ON sms_send_logs (status, next_retry_at)
    WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries;

-- ============================================================
-- FIX 11: Job view events table (admin review — avoids hotspot on jobs.view_count)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_view_events (
    id          BIGSERIAL    PRIMARY KEY,
    job_id      BIGINT       NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    user_id     BIGINT       REFERENCES users (id),    -- NULL for anonymous
    ip_hash     VARCHAR(64),                           -- SHA-256 of IP for dedup
    viewed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    viewed_date DATE         NOT NULL DEFAULT CURRENT_DATE  -- stored for IMMUTABLE dedup index
);

CREATE INDEX IF NOT EXISTS idx_job_view_events_job_id    ON job_view_events (job_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_view_events_viewed_at ON job_view_events (viewed_at DESC);
-- Dedup: one unique view per job per ip_hash per day (uses stored viewed_date — no expression needed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_view_dedup
    ON job_view_events (job_id, ip_hash, viewed_date)
    WHERE ip_hash IS NOT NULL;

-- ============================================================
-- FIX 12: Apply updated_at trigger to tables that were missing it
-- certifications, portfolios, sms_templates, sms_send_logs, contracts
-- (scouts and others already covered by V3; this is idempotent)
-- ============================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'certifications', 'portfolios', 'sms_templates', 'sms_send_logs', 'contracts'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'set_updated_at_' || tbl
              AND tgrelid = tbl::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER set_updated_at_%I
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;
