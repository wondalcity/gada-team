-- V18: Team member proposals (worker proposes to join a team)

CREATE TABLE IF NOT EXISTS member_proposals (
    id                BIGSERIAL PRIMARY KEY,
    public_id         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    team_public_id    VARCHAR(100) NOT NULL,
    team_leader_id    BIGINT NOT NULL REFERENCES users(id),
    proposer_id       BIGINT NOT NULL REFERENCES users(id),
    message           TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
    responded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_public_id, proposer_id)
);

CREATE INDEX IF NOT EXISTS idx_member_proposals_leader   ON member_proposals(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_member_proposals_proposer ON member_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_member_proposals_team     ON member_proposals(team_public_id);
