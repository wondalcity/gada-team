-- ============================================================
-- V2: Add TEAM_LEADER to user_role enum + minor additions
-- ============================================================

-- PostgreSQL lets you ADD values to existing enums (irreversible, but safe)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TEAM_LEADER';

-- Add deleted_at to job_categories so admins can soft-delete them
ALTER TABLE job_categories
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to job_intro_contents for admin soft-delete
ALTER TABLE job_intro_contents
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to faqs for admin soft-delete
ALTER TABLE faqs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add updated_at to scouts (status can change: unread → read → responded)
ALTER TABLE scouts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add updated_at to notifications (is_read flag can flip)
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Partial indexes for new soft-delete columns
CREATE INDEX IF NOT EXISTS idx_job_categories_deleted ON job_categories (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_intro_deleted       ON job_intro_contents (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_deleted            ON faqs (deleted_at) WHERE deleted_at IS NULL;
