-- ================================================================
-- Job Bids (입찰/견적) — workers and team leaders bid on job postings
-- ================================================================

-- Add BID to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'BID';

-- ─── job_bids ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_bids (
  id               BIGSERIAL    PRIMARY KEY,
  public_id        UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  job_id           BIGINT       NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

  -- Bidder: either an individual worker or a team
  bidder_type      VARCHAR(10)  NOT NULL CHECK (bidder_type IN ('WORKER', 'TEAM')),
  bidder_user_id   BIGINT       REFERENCES users(id),   -- set when WORKER
  bidder_team_id   BIGINT       REFERENCES teams(id),   -- set when TEAM

  bid_amount       BIGINT       NOT NULL,               -- VND, integer
  message          TEXT,                                 -- 견적 설명

  status           VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                                CHECK (status IN ('PENDING', 'SELECTED', 'REJECTED')),
  selected_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- One bid per bidder per job
  CONSTRAINT uq_job_bids_worker UNIQUE (job_id, bidder_user_id),
  CONSTRAINT uq_job_bids_team   UNIQUE (job_id, bidder_team_id),
  CONSTRAINT chk_bidder_set CHECK (
    (bidder_type = 'WORKER' AND bidder_user_id IS NOT NULL AND bidder_team_id IS NULL) OR
    (bidder_type = 'TEAM'   AND bidder_team_id IS NOT NULL AND bidder_user_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_job_bids_job_id        ON job_bids (job_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_bidder_user   ON job_bids (bidder_user_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_bidder_team   ON job_bids (bidder_team_id);
CREATE INDEX IF NOT EXISTS idx_job_bids_status        ON job_bids (status);
CREATE INDEX IF NOT EXISTS idx_job_bids_created_at    ON job_bids (created_at DESC);
