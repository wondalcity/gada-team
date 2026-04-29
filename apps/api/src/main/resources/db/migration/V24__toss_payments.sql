-- V24: Toss Payments — add payment gateway fields to point_charge_requests
ALTER TABLE point_charge_requests
  ADD COLUMN IF NOT EXISTS toss_payment_key  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS toss_order_id     VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_charge_toss_payment_key
  ON point_charge_requests (toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;
