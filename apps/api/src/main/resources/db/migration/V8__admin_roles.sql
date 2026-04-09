-- Admin sub-role for ADMIN users (null for non-admin users)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS admin_role VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_users_admin_role ON users (admin_role) WHERE admin_role IS NOT NULL;

-- Soft-delete + restore support: add deleted_at to tables that don't have it
-- contracts table (already has soft delete via BaseEntity? Check — add if missing)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- notifications (add deleted_at for admin soft-delete)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- sms_templates already has deleted_at per V3 schema

-- Seed SMS templates for common operations
INSERT INTO sms_templates (code, name, locale, content, variables, is_active)
VALUES
    ('APPLICATION_RECEIVED', '지원 접수 알림', 'ko',
     '안녕하세요 {{name}}님, {{job_title}} 공고에 지원이 완료되었습니다. GADA에서 결과를 알려드리겠습니다.',
     '["name","job_title"]'::jsonb, TRUE),
    ('APPLICATION_STATUS_CHANGED', '지원 상태 변경 알림', 'ko',
     '{{name}}님의 {{job_title}} 지원 상태가 {{status}}으로 변경되었습니다.',
     '["name","job_title","status"]'::jsonb, TRUE),
    ('SCOUT_RECEIVED', '스카우트 제안 알림', 'ko',
     '{{name}}님, {{company_name}}에서 {{job_title}} 포지션으로 스카우트 제안을 보냈습니다.',
     '["name","company_name","job_title"]'::jsonb, TRUE),
    ('INTERVIEW_SCHEDULED', '면접 일정 안내', 'ko',
     '{{name}}님, {{company_name}} 면접이 {{date}} {{time}}에 예정되어 있습니다. {{location}}',
     '["name","company_name","date","time","location"]'::jsonb, TRUE),
    ('CONTRACT_READY', '계약서 서명 요청', 'ko',
     '{{name}}님, {{job_title}} 계약서가 준비되었습니다. GADA 앱에서 확인하고 서명해 주세요.',
     '["name","job_title"]'::jsonb, TRUE)
ON CONFLICT (code, locale) DO NOTHING;
