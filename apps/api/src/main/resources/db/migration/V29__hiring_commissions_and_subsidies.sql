-- V29: Hiring Commissions & Employer Subsidies
-- hiring_commissions: Platform commission records when employer hires via GADA
-- employer_subsidies: Government/platform hiring subsidies available to employers

-- ─── Hiring Commissions ─────────────────────────────────────────────────────
-- Created whenever an employer hires a worker (contract is signed).
-- Admin reviews and marks PAID once payment is confirmed.

CREATE TABLE IF NOT EXISTS hiring_commissions (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  employer_id     BIGINT NOT NULL,          -- users.id (EMPLOYER)
  company_name    VARCHAR(200),             -- snapshot at time of hire
  job_id          BIGINT,                   -- reference job posting
  job_title       VARCHAR(200),             -- snapshot
  worker_name     VARCHAR(100),             -- snapshot
  contract_id     BIGINT,                   -- reference contract if any
  amount_krw      BIGINT NOT NULL,          -- commission amount in KRW
  rate_pct        NUMERIC(5,2),             -- commission rate % (e.g. 5.00)
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | PAID | WAIVED
  admin_note      TEXT,
  reviewed_by     BIGINT,                   -- admin users.id
  reviewed_at     TIMESTAMPTZ,
  due_date        DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hiring_commissions_employer
  ON hiring_commissions (employer_id);
CREATE INDEX IF NOT EXISTS idx_hiring_commissions_status
  ON hiring_commissions (status);
CREATE INDEX IF NOT EXISTS idx_hiring_commissions_created_at
  ON hiring_commissions (created_at DESC);

-- ─── Employer Subsidies ─────────────────────────────────────────────────────
-- Government or platform incentives available to employers.
-- Admin creates subsidy offers; employer sees them and can apply.

CREATE TABLE IF NOT EXISTS employer_subsidies (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  employer_id     BIGINT NOT NULL,          -- users.id (EMPLOYER)
  company_name    VARCHAR(200),             -- snapshot
  subsidy_type    VARCHAR(50) NOT NULL,     -- GOVERNMENT | PLATFORM
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  amount_krw      BIGINT NOT NULL,          -- subsidy amount in KRW
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED | DISBURSED
  admin_note      TEXT,
  reviewed_by     BIGINT,
  reviewed_at     TIMESTAMPTZ,
  disbursed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employer_subsidies_employer
  ON employer_subsidies (employer_id);
CREATE INDEX IF NOT EXISTS idx_employer_subsidies_status
  ON employer_subsidies (status);
CREATE INDEX IF NOT EXISTS idx_employer_subsidies_created_at
  ON employer_subsidies (created_at DESC);
