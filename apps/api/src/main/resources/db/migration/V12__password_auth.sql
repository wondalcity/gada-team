-- =============================================================
-- V12 — Password-based authentication
-- =============================================================

-- Add password hash column (nullable: Firebase-only users have no password)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add full name on the users table itself
-- (worker_profiles / employer_profiles already store full_name for profiles;
--  this column is used during registration before onboarding is complete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);
