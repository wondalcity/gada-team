-- V11: Job bookmarks (worker ↔ job) and admin favorites (admin ↔ worker|team)

-- 근로자가 채용공고를 찜하는 테이블
CREATE TABLE IF NOT EXISTS job_bookmarks (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      BIGINT       NOT NULL REFERENCES jobs(id)  ON DELETE CASCADE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_bookmarks_user_job UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_bookmarks_user_id ON job_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_job_bookmarks_job_id  ON job_bookmarks(job_id);

-- 관리자가 근로자/팀을 찜하는 테이블
CREATE TYPE admin_favorite_target AS ENUM ('WORKER', 'TEAM');

CREATE TABLE IF NOT EXISTS admin_favorites (
    id                  BIGSERIAL              PRIMARY KEY,
    admin_user_id       BIGINT                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_type         admin_favorite_target  NOT NULL,
    target_worker_id    BIGINT                 REFERENCES users(id) ON DELETE CASCADE,
    target_team_id      BIGINT                 REFERENCES teams(id) ON DELETE CASCADE,
    note                TEXT,
    created_at          TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_admin_favorites_worker UNIQUE (admin_user_id, target_worker_id),
    CONSTRAINT uq_admin_favorites_team   UNIQUE (admin_user_id, target_team_id),
    CONSTRAINT chk_admin_favorites_target CHECK (
        (target_type = 'WORKER' AND target_worker_id IS NOT NULL AND target_team_id IS NULL) OR
        (target_type = 'TEAM'   AND target_team_id IS NOT NULL   AND target_worker_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_admin_favorites_admin_id ON admin_favorites(admin_user_id);
