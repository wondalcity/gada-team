-- Direct 1:1 chat rooms between workers/team leaders
CREATE TABLE IF NOT EXISTS direct_chat_rooms (
    id           BIGSERIAL PRIMARY KEY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    sender_id    BIGINT      NOT NULL REFERENCES users(id),
    recipient_id BIGINT      NOT NULL REFERENCES users(id),
    sender_unread   INT      NOT NULL DEFAULT 0,
    recipient_unread INT     NOT NULL DEFAULT 0,
    last_message_at  TIMESTAMPTZ,
    last_message_preview VARCHAR(200),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sender_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS direct_chat_messages (
    id        BIGSERIAL PRIMARY KEY,
    public_id UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    room_id   BIGINT      NOT NULL REFERENCES direct_chat_rooms(id) ON DELETE CASCADE,
    sender_id BIGINT      NOT NULL REFERENCES users(id),
    content   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_chat_rooms_sender    ON direct_chat_rooms(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_chat_rooms_recipient ON direct_chat_rooms(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_chat_messages_room   ON direct_chat_messages(room_id);
