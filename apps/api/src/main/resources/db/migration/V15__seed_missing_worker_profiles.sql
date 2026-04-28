-- ────────────────────────────────────────────────────────────
-- V15: Seed missing worker profiles for users 5, 17, 25
-- ────────────────────────────────────────────────────────────
-- Users 5 (dev-worker-6, ACTIVE), 17 (dev-worker-13, SUSPENDED),
-- and 25 (테스트, PENDING) had no worker_profiles rows.
-- This migration also adds full_name values to the users table
-- for users that have NULL full_name.

-- Backfill full_name on users rows that are missing it
UPDATE users SET full_name = '장민준' WHERE firebase_uid = 'dev-worker-6'  AND full_name IS NULL;
UPDATE users SET full_name = '황진수' WHERE firebase_uid = 'dev-worker-13' AND full_name IS NULL;
UPDATE users SET full_name = '테스트 근로자' WHERE id = 25 AND full_name IS NULL;

-- Insert missing worker profiles
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type,
    languages, desired_job_categories, equipment, certifications, portfolio,
    desired_pay_min, desired_pay_max, desired_pay_unit,
    health_check_status, bio, is_public, preferred_regions
) VALUES
-- User 5: dev-worker-6, ACTIVE WORKER
(
    5, '장민준', '1993-06-12', 'KR', 'CITIZEN',
    '[{"code": "ko", "level": "NATIVE"}]', '[1, 2]', '[]', '[]', '[]',
    190000, 260000, 'DAILY',
    'NOT_DONE', '3년 이상 콘크리트·철근 현장 경험이 있습니다.', true, '[]'
),
-- User 17: dev-worker-13, SUSPENDED WORKER
(
    17, '황진수', '1989-09-25', 'KR', 'CITIZEN',
    '[{"code": "ko", "level": "NATIVE"}]', '[3, 4]', '[]', '[]', '[]',
    170000, 240000, 'DAILY',
    'NOT_DONE', '거푸집·조적 전문입니다.', false, '[]'
),
-- User 25: 테스트, PENDING WORKER (recently registered via phone)
(
    25, '테스트 근로자', '1995-01-01', 'KR', 'CITIZEN',
    '[{"code": "ko", "level": "NATIVE"}]', '[5]', '[]', '[]', '[]',
    150000, 200000, 'DAILY',
    'NOT_DONE', NULL, false, '[]'
)
ON CONFLICT (user_id) DO NOTHING;
