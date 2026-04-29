-- V25: Team Leader Point System
-- Team leaders can purchase points and spend them to open direct chats with workers.

CREATE TABLE IF NOT EXISTS team_leader_point_accounts (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL UNIQUE,
  balance       INT NOT NULL DEFAULT 0,
  total_charged INT NOT NULL DEFAULT 0,
  total_used    INT NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_leader_point_charge_requests (
  id                BIGSERIAL PRIMARY KEY,
  public_id         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  user_id           BIGINT NOT NULL,
  amount_krw        INT NOT NULL,
  points_to_add     INT NOT NULL,
  payment_method    VARCHAR(20) NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  admin_note        TEXT,
  reviewed_at       TIMESTAMPTZ,
  toss_payment_key  VARCHAR(200),
  toss_order_id     VARCHAR(100),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tl_point_accounts_user_id
  ON team_leader_point_accounts (user_id);

CREATE INDEX IF NOT EXISTS idx_tl_point_charges_user_id
  ON team_leader_point_charge_requests (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tl_charge_toss_payment_key
  ON team_leader_point_charge_requests (toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;
