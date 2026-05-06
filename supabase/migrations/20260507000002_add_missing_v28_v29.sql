-- V28: Add email column to users for admin password-based login
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;

-- V29: Hiring Commissions & Employer Subsidies

CREATE TABLE IF NOT EXISTS hiring_commissions (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  employer_id     BIGINT NOT NULL,
  company_name    VARCHAR(200),
  job_id          BIGINT,
  job_title       VARCHAR(200),
  worker_name     VARCHAR(100),
  contract_id     BIGINT,
  amount_krw      BIGINT NOT NULL,
  rate_pct        NUMERIC(5,2),
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  admin_note      TEXT,
  reviewed_by     BIGINT,
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

CREATE TABLE IF NOT EXISTS employer_subsidies (
  id              BIGSERIAL PRIMARY KEY,
  public_id       UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  employer_id     BIGINT NOT NULL,
  company_name    VARCHAR(200),
  subsidy_type    VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  description     TEXT,
  amount_krw      BIGINT NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'PENDING',
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
