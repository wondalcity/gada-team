-- =============================================================
-- GADA Hiring Platform — V3 Production Schema
-- PostgreSQL 16
-- Description : Adds worker identity fields, equipment catalog,
--               certifications, portfolios, contracts, SMS infra,
--               visa_types reference table, region backfill,
--               full-text search indexes, and updated_at triggers.
-- Author      : Backend agent
-- Date        : 2026-04-01
-- Idempotent  : YES — safe to re-run from scratch
-- =============================================================

-- =============================================================
-- 1. NEW ENUMs
-- =============================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sms_status') THEN
        CREATE TYPE sms_status AS ENUM ('PENDING', 'SENT', 'FAILED', 'DELIVERED');
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contract_status') THEN
        CREATE TYPE contract_status AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'EXPIRED', 'CANCELLED');
    END IF;
END $$;

-- =============================================================
-- 2. ALTER EXISTING TABLES
-- =============================================================

-- 2a. team_members — worker identity fields
ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS nationality         VARCHAR(10)          NOT NULL DEFAULT 'KR',
    ADD COLUMN IF NOT EXISTS visa_type           visa_type            NOT NULL DEFAULT 'CITIZEN',
    ADD COLUMN IF NOT EXISTS health_check_status health_check_status  NOT NULL DEFAULT 'NOT_DONE',
    ADD COLUMN IF NOT EXISTS health_check_expiry DATE,
    ADD COLUMN IF NOT EXISTS profile_image_url   VARCHAR(500);

-- 2b. sites — denormalized region fields
ALTER TABLE sites
    ADD COLUMN IF NOT EXISTS sido    VARCHAR(50),
    ADD COLUMN IF NOT EXISTS sigungu VARCHAR(50);

-- Back-fill from regions JOIN (only rows that have region_id set and sido not yet populated)
UPDATE sites s
SET    sido    = r.sido,
       sigungu = r.sigungu
FROM   regions r
WHERE  s.region_id = r.id
  AND  s.sido IS NULL;

CREATE INDEX IF NOT EXISTS idx_sites_sido    ON sites (sido)    WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sites_sigungu ON sites (sigungu) WHERE deleted_at IS NULL;

-- 2c. worker_profiles — notification / session fields
ALTER TABLE worker_profiles
    ADD COLUMN IF NOT EXISTS fcm_token      VARCHAR(500),
    ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- =============================================================
-- 3. NEW TABLES (dependency order — no forward FK references)
-- =============================================================

-- -------------------------------------------------------
-- 3.1  visa_types — reference / lookup table
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS visa_types (
    code              VARCHAR(10)  PRIMARY KEY,  -- matches visa_type enum values exactly
    name_ko           VARCHAR(100) NOT NULL,
    name_vi           VARCHAR(100),
    name_en           VARCHAR(100),
    description_ko    TEXT,
    description_vi    TEXT,
    is_work_permitted BOOLEAN      NOT NULL DEFAULT FALSE,
    notes             TEXT,
    sort_order        INTEGER      NOT NULL DEFAULT 0
);

