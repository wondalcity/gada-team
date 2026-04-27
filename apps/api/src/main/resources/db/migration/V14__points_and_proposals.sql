-- ────────────────────────────────────────────────────────────
-- V10: Points system & team proposals
-- ────────────────────────────────────────────────────────────

-- Employer point balances
CREATE TABLE IF NOT EXISTS employer_point_accounts (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance         INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
    total_charged   INTEGER NOT NULL DEFAULT 0,
    total_used      INTEGER NOT NULL DEFAULT 0,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Point charge requests
CREATE TABLE IF NOT EXISTS point_charge_requests (
    id              BIGSERIAL PRIMARY KEY,
    public_id       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    amount_krw      INTEGER NOT NULL CHECK (amount_krw IN (300000, 500000, 1000000, 3000000, 5000000)),
    points_to_add   INTEGER NOT NULL,
    payment_method  VARCHAR(10) NOT NULL CHECK (payment_method IN ('CASH', 'CARD')),
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_note      TEXT,
    reviewed_by     BIGINT REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team job proposals (employer proposes a job to a team)
CREATE TABLE IF NOT EXISTS team_proposals (
    id              BIGSERIAL PRIMARY KEY,
    public_id       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    team_public_id  VARCHAR(100) NOT NULL,
    employer_id     BIGINT NOT NULL REFERENCES users(id),
    job_public_id   VARCHAR(100) NOT NULL,
    job_title       VARCHAR(255),
    message         TEXT,
    points_used     INTEGER NOT NULL DEFAULT 1,
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED')),
    responded_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_public_id, job_public_id, employer_id)
);

CREATE INDEX IF NOT EXISTS idx_point_charge_user   ON point_charge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_point_charge_status ON point_charge_requests(status);
CREATE INDEX IF NOT EXISTS idx_team_proposals_employer ON team_proposals(employer_id);
CREATE INDEX IF NOT EXISTS idx_team_proposals_team     ON team_proposals(team_public_id);
