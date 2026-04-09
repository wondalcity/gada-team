-- Add SENDING and CANCELLED to sms_status enum
ALTER TYPE sms_status ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE sms_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add retry / scheduling columns to sms_send_logs
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS attempt_count   INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts    INT          NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS next_retry_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_user_id   BIGINT       REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS trigger_event   VARCHAR(100);

-- Index for retry scheduler (polls FAILED rows with next_retry_at <= now)
CREATE INDEX IF NOT EXISTS idx_sms_logs_retry
    ON sms_send_logs (next_retry_at, attempt_count)
    WHERE status = 'FAILED' AND next_retry_at IS NOT NULL;

-- Index for scheduled sends
CREATE INDEX IF NOT EXISTS idx_sms_logs_scheduled
    ON sms_send_logs (scheduled_at)
    WHERE status = 'PENDING' AND scheduled_at IS NOT NULL;

-- Seed new templates
INSERT INTO sms_templates (code, name, locale, content, variables) VALUES
    ('ONBOARDING_COMPLETE', '가입 완료 안내', 'ko',
     '[GADA] {{name}}님, 가입을 축하합니다! 건설 현장의 일자리를 지금 바로 찾아보세요.',
     '["name"]'::jsonb),
    ('ONBOARDING_COMPLETE', '가입 완료 안내', 'vi',
     '[GADA] Chúc mừng {{name}} đã đăng ký thành công! Tìm việc làm xây dựng ngay hôm nay.',
     '["name"]'::jsonb),
    ('INSTALL_GUIDE', '앱 설치 안내', 'ko',
     '[GADA] {{name}}님, GADA 앱을 설치하고 더 편리하게 이용하세요.',
     '["name"]'::jsonb),
    ('INSTALL_GUIDE', '앱 설치 안내', 'vi',
     '[GADA] {{name}}, Cài đặt ứng dụng GADA để sử dụng thuận tiện hơn.',
     '["name"]'::jsonb),
    ('APPLICATION_STATUS_CHANGED', '지원 상태 변경', 'ko',
     '[GADA] {{name}}님의 {{job_title}} 지원 상태가 {{status}}(으)로 변경되었습니다.',
     '["name","job_title","status"]'::jsonb),
    ('INTERVIEW_SCHEDULED', '면접 일정 안내', 'ko',
     '[GADA] {{name}}님, {{company_name}} 면접이 {{date}} {{time}}에 예정되어 있습니다.',
     '["name","company_name","date","time"]'::jsonb)
ON CONFLICT (code, locale) DO NOTHING;
