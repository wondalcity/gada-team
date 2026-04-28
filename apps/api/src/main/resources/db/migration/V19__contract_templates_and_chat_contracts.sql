-- V19: Contract templates + contract message type in chat

-- Contract templates (per employer)
CREATE TABLE IF NOT EXISTS contract_templates (
    id              BIGSERIAL PRIMARY KEY,
    public_id       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employer_user_id BIGINT NOT NULL REFERENCES users(id) UNIQUE,
    pay_amount      INTEGER,
    pay_unit        VARCHAR(20),
    terms           TEXT,
    document_url    VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add message type to chat messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS contract_public_id UUID;
