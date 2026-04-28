-- V17: Chat system (employer ↔ team leader)

CREATE TABLE IF NOT EXISTS chat_rooms (
    id                    BIGSERIAL PRIMARY KEY,
    public_id             UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employer_id           BIGINT NOT NULL REFERENCES users(id),
    team_public_id        VARCHAR(100) NOT NULL,
    team_leader_id        BIGINT NOT NULL REFERENCES users(id),
    team_name             VARCHAR(255),
    points_used           INTEGER NOT NULL DEFAULT 1,
    employer_unread       INTEGER NOT NULL DEFAULT 0,
    leader_unread         INTEGER NOT NULL DEFAULT 0,
    last_message_at       TIMESTAMPTZ,
    last_message_preview  VARCHAR(200),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employer_id, team_public_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    public_id   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    room_id     BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id   BIGINT NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_employer ON chat_rooms(employer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_leader ON chat_rooms(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);
