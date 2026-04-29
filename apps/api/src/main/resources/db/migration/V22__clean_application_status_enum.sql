-- ────────────────────────────────────────────────────────────
-- V22: Remove legacy application_status enum values that don't
--      exist in the Kotlin ApplicationStatus enum, preventing
--      "No enum constant" runtime errors.
--
-- Affected tables: applications (status col + indexes),
--                  application_status_history (from_status, to_status)
-- Legacy values removed: PENDING, REVIEWING, ACCEPTED, CANCELLED
-- Valid values kept: APPLIED, UNDER_REVIEW, SHORTLISTED,
--   INTERVIEW_PENDING, ON_HOLD, REJECTED, HIRED, WITHDRAWN
-- ────────────────────────────────────────────────────────────

-- 1. Map legacy rows to valid equivalents (applications)
UPDATE applications SET status = 'APPLIED'       WHERE status::text = 'PENDING';
UPDATE applications SET status = 'UNDER_REVIEW'  WHERE status::text = 'REVIEWING';
UPDATE applications SET status = 'HIRED'         WHERE status::text = 'ACCEPTED';
UPDATE applications SET status = 'WITHDRAWN'     WHERE status::text = 'CANCELLED';

-- 2. Map legacy rows in history table
UPDATE application_status_history SET from_status = 'APPLIED'       WHERE from_status::text = 'PENDING';
UPDATE application_status_history SET from_status = 'UNDER_REVIEW'  WHERE from_status::text = 'REVIEWING';
UPDATE application_status_history SET from_status = 'HIRED'         WHERE from_status::text = 'ACCEPTED';
UPDATE application_status_history SET from_status = 'WITHDRAWN'     WHERE from_status::text = 'CANCELLED';
UPDATE application_status_history SET to_status = 'APPLIED'         WHERE to_status::text = 'PENDING';
UPDATE application_status_history SET to_status = 'UNDER_REVIEW'    WHERE to_status::text = 'REVIEWING';
UPDATE application_status_history SET to_status = 'HIRED'           WHERE to_status::text = 'ACCEPTED';
UPDATE application_status_history SET to_status = 'WITHDRAWN'       WHERE to_status::text = 'CANCELLED';

-- 3. Drop column defaults that reference the enum
ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;

-- 4. Drop indexes referencing the enum column
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_job_status;

-- 5. Convert ALL enum columns to VARCHAR (applications + history)
ALTER TABLE applications ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TABLE application_status_history ALTER COLUMN from_status TYPE VARCHAR(50) USING from_status::text;
ALTER TABLE application_status_history ALTER COLUMN to_status TYPE VARCHAR(50) USING to_status::text;

-- 6. Now safe to drop and recreate the enum
DROP TYPE application_status;
CREATE TYPE application_status AS ENUM (
    'APPLIED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_PENDING',
    'ON_HOLD',
    'REJECTED',
    'HIRED',
    'WITHDRAWN'
);

-- 7. Restore enum columns
ALTER TABLE applications ALTER COLUMN status TYPE application_status USING status::application_status;
ALTER TABLE application_status_history ALTER COLUMN from_status TYPE application_status USING from_status::application_status;
ALTER TABLE application_status_history ALTER COLUMN to_status TYPE application_status USING to_status::application_status;

-- 8. Restore column default with a valid value
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'APPLIED'::application_status;

-- 9. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_status ON applications(job_id, status) WHERE deleted_at IS NULL;
