-- V26: Team work schedule — 팀 현장 투입 스케쥴

CREATE TABLE team_work_schedules (
    id                BIGSERIAL PRIMARY KEY,
    public_id         UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    team_id           BIGINT       NOT NULL,
    job_id            BIGINT,                          -- nullable: linked job posting (published or closed)
    site_name         VARCHAR(255) NOT NULL,           -- denormalised display name
    site_address      VARCHAR(500),
    work_description  TEXT         NOT NULL,           -- 어떤 업무를 하는지
    start_date        DATE         NOT NULL,
    end_date          DATE,                            -- null = 종료일 미정
    status            VARCHAR(20)  NOT NULL DEFAULT 'PLANNED',  -- PLANNED | ONGOING | COMPLETED
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_work_schedules_team_id ON team_work_schedules(team_id);
CREATE INDEX idx_team_work_schedules_job_id  ON team_work_schedules(job_id);
CREATE INDEX idx_team_work_schedules_status  ON team_work_schedules(status);
