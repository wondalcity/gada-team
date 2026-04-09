-- V10: Add missing public_id to sms_send_logs
-- The SmsSendLog entity declares public_id but V3 omitted it from the table definition.

ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_send_logs_public_id ON sms_send_logs (public_id);
