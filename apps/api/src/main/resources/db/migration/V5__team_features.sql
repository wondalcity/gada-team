-- V5: Add pay range, cover image, headcount target to teams
-- Add full_name, birth_date, certifications (JSONB) to team_members

ALTER TABLE teams
    ADD COLUMN IF NOT EXISTS desired_pay_min   INT,
    ADD COLUMN IF NOT EXISTS desired_pay_max   INT,
    ADD COLUMN IF NOT EXISTS desired_pay_unit  VARCHAR(20),
    ADD COLUMN IF NOT EXISTS cover_image_url   VARCHAR(500),
    ADD COLUMN IF NOT EXISTS headcount_target  INT;

ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS full_name    VARCHAR(100),
    ADD COLUMN IF NOT EXISTS birth_date   DATE,
    ADD COLUMN IF NOT EXISTS certifications JSONB NOT NULL DEFAULT '[]'::jsonb;