-- -------------------------------------------------------
-- 3.2  equipment_master — construction equipment reference
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS equipment_master (
    id         BIGSERIAL    PRIMARY KEY,
    code       VARCHAR(50)  NOT NULL,
    name_ko    VARCHAR(200) NOT NULL,
    name_vi    VARCHAR(200),
    name_en    VARCHAR(200),
    category   VARCHAR(100),                          -- '중장비', '공구', '차량', '자재'
    icon_url   VARCHAR(500),
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order INTEGER      NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_equipment_master_code UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_equipment_category ON equipment_master (category);

-- -------------------------------------------------------
-- 3.3  worker_equipments — worker ↔ equipment junction
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS worker_equipments (
    id                BIGSERIAL   PRIMARY KEY,
    worker_profile_id BIGINT      NOT NULL REFERENCES worker_profiles (id) ON DELETE CASCADE,
    equipment_id      BIGINT      NOT NULL REFERENCES equipment_master (id),
    years_experience  SMALLINT    CHECK (years_experience >= 0 AND years_experience <= 50),
    has_license       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_worker_equipment UNIQUE (worker_profile_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_worker_equipments_worker    ON worker_equipments (worker_profile_id);
CREATE INDEX IF NOT EXISTS idx_worker_equipments_equipment ON worker_equipments (equipment_id);

-- -------------------------------------------------------
-- 3.4  team_equipments — team ↔ equipment junction
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_equipments (
    id           BIGSERIAL   PRIMARY KEY,
    team_id      BIGINT      NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    equipment_id BIGINT      NOT NULL REFERENCES equipment_master (id),
    count        SMALLINT    NOT NULL DEFAULT 1 CHECK (count > 0),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_equipment UNIQUE (team_id, equipment_id)
);

CREATE INDEX IF NOT EXISTS idx_team_equipments_team      ON team_equipments (team_id);
CREATE INDEX IF NOT EXISTS idx_team_equipments_equipment ON team_equipments (equipment_id);

-- -------------------------------------------------------
-- 3.5  certifications — worker-held certification instances
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS certifications (
    id                 BIGSERIAL    PRIMARY KEY,
    public_id          UUID         NOT NULL DEFAULT uuid_generate_v4(),
    worker_profile_id  BIGINT       NOT NULL REFERENCES worker_profiles (id) ON DELETE CASCADE,
    name               VARCHAR(200) NOT NULL,
    issuing_body       VARCHAR(200),
    issued_at          DATE,
    expires_at         DATE,
    certificate_number VARCHAR(100),
    image_url          VARCHAR(500),
    is_verified        BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ,
    CONSTRAINT uq_certifications_public_id UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS idx_certifications_worker_profile
    ON certifications (worker_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_certifications_expires_at
    ON certifications (expires_at) WHERE expires_at IS NOT NULL AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 3.6  portfolios — worker and team portfolio entries
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolios (
    id                BIGSERIAL    PRIMARY KEY,
    public_id         UUID         NOT NULL DEFAULT uuid_generate_v4(),
    owner_type        VARCHAR(10)  NOT NULL CHECK (owner_type IN ('WORKER', 'TEAM')),
    worker_profile_id BIGINT       REFERENCES worker_profiles (id) ON DELETE CASCADE,
    team_id           BIGINT       REFERENCES teams (id) ON DELETE CASCADE,
    title             VARCHAR(300) NOT NULL,
    description       TEXT,
    location          VARCHAR(500),
    start_date        DATE,
    end_date          DATE,
    sort_order        INTEGER      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,
    CONSTRAINT uq_portfolios_public_id UNIQUE (public_id),
    CONSTRAINT chk_portfolio_owner CHECK (
        (owner_type = 'WORKER' AND worker_profile_id IS NOT NULL AND team_id IS NULL)
        OR (owner_type = 'TEAM' AND team_id IS NOT NULL AND worker_profile_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_portfolios_worker ON portfolios (worker_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_portfolios_team   ON portfolios (team_id)           WHERE deleted_at IS NULL;

-- -------------------------------------------------------
-- 3.7  portfolio_images — images for portfolio entries
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS portfolio_images (
    id           BIGSERIAL    PRIMARY KEY,
    portfolio_id BIGINT       NOT NULL REFERENCES portfolios (id) ON DELETE CASCADE,
    image_url    VARCHAR(500) NOT NULL,
    caption      VARCHAR(200),
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_images_portfolio ON portfolio_images (portfolio_id);

-- -------------------------------------------------------
-- 3.8  job_allowed_application_types — normalized per-job config
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_allowed_application_types (
    id               BIGSERIAL        PRIMARY KEY,
    job_id           BIGINT           NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    application_type application_type NOT NULL,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_job_app_type UNIQUE (job_id, application_type)
);

CREATE INDEX IF NOT EXISTS idx_job_allowed_app_types_job ON job_allowed_application_types (job_id);

-- -------------------------------------------------------
-- 3.9  application_members — roster snapshot for team/company applications
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS application_members (
    id                  BIGSERIAL    PRIMARY KEY,
    application_id      BIGINT       NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    user_id             BIGINT       NOT NULL REFERENCES users (id),
    full_name           VARCHAR(100) NOT NULL,
    nationality         VARCHAR(10),
    visa_type           visa_type,
    health_check_status health_check_status,
    health_check_expiry DATE,
    role_in_application VARCHAR(100),             -- '반장', '용접공', etc.
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_application_member UNIQUE (application_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_application_members_application ON application_members (application_id);
CREATE INDEX IF NOT EXISTS idx_application_members_user        ON application_members (user_id);

-- -------------------------------------------------------
-- 3.10 sms_templates — message templates with variable placeholders
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_templates (
    id         BIGSERIAL    PRIMARY KEY,
    public_id  UUID         NOT NULL DEFAULT uuid_generate_v4(),
    code       VARCHAR(100) NOT NULL,
    name       VARCHAR(200) NOT NULL,
    locale     VARCHAR(10)  NOT NULL DEFAULT 'ko',
    content    TEXT         NOT NULL,              -- body with {{variable}} placeholders
    variables  JSONB        NOT NULL DEFAULT '[]', -- ["name", "job_title", "date"]
    is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT uq_sms_templates_public_id   UNIQUE (public_id),
    CONSTRAINT uq_sms_templates_code_locale UNIQUE (code, locale)
);

CREATE INDEX IF NOT EXISTS idx_sms_templates_code
    ON sms_templates (code) WHERE is_active = TRUE AND deleted_at IS NULL;

-- -------------------------------------------------------
-- 3.11 sms_send_logs — delivery tracking log (append-only)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS sms_send_logs (
    id               BIGSERIAL    PRIMARY KEY,
    template_id      BIGINT       REFERENCES sms_templates (id),
    template_code    VARCHAR(100),                    -- snapshot at send time
    to_phone         VARCHAR(20)  NOT NULL,
    user_id          BIGINT       REFERENCES users (id),
    content          TEXT         NOT NULL,           -- rendered content after variable substitution
    variables        JSONB        NOT NULL DEFAULT '{}',
    locale           VARCHAR(10)  NOT NULL DEFAULT 'ko',
    status           sms_status   NOT NULL DEFAULT 'PENDING',
    provider         VARCHAR(50),                     -- 'coolsms', 'naver', 'twilio'
    provider_msg_id  VARCHAR(200),
    error_code       VARCHAR(100),
    error_message    TEXT,
    sent_at          TIMESTAMPTZ,
    delivered_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_user_id    ON sms_send_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status     ON sms_send_logs (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_to_phone   ON sms_send_logs (to_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_send_logs (created_at DESC);

-- -------------------------------------------------------
-- 3.12 contracts — employment contract lifecycle
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
    id                     BIGSERIAL       PRIMARY KEY,
    public_id              UUID            NOT NULL DEFAULT uuid_generate_v4(),
    application_id         BIGINT          NOT NULL REFERENCES applications (id),
    job_id                 BIGINT          NOT NULL REFERENCES jobs (id),
    employer_user_id       BIGINT          NOT NULL REFERENCES users (id),
    worker_user_id         BIGINT          NOT NULL REFERENCES users (id),
    team_id                BIGINT          REFERENCES teams (id),
    status                 contract_status NOT NULL DEFAULT 'DRAFT',
    start_date             DATE,
    end_date               DATE,
    pay_amount             INTEGER,
    pay_unit               pay_unit,
    terms                  TEXT,                    -- agreed contract text snapshot
    document_url           VARCHAR(500),            -- PDF URL
    sent_at                TIMESTAMPTZ,
    employer_signed_at     TIMESTAMPTZ,
    worker_signed_at       TIMESTAMPTZ,
    employer_signature_url VARCHAR(500),
    worker_signature_url   VARCHAR(500),
    cancelled_at           TIMESTAMPTZ,
    cancellation_reason    TEXT,
    created_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    deleted_at             TIMESTAMPTZ,
    CONSTRAINT uq_contracts_public_id UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS idx_contracts_application_id   ON contracts (application_id);
CREATE INDEX IF NOT EXISTS idx_contracts_job_id           ON contracts (job_id);
CREATE INDEX IF NOT EXISTS idx_contracts_employer_user_id ON contracts (employer_user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_worker_user_id   ON contracts (worker_user_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status           ON contracts (status) WHERE deleted_at IS NULL;

-- =============================================================
-- 4. SEED DATA
-- =============================================================

-- -------------------------------------------------------
-- 4.1  visa_types seed
-- -------------------------------------------------------
INSERT INTO visa_types (code, name_ko, name_vi, name_en, is_work_permitted, sort_order) VALUES
    ('CITIZEN', '내국인',        'Người Hàn Quốc',             'Korean Citizen',           TRUE,  1),
    ('F4',      '재외동포(F-4)', 'Kiều bào (F-4)',              'Overseas Korean F-4',      TRUE,  2),
    ('F5',      '영주(F-5)',     'Thường trú (F-5)',            'Permanent Resident',       TRUE,  3),
    ('F6',      '결혼이민(F-6)', 'Hôn nhân (F-6)',              'Marriage Immigrant',       TRUE,  4),
    ('H2',      '방문취업(H-2)', 'Thăm thân (H-2)',             'Working Holiday H-2',      TRUE,  5),
    ('E9',      '비전문취업(E-9)','Lao động phổ thông (E-9)',   'Non-Professional E-9',     TRUE,  6),
    ('E7',      '특정활동(E-7)', 'Đặc định (E-7)',              'Specific Activity E-7',    TRUE,  7),
    ('D8',      '기업투자(D-8)', 'Đầu tư (D-8)',                'Corporate Investment D-8', FALSE, 8),
    ('OTHER',   '기타',          'Khác',                        'Other',                    FALSE, 9)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------
-- 4.2  equipment_master seed (15 common construction equipment)
-- -------------------------------------------------------
INSERT INTO equipment_master (code, name_ko, name_vi, name_en, category, sort_order) VALUES
    ('EXCAVATOR',       '굴삭기',       'Máy đào',         'Excavator',              '중장비',  1),
    ('CRANE',           '크레인',       'Cần cẩu',         'Crane',                  '중장비',  2),
    ('BULLDOZER',       '불도저',       'Máy ủi',          'Bulldozer',              '중장비',  3),
    ('FORKLIFT',        '지게차',       'Xe nâng',         'Forklift',               '중장비',  4),
    ('CONCRETE_PUMP',   '콘크리트펌프', 'Bơm bê tông',     'Concrete Pump',          '중장비',  5),
    ('ROLLER',          '롤러',         'Máy lu',          'Road Roller',            '중장비',  6),
    ('TOWER_CRANE',     '타워크레인',   'Cần cẩu tháp',    'Tower Crane',            '중장비',  7),
    ('DUMP_TRUCK',      '덤프트럭',     'Xe ben',          'Dump Truck',             '차량',    8),
    ('MIXER_TRUCK',     '레미콘트럭',   'Xe trộn bê tông', 'Mixer Truck',            '차량',    9),
    ('CHERRY_PICKER',   '고소작업차',   'Xe nâng người',   'Cherry Picker',          '차량',   10),
    ('WELDING_MACHINE', '용접기',       'Máy hàn',         'Welding Machine',        '공구',   11),
    ('GRINDER',         '그라인더',     'Máy mài',         'Angle Grinder',          '공구',   12),
    ('DRILL',           '드릴',         'Máy khoan',       'Electric Drill',         '공구',   13),
    ('COMPRESSOR',      '콤프레셔',     'Máy nén khí',     'Air Compressor',         '공구',   14),
    ('SCAFFOLDING',     '비계자재',     'Giàn giáo',       'Scaffolding',            '자재',   15)
ON CONFLICT (code) DO NOTHING;

-- -------------------------------------------------------
-- 4.3  Migrate existing jobs JSONB application_types → normalized table
-- -------------------------------------------------------
INSERT INTO job_allowed_application_types (job_id, application_type)
SELECT j.id,
       elem::text::application_type
FROM   jobs j,
       jsonb_array_elements_text(j.application_types) AS elem
WHERE  j.deleted_at IS NULL
ON CONFLICT (job_id, application_type) DO NOTHING;

-- -------------------------------------------------------
-- 4.4  sms_templates seed
-- -------------------------------------------------------
INSERT INTO sms_templates (code, name, locale, content, variables) VALUES
    ('AUTH_OTP',             '인증번호 발송',    'ko',
     '[GADA] 인증번호: {{otp}}. 3분 이내 입력하세요.',
     '["otp"]'),
    ('AUTH_OTP',             '인증번호 발송',    'vi',
     '[GADA] Mã xác nhận: {{otp}}. Nhập trong 3 phút.',
     '["otp"]'),
    ('APPLICATION_RECEIVED', '지원 완료 안내',   'ko',
     '[GADA] {{job_title}} 공고에 지원이 완료되었습니다.',
     '["job_title"]'),
    ('APPLICATION_RECEIVED', '지원 완료 안내',   'vi',
     '[GADA] Bạn đã ứng tuyển thành công vào {{job_title}}.',
     '["job_title"]'),
    ('APPLICATION_ACCEPTED', '합격 안내',        'ko',
     '[GADA] 축하합니다! {{job_title}} 공고에 합격하셨습니다.',
     '["job_title"]'),
    ('APPLICATION_ACCEPTED', '합격 안내',        'vi',
     '[GADA] Chúc mừng! Bạn đã được chấp nhận vào {{job_title}}.',
     '["job_title"]'),
    ('APPLICATION_REJECTED', '불합격 안내',      'ko',
     '[GADA] {{job_title}} 공고에 아쉽게도 합격하지 못했습니다.',
     '["job_title"]'),
    ('SCOUT_RECEIVED',       '스카우트 제안',    'ko',
     '[GADA] {{company_name}}에서 스카우트 제안이 도착했습니다.',
     '["company_name"]'),
    ('CONTRACT_SENT',        '계약서 발송',      'ko',
     '[GADA] {{job_title}} 계약서가 발송되었습니다. 확인 후 서명해주세요.',
     '["job_title"]')
ON CONFLICT (code, locale) DO NOTHING;

-- -------------------------------------------------------
-- 4.5  Additional regions seed (provinces missing from V1)
-- -------------------------------------------------------
INSERT INTO regions (sido, sigungu) VALUES
    -- 강원특별자치도
    ('강원특별자치도', '춘천시'),
    ('강원특별자치도', '원주시'),
    ('강원특별자치도', '강릉시'),
    ('강원특별자치도', '동해시'),
    ('강원특별자치도', '속초시'),
    -- 충청북도
    ('충청북도', '청주시'),
    ('충청북도', '충주시'),
    ('충청북도', '제천시'),
    -- 충청남도
    ('충청남도', '천안시'),
    ('충청남도', '아산시'),
    ('충청남도', '서산시'),
    ('충청남도', '당진시'),
    -- 전북특별자치도
    ('전북특별자치도', '전주시'),
    ('전북특별자치도', '익산시'),
    ('전북특별자치도', '군산시'),
    ('전북특별자치도', '정읍시'),
    -- 전라남도
    ('전라남도', '여수시'),
    ('전라남도', '순천시'),
    ('전라남도', '목포시'),
    ('전라남도', '광양시'),
    -- 경상북도
    ('경상북도', '포항시'),
    ('경상북도', '경주시'),
    ('경상북도', '구미시'),
    ('경상북도', '안동시'),
    ('경상북도', '김천시'),
    -- 경상남도
    ('경상남도', '창원시'),
    ('경상남도', '진주시'),
    ('경상남도', '김해시'),
    ('경상남도', '거제시'),
    ('경상남도', '양산시'),
    -- 제주특별자치도
    ('제주특별자치도', '제주시'),
    ('제주특별자치도', '서귀포시')
ON CONFLICT (sido, sigungu, dong) DO NOTHING;

-- =============================================================
-- 5. ADDITIONAL FULL-TEXT SEARCH INDEXES
-- =============================================================

-- Worker full-text search (trigram on full_name)
CREATE INDEX IF NOT EXISTS idx_worker_profiles_fullname_trgm
    ON worker_profiles USING gin (full_name gin_trgm_ops);

-- Job title full-text search
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
    ON jobs USING gin (title gin_trgm_ops) WHERE deleted_at IS NULL;

-- Team name full-text search
CREATE INDEX IF NOT EXISTS idx_teams_name_trgm
    ON teams USING gin (name gin_trgm_ops) WHERE deleted_at IS NULL;

-- =============================================================
-- 6. TRIGGER: auto-update updated_at
-- =============================================================

-- Generic trigger function (CREATE OR REPLACE is idempotent)
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all relevant tables (DO block prevents duplicate trigger errors)
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'users', 'worker_profiles', 'employer_profiles',
        'companies', 'sites', 'teams', 'jobs',
        'applications', 'scouts', 'notifications',
        'certifications', 'portfolios',
        'sms_templates', 'sms_send_logs', 'contracts'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE  tgname   = 'set_updated_at_' || tbl
              AND  tgrelid  = tbl::regclass
        ) THEN
            EXECUTE format(
                'CREATE TRIGGER set_updated_at_%I
                 BEFORE UPDATE ON %I
                 FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
                tbl, tbl
            );
        END IF;
    END LOOP;
END $$;
