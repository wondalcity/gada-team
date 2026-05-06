-- =================================================================
-- GADA Hiring Platform — Full Schema (V1-V29, excluding seed/test)
-- Generated from Spring Boot Flyway migrations
-- =================================================================


-- =================================================================
-- V1__init_schema.sql
-- =================================================================
-- =============================================================
-- GADA Hiring Platform — V1 Initial Schema
-- PostgreSQL 16
-- =============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================================
-- ENUMS
-- =============================================================

CREATE TYPE user_role AS ENUM ('WORKER', 'EMPLOYER', 'ADMIN');
CREATE TYPE user_status AS ENUM ('PENDING', 'ACTIVE', 'INACTIVE', 'SUSPENDED');

CREATE TYPE visa_type AS ENUM (
    'CITIZEN',   -- 내국인
    'F4',        -- 재외동포
    'F5',        -- 영주
    'F6',        -- 결혼이민
    'H2',        -- 방문취업
    'E9',        -- 비전문취업
    'E7',        -- 특정활동
    'D8',        -- 기업투자
    'OTHER'
);

CREATE TYPE health_check_status AS ENUM ('NOT_DONE', 'SCHEDULED', 'COMPLETED', 'EXPIRED');
CREATE TYPE team_type AS ENUM ('SQUAD', 'COMPANY_LINKED');
CREATE TYPE team_status AS ENUM ('ACTIVE', 'INACTIVE', 'DISSOLVED');
CREATE TYPE team_member_role AS ENUM ('LEADER', 'MEMBER');
CREATE TYPE company_status AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'CLOSED');
CREATE TYPE site_status AS ENUM ('PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED');
CREATE TYPE job_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CLOSED', 'ARCHIVED');
CREATE TYPE application_type AS ENUM ('INDIVIDUAL', 'TEAM', 'COMPANY');
CREATE TYPE application_status AS ENUM (
    'PENDING',
    'REVIEWING',
    'SHORTLISTED',
    'ACCEPTED',
    'REJECTED',
    'WITHDRAWN',
    'CANCELLED'
);
CREATE TYPE pay_unit AS ENUM ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'LUMP_SUM');
CREATE TYPE employer_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
CREATE TYPE notification_type AS ENUM ('APPLICATION', 'SCOUT', 'STATUS_CHANGE', 'SYSTEM', 'MARKETING');
CREATE TYPE scout_response AS ENUM ('ACCEPTED', 'DECLINED');

-- =============================================================
-- USERS
-- =============================================================

CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    public_id    UUID         NOT NULL DEFAULT uuid_generate_v4(),
    phone        VARCHAR(20)  NOT NULL,
    firebase_uid VARCHAR(128),
    role         user_role    NOT NULL,
    status       user_status  NOT NULL DEFAULT 'PENDING',
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at   TIMESTAMPTZ,

    CONSTRAINT uq_users_public_id    UNIQUE (public_id),
    CONSTRAINT uq_users_phone        UNIQUE (phone),
    CONSTRAINT uq_users_firebase_uid UNIQUE (firebase_uid)
);

CREATE INDEX idx_users_role_status ON users (role, status) WHERE deleted_at IS NULL;

-- =============================================================
-- WORKER PROFILES
-- =============================================================

CREATE TABLE worker_profiles (
    id                     BIGSERIAL    PRIMARY KEY,
    public_id              UUID         NOT NULL DEFAULT uuid_generate_v4(),
    user_id                BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    full_name              VARCHAR(100) NOT NULL,
    birth_date             DATE         NOT NULL,
    profile_image_url      VARCHAR(500),

    -- Identity
    nationality            VARCHAR(10)  NOT NULL DEFAULT 'KR',
    visa_type              visa_type    NOT NULL DEFAULT 'CITIZEN',

    -- Preferences (JSONB arrays)
    languages              JSONB        NOT NULL DEFAULT '[]',
    desired_job_categories JSONB        NOT NULL DEFAULT '[]',
    equipment              JSONB        NOT NULL DEFAULT '[]',
    certifications         JSONB        NOT NULL DEFAULT '[]',
    portfolio              JSONB        NOT NULL DEFAULT '[]',

    -- Pay expectation
    desired_pay_min        INTEGER,
    desired_pay_max        INTEGER,
    desired_pay_unit       pay_unit,

    -- Health
    health_check_status    health_check_status NOT NULL DEFAULT 'NOT_DONE',
    health_check_expiry    DATE,

    bio                    TEXT,
    is_public              BOOLEAN      NOT NULL DEFAULT TRUE,

    created_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at             TIMESTAMPTZ,

    CONSTRAINT uq_worker_profiles_public_id UNIQUE (public_id),
    CONSTRAINT uq_worker_profiles_user_id   UNIQUE (user_id)
);

CREATE INDEX idx_worker_profiles_nationality     ON worker_profiles (nationality);
CREATE INDEX idx_worker_profiles_visa_type       ON worker_profiles (visa_type);
CREATE INDEX idx_worker_profiles_health_check    ON worker_profiles (health_check_status);
CREATE INDEX idx_worker_profiles_job_categories  ON worker_profiles USING gin (desired_job_categories);
CREATE INDEX idx_worker_profiles_certifications  ON worker_profiles USING gin (certifications);

-- =============================================================
-- COMPANIES
-- =============================================================

CREATE TABLE companies (
    id                           BIGSERIAL    PRIMARY KEY,
    public_id                    UUID         NOT NULL DEFAULT uuid_generate_v4(),
    name                         VARCHAR(200) NOT NULL,
    business_registration_number VARCHAR(20),
    ceo_name                     VARCHAR(100),
    address                      VARCHAR(500),
    phone                        VARCHAR(20),
    email                        VARCHAR(200),
    website_url                  VARCHAR(500),
    description                  TEXT,
    logo_url                     VARCHAR(500),
    status                       company_status NOT NULL DEFAULT 'PENDING',
    verified_at                  TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at                   TIMESTAMPTZ,

    CONSTRAINT uq_companies_public_id UNIQUE (public_id),
    CONSTRAINT uq_companies_brn       UNIQUE (business_registration_number)
);

CREATE INDEX idx_companies_status    ON companies (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_companies_name_trgm ON companies USING gin (name gin_trgm_ops);

-- =============================================================
-- EMPLOYER PROFILES
-- =============================================================

CREATE TABLE employer_profiles (
    id         BIGSERIAL    PRIMARY KEY,
    public_id  UUID         NOT NULL DEFAULT uuid_generate_v4(),
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    company_id BIGINT       REFERENCES companies (id) ON DELETE SET NULL,
    full_name  VARCHAR(100) NOT NULL,
    position   VARCHAR(100),
    role       employer_role NOT NULL DEFAULT 'STAFF',
    created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT uq_employer_profiles_public_id UNIQUE (public_id),
    CONSTRAINT uq_employer_profiles_user_company UNIQUE (user_id, company_id)
);

CREATE INDEX idx_employer_profiles_company_id ON employer_profiles (company_id);

-- =============================================================
-- REGIONS (시/군/구)
-- =============================================================

CREATE TABLE regions (
    id      BIGSERIAL   PRIMARY KEY,
    sido    VARCHAR(50) NOT NULL,
    sigungu VARCHAR(50) NOT NULL,
    dong    VARCHAR(50),
    code    VARCHAR(20),

    CONSTRAINT uq_regions_code          UNIQUE (code),
    CONSTRAINT uq_regions_sido_sigungu  UNIQUE (sido, sigungu, dong)
);

CREATE INDEX idx_regions_sido    ON regions (sido);
CREATE INDEX idx_regions_sigungu ON regions (sigungu);

-- =============================================================
-- SITES (건설 현장)
-- =============================================================

CREATE TABLE sites (
    id             BIGSERIAL    PRIMARY KEY,
    public_id      UUID         NOT NULL DEFAULT uuid_generate_v4(),
    company_id     BIGINT       NOT NULL REFERENCES companies (id) ON DELETE CASCADE,
    region_id      BIGINT       REFERENCES regions (id),
    name           VARCHAR(200) NOT NULL,
    address        VARCHAR(500) NOT NULL,
    address_detail VARCHAR(200),
    latitude       DECIMAL(10, 8),
    longitude      DECIMAL(11, 8),
    description    TEXT,
    status         site_status  NOT NULL DEFAULT 'PLANNING',
    start_date     DATE,
    end_date       DATE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at     TIMESTAMPTZ,

    CONSTRAINT uq_sites_public_id UNIQUE (public_id)
);

CREATE INDEX idx_sites_company_id ON sites (company_id);
CREATE INDEX idx_sites_region_id  ON sites (region_id);
CREATE INDEX idx_sites_status     ON sites (status) WHERE deleted_at IS NULL;
-- Geo index for radius searches (used with Haversine formula)
CREATE INDEX idx_sites_lat_lng ON sites (latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND deleted_at IS NULL;

-- =============================================================
-- JOB CATEGORIES
-- =============================================================

CREATE TABLE job_categories (
    id             BIGSERIAL    PRIMARY KEY,
    public_id      UUID         NOT NULL DEFAULT uuid_generate_v4(),
    code           VARCHAR(50)  NOT NULL,
    name_ko        VARCHAR(100) NOT NULL,
    name_en        VARCHAR(100),
    name_vi        VARCHAR(100),
    description_ko TEXT,
    description_en TEXT,
    description_vi TEXT,
    icon_url       VARCHAR(500),
    parent_id      BIGINT       REFERENCES job_categories (id),
    sort_order     INTEGER      NOT NULL DEFAULT 0,
    is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_job_categories_public_id UNIQUE (public_id),
    CONSTRAINT uq_job_categories_code      UNIQUE (code)
);

CREATE INDEX idx_job_categories_parent_id ON job_categories (parent_id);

-- =============================================================
-- JOBS (채용 공고)
-- =============================================================

CREATE TABLE jobs (
    id                         BIGSERIAL    PRIMARY KEY,
    public_id                  UUID         NOT NULL DEFAULT uuid_generate_v4(),
    site_id                    BIGINT       NOT NULL REFERENCES sites (id) ON DELETE CASCADE,
    company_id                 BIGINT       NOT NULL REFERENCES companies (id),  -- denormalized
    job_category_id            BIGINT       REFERENCES job_categories (id),
    title                      VARCHAR(300) NOT NULL,
    description                TEXT,
    required_count             INTEGER,

    -- Application settings
    application_types          JSONB        NOT NULL DEFAULT '["INDIVIDUAL","TEAM","COMPANY"]',

    -- Pay
    pay_min                    INTEGER,
    pay_max                    INTEGER,
    pay_unit                   pay_unit     NOT NULL DEFAULT 'DAILY',

    -- Requirements
    visa_requirements          JSONB        NOT NULL DEFAULT '[]',
    certification_requirements JSONB        NOT NULL DEFAULT '[]',
    equipment_requirements     JSONB        NOT NULL DEFAULT '[]',
    health_check_required      BOOLEAN      NOT NULL DEFAULT FALSE,
    nationality_requirements    JSONB        NOT NULL DEFAULT '[]',

    -- Scheduling
    always_open                BOOLEAN      NOT NULL DEFAULT FALSE,
    start_date                 DATE,
    end_date                   DATE,

    -- State
    status                     job_status   NOT NULL DEFAULT 'DRAFT',
    view_count                 INTEGER      NOT NULL DEFAULT 0,
    application_count          INTEGER      NOT NULL DEFAULT 0,
    published_at               TIMESTAMPTZ,

    created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at                 TIMESTAMPTZ,

    CONSTRAINT uq_jobs_public_id UNIQUE (public_id)
);

CREATE INDEX idx_jobs_site_id          ON jobs (site_id);
CREATE INDEX idx_jobs_company_id       ON jobs (company_id);
CREATE INDEX idx_jobs_category_id      ON jobs (job_category_id);
CREATE INDEX idx_jobs_status           ON jobs (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_jobs_published        ON jobs (status, published_at DESC) WHERE status = 'PUBLISHED' AND deleted_at IS NULL;
CREATE INDEX idx_jobs_app_types        ON jobs USING gin (application_types);
CREATE INDEX idx_jobs_visa_req         ON jobs USING gin (visa_requirements);

-- =============================================================
-- TEAMS
-- =============================================================

CREATE TABLE teams (
    id                 BIGSERIAL    PRIMARY KEY,
    public_id          UUID         NOT NULL DEFAULT uuid_generate_v4(),
    name               VARCHAR(200) NOT NULL,
    leader_id          BIGINT       NOT NULL REFERENCES users (id),
    team_type          team_type    NOT NULL DEFAULT 'SQUAD',
    company_id         BIGINT       REFERENCES companies (id),
    intro_short        VARCHAR(500),
    intro_long         TEXT,
    intro_multilingual JSONB        NOT NULL DEFAULT '{}',  -- {ko: "...", en: "...", vi: "..."}
    is_nationwide      BOOLEAN      NOT NULL DEFAULT FALSE,
    regions            JSONB        NOT NULL DEFAULT '[]',  -- [{sido, sigungu}]
    equipment          JSONB        NOT NULL DEFAULT '[]',
    portfolio          JSONB        NOT NULL DEFAULT '[]',
    member_count       INTEGER      NOT NULL DEFAULT 1,
    status             team_status  NOT NULL DEFAULT 'ACTIVE',
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ,

    CONSTRAINT uq_teams_public_id UNIQUE (public_id)
);

CREATE INDEX idx_teams_leader_id  ON teams (leader_id);
CREATE INDEX idx_teams_company_id ON teams (company_id);
CREATE INDEX idx_teams_status     ON teams (status) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_regions    ON teams USING gin (regions);

-- =============================================================
-- TEAM MEMBERS
-- =============================================================

CREATE TABLE team_members (
    id        BIGSERIAL        PRIMARY KEY,
    team_id   BIGINT           NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
    user_id   BIGINT           NOT NULL REFERENCES users (id),
    role      team_member_role NOT NULL DEFAULT 'MEMBER',
    joined_at TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    left_at   TIMESTAMPTZ,

    CONSTRAINT uq_team_members_team_user UNIQUE (team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members (team_id);
CREATE INDEX idx_team_members_user_id ON team_members (user_id);

-- =============================================================
-- APPLICATIONS
-- =============================================================

CREATE TABLE applications (
    id                BIGSERIAL          PRIMARY KEY,
    public_id         UUID               NOT NULL DEFAULT uuid_generate_v4(),
    job_id            BIGINT             NOT NULL REFERENCES jobs (id),
    application_type  application_type   NOT NULL,
    applicant_user_id BIGINT             REFERENCES users (id),
    team_id           BIGINT             REFERENCES teams (id),
    company_id        BIGINT             REFERENCES companies (id),
    status            application_status NOT NULL DEFAULT 'PENDING',
    cover_letter      TEXT,
    employer_note     TEXT,
    reviewed_by       BIGINT             REFERENCES users (id),
    reviewed_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    deleted_at        TIMESTAMPTZ,

    CONSTRAINT uq_applications_public_id UNIQUE (public_id),
    -- One applicant/team/company can only apply once per job
    CONSTRAINT uq_application_individual UNIQUE (job_id, applicant_user_id)
        DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT uq_application_team       UNIQUE (job_id, team_id)
        DEFERRABLE INITIALLY DEFERRED,

    -- Exactly one of applicant_user_id / team_id / company_id must be set
    CONSTRAINT chk_application_subject CHECK (
        (application_type = 'INDIVIDUAL' AND applicant_user_id IS NOT NULL AND team_id IS NULL AND company_id IS NULL)
        OR (application_type = 'TEAM' AND team_id IS NOT NULL AND applicant_user_id IS NULL AND company_id IS NULL)
        OR (application_type = 'COMPANY' AND company_id IS NOT NULL AND applicant_user_id IS NULL AND team_id IS NULL)
    )
);

CREATE INDEX idx_applications_job_id            ON applications (job_id);
CREATE INDEX idx_applications_applicant_user_id ON applications (applicant_user_id);
CREATE INDEX idx_applications_team_id           ON applications (team_id);
CREATE INDEX idx_applications_company_id        ON applications (company_id);
CREATE INDEX idx_applications_status            ON applications (status);
CREATE INDEX idx_applications_job_status        ON applications (job_id, status) WHERE deleted_at IS NULL;

-- =============================================================
-- APPLICATION STATUS HISTORY
-- =============================================================

CREATE TABLE application_status_history (
    id             BIGSERIAL          PRIMARY KEY,
    application_id BIGINT             NOT NULL REFERENCES applications (id) ON DELETE CASCADE,
    from_status    application_status,
    to_status      application_status NOT NULL,
    changed_by     BIGINT             REFERENCES users (id),
    note           VARCHAR(500),
    created_at     TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_app_status_history_application_id ON application_status_history (application_id);

-- =============================================================
-- SCOUTS
-- =============================================================

CREATE TABLE scouts (
    id             BIGSERIAL      PRIMARY KEY,
    public_id      UUID           NOT NULL DEFAULT uuid_generate_v4(),
    job_id         BIGINT         NOT NULL REFERENCES jobs (id),
    sender_user_id BIGINT         NOT NULL REFERENCES users (id),
    target_user_id BIGINT         REFERENCES users (id),
    target_team_id BIGINT         REFERENCES teams (id),
    message        TEXT           NOT NULL,
    is_read        BOOLEAN        NOT NULL DEFAULT FALSE,
    read_at        TIMESTAMPTZ,
    responded_at   TIMESTAMPTZ,
    response       scout_response,
    created_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_scouts_public_id UNIQUE (public_id),
    CONSTRAINT chk_scout_target CHECK (
        (target_user_id IS NOT NULL AND target_team_id IS NULL)
        OR (target_team_id IS NOT NULL AND target_user_id IS NULL)
    )
);

CREATE INDEX idx_scouts_job_id         ON scouts (job_id);
CREATE INDEX idx_scouts_target_user_id ON scouts (target_user_id);
CREATE INDEX idx_scouts_target_team_id ON scouts (target_team_id);
CREATE INDEX idx_scouts_unread         ON scouts (target_user_id, is_read) WHERE is_read = FALSE;

-- =============================================================
-- NOTIFICATIONS
-- =============================================================

CREATE TABLE notifications (
    id         BIGSERIAL         PRIMARY KEY,
    public_id  UUID              NOT NULL DEFAULT uuid_generate_v4(),
    user_id    BIGINT            NOT NULL REFERENCES users (id),
    type       notification_type NOT NULL,
    title      VARCHAR(200)      NOT NULL,
    body       TEXT              NOT NULL,
    data       JSONB             NOT NULL DEFAULT '{}',
    is_read    BOOLEAN           NOT NULL DEFAULT FALSE,
    read_at    TIMESTAMPTZ,
    created_at TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_notifications_public_id UNIQUE (public_id)
);

CREATE INDEX idx_notifications_user_id     ON notifications (user_id);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_created_at  ON notifications (created_at DESC);

-- =============================================================
-- AUDIT LOGS
-- =============================================================

CREATE TABLE audit_logs (
    id          BIGSERIAL   PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id   BIGINT       NOT NULL,
    action      VARCHAR(50)  NOT NULL,   -- CREATE, UPDATE, DELETE, RESTORE
    actor_id    BIGINT       REFERENCES users (id),
    actor_role  user_role,
    old_data    JSONB,
    new_data    JSONB,
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_entity     ON audit_logs (entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor_id   ON audit_logs (actor_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);

-- =============================================================
-- JOB INTRO CONTENTS (직종 소개 페이지)
-- =============================================================

CREATE TABLE job_intro_contents (
    id             BIGSERIAL    PRIMARY KEY,
    public_id      UUID         NOT NULL DEFAULT uuid_generate_v4(),
    category_id    BIGINT       NOT NULL REFERENCES job_categories (id),
    locale         VARCHAR(10)  NOT NULL DEFAULT 'ko',
    title          VARCHAR(300) NOT NULL,
    subtitle       VARCHAR(500),
    body           TEXT         NOT NULL,
    hero_image_url VARCHAR(500),
    is_published   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_job_intro_contents_public_id       UNIQUE (public_id),
    CONSTRAINT uq_job_intro_contents_category_locale UNIQUE (category_id, locale)
);

-- =============================================================
-- FAQs
-- =============================================================

CREATE TABLE faqs (
    id           BIGSERIAL    PRIMARY KEY,
    public_id    UUID         NOT NULL DEFAULT uuid_generate_v4(),
    category     VARCHAR(100),
    locale       VARCHAR(10)  NOT NULL DEFAULT 'ko',
    question     TEXT         NOT NULL,
    answer       TEXT         NOT NULL,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    is_published BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_faqs_public_id UNIQUE (public_id)
);

CREATE INDEX idx_faqs_category_locale ON faqs (category, locale) WHERE is_published = TRUE;

-- =============================================================
-- SEED: Job Categories (직종)
-- =============================================================

INSERT INTO job_categories (code, name_ko, name_en, name_vi, sort_order) VALUES
    ('CONCRETE',   '콘크리트공',  'Concrete Worker',     'Thợ bê tông',         1),
    ('REBAR',      '철근공',      'Rebar Worker',         'Thợ cốt thép',        2),
    ('FORM',       '거푸집공',    'Formwork Carpenter',   'Thợ cốp pha',         3),
    ('MASONRY',    '조적공',      'Masonry Worker',       'Thợ xây',             4),
    ('TILE',       '타일공',      'Tile Layer',           'Thợ lát gạch',        5),
    ('PLUMBING',   '배관공',      'Plumber',              'Thợ ống nước',        6),
    ('ELECTRICAL', '전기공',      'Electrician',          'Thợ điện',            7),
    ('PAINTING',   '도장공',      'Painter',              'Thợ sơn',             8),
    ('SCAFFOLD',   '비계공',      'Scaffold Worker',      'Thợ giàn giáo',       9),
    ('WATERPROOF', '방수공',      'Waterproofer',         'Thợ chống thấm',     10),
    ('CRANE',      '크레인 기사', 'Crane Operator',       'Vận hành cần cẩu',   11),
    ('EXCAVATOR',  '굴삭기 기사', 'Excavator Operator',  'Vận hành máy đào',   12),
    ('WELDER',     '용접공',      'Welder',               'Thợ hàn',            13),
    ('INTERIOR',   '인테리어공',  'Interior Finisher',   'Thợ nội thất',       14),
    ('GENERAL',    '일반 노무',   'General Labor',        'Lao động phổ thông', 15);

-- =============================================================
-- SEED: Regions (주요 시/군/구)
-- =============================================================

INSERT INTO regions (sido, sigungu) VALUES
    -- 서울
    ('서울특별시', '강남구'), ('서울특별시', '강동구'), ('서울특별시', '강북구'),
    ('서울특별시', '강서구'), ('서울특별시', '관악구'), ('서울특별시', '광진구'),
    ('서울특별시', '구로구'), ('서울특별시', '금천구'), ('서울특별시', '노원구'),
    ('서울특별시', '도봉구'), ('서울특별시', '동대문구'), ('서울특별시', '동작구'),
    ('서울특별시', '마포구'), ('서울특별시', '서대문구'), ('서울특별시', '서초구'),
    ('서울특별시', '성동구'), ('서울특별시', '성북구'), ('서울특별시', '송파구'),
    ('서울특별시', '양천구'), ('서울특별시', '영등포구'), ('서울특별시', '용산구'),
    ('서울특별시', '은평구'), ('서울특별시', '종로구'), ('서울특별시', '중구'),
    ('서울특별시', '중랑구'),
    -- 경기
    ('경기도', '수원시'), ('경기도', '성남시'), ('경기도', '안양시'),
    ('경기도', '부천시'), ('경기도', '광명시'), ('경기도', '평택시'),
    ('경기도', '안산시'), ('경기도', '고양시'), ('경기도', '용인시'),
    ('경기도', '화성시'), ('경기도', '남양주시'), ('경기도', '의정부시'),
    ('경기도', '시흥시'), ('경기도', '파주시'), ('경기도', '김포시'),
    -- 인천
    ('인천광역시', '연수구'), ('인천광역시', '남동구'), ('인천광역시', '부평구'),
    ('인천광역시', '서구'), ('인천광역시', '미추홀구'),
    -- 부산
    ('부산광역시', '해운대구'), ('부산광역시', '부산진구'), ('부산광역시', '동래구'),
    ('부산광역시', '남구'), ('부산광역시', '북구'), ('부산광역시', '사하구'),
    -- 대구
    ('대구광역시', '달서구'), ('대구광역시', '수성구'), ('대구광역시', '북구'),
    -- 광주
    ('광주광역시', '북구'), ('광주광역시', '서구'), ('광주광역시', '남구'),
    -- 대전
    ('대전광역시', '유성구'), ('대전광역시', '서구'), ('대전광역시', '대덕구'),
    -- 울산
    ('울산광역시', '남구'), ('울산광역시', '북구'), ('울산광역시', '동구'),
    -- 세종
    ('세종특별자치시', '세종시');


-- =================================================================
-- V2__add_team_leader_role.sql
-- =================================================================
-- ============================================================
-- V2: Add TEAM_LEADER to user_role enum + minor additions
-- ============================================================

-- PostgreSQL lets you ADD values to existing enums (irreversible, but safe)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'TEAM_LEADER';

-- Add deleted_at to job_categories so admins can soft-delete them
ALTER TABLE job_categories
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to job_intro_contents for admin soft-delete
ALTER TABLE job_intro_contents
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at to faqs for admin soft-delete
ALTER TABLE faqs
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add updated_at to scouts (status can change: unread → read → responded)
ALTER TABLE scouts
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Add updated_at to notifications (is_read flag can flip)
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Partial indexes for new soft-delete columns
CREATE INDEX IF NOT EXISTS idx_job_categories_deleted ON job_categories (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_job_intro_deleted       ON job_intro_contents (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_faqs_deleted            ON faqs (deleted_at) WHERE deleted_at IS NULL;


-- =================================================================
-- V3__production_schema.sql
-- =================================================================
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


-- =================================================================
-- V4__critical_fixes.sql
-- =================================================================
-- V4__critical_fixes.sql
-- Critical fixes identified by frontend review agents (worker web + admin)
-- Applied: 2026-04-01

-- ============================================================
-- FIX 1: Job welfare benefits (worker web review)
-- ============================================================
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS accommodation_provided  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS meal_provided           BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS transportation_provided BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- FIX 2: Team member invitation flow (worker web review)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
    CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
  END IF;
END $$;

ALTER TABLE team_members
    ADD COLUMN IF NOT EXISTS invitation_status invitation_status NOT NULL DEFAULT 'ACCEPTED',
    ADD COLUMN IF NOT EXISTS invited_by        BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS invited_at        TIMESTAMPTZ;

-- Backfill: existing rows are already accepted
UPDATE team_members SET invitation_status = 'ACCEPTED' WHERE invitation_status IS NULL;

-- ============================================================
-- FIX 3: Scout expiry + deleted_at (worker web review)
-- ============================================================
ALTER TABLE scouts
    ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
    ADD COLUMN IF NOT EXISTS deleted_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_scouts_expires_at ON scouts (expires_at) WHERE response IS NULL;

-- ============================================================
-- FIX 4: Worker preferred regions (worker web review)
-- ============================================================
ALTER TABLE worker_profiles
    ADD COLUMN IF NOT EXISTS preferred_regions JSONB NOT NULL DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_worker_profiles_preferred_regions
    ON worker_profiles USING gin (preferred_regions);

-- ============================================================
-- FIX 5: Certification verification lifecycle (worker web review)
-- Replace is_verified boolean with a full status enum
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM ('UNSUBMITTED', 'PENDING_REVIEW', 'VERIFIED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE certifications
    ADD COLUMN IF NOT EXISTS verification_status verification_status NOT NULL DEFAULT 'UNSUBMITTED',
    ADD COLUMN IF NOT EXISTS verified_by         BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS verified_at         TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejection_reason    TEXT;

-- Migrate existing is_verified data
UPDATE certifications
SET verification_status = CASE WHEN is_verified = TRUE THEN 'VERIFIED'::verification_status
                               ELSE 'UNSUBMITTED'::verification_status END
WHERE verification_status = 'UNSUBMITTED';

-- ============================================================
-- FIX 6: Company admin fields (admin review)
-- ============================================================
ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS admin_note        TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason  TEXT,
    ADD COLUMN IF NOT EXISTS verified_by       BIGINT REFERENCES users (id);

-- ============================================================
-- FIX 7: Job poster tracking (admin review)
-- ============================================================
ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS poster_user_id  BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS closed_by       BIGINT REFERENCES users (id),
    ADD COLUMN IF NOT EXISTS closed_reason   TEXT;

CREATE INDEX IF NOT EXISTS idx_jobs_poster_user_id ON jobs (poster_user_id);

-- ============================================================
-- FIX 8: Application rejection reason + status timestamps (admin review)
-- ============================================================
ALTER TABLE applications
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS shortlisted_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS accepted_at      TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ;

-- ============================================================
-- FIX 9: Audit log request correlation (admin review)
-- ============================================================
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS request_id VARCHAR(36);  -- UUID correlation ID

CREATE INDEX IF NOT EXISTS idx_audit_logs_request_id ON audit_logs (request_id) WHERE request_id IS NOT NULL;

-- ============================================================
-- FIX 10: SMS retry fields (admin review)
-- ============================================================
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS retry_count    SMALLINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS next_retry_at  TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS max_retries    SMALLINT NOT NULL DEFAULT 3;

CREATE INDEX IF NOT EXISTS idx_sms_logs_retry ON sms_send_logs (status, next_retry_at)
    WHERE status IN ('PENDING', 'FAILED') AND retry_count < max_retries;

-- ============================================================
-- FIX 11: Job view events table (admin review — avoids hotspot on jobs.view_count)
-- ============================================================
CREATE TABLE IF NOT EXISTS job_view_events (
    id          BIGSERIAL    PRIMARY KEY,
    job_id      BIGINT       NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
    user_id     BIGINT       REFERENCES users (id),    -- NULL for anonymous
    ip_hash     VARCHAR(64),                           -- SHA-256 of IP for dedup
    viewed_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    viewed_date DATE         NOT NULL DEFAULT CURRENT_DATE  -- stored for IMMUTABLE dedup index
);

CREATE INDEX IF NOT EXISTS idx_job_view_events_job_id    ON job_view_events (job_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_view_events_viewed_at ON job_view_events (viewed_at DESC);
-- Dedup: one unique view per job per ip_hash per day (uses stored viewed_date — no expression needed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_view_dedup
    ON job_view_events (job_id, ip_hash, viewed_date)
    WHERE ip_hash IS NOT NULL;

-- ============================================================
-- FIX 12: Apply updated_at trigger to tables that were missing it
-- certifications, portfolios, sms_templates, sms_send_logs, contracts
-- (scouts and others already covered by V3; this is idempotent)
-- ============================================================
DO $$
DECLARE
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'certifications', 'portfolios', 'sms_templates', 'sms_send_logs', 'contracts'
    ] LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_trigger
            WHERE tgname = 'set_updated_at_' || tbl
              AND tgrelid = tbl::regclass
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


-- =================================================================
-- V5__team_features.sql
-- =================================================================
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


-- =================================================================
-- V6__application_ats.sql
-- =================================================================
-- flyway:executeInTransaction false
-- V6: Application ATS overhaul
-- Adds new ATS statuses and snapshot columns.
-- Note: Legacy status rename UPDATEs omitted — safe on fresh DB (no legacy rows).
-- On a live DB upgrade, run the UPDATEs manually in a separate session after migration.

-- ─── 1. Add new enum values ───────────────────────────────────────────────────
-- ALTER TYPE ADD VALUE is not transactional in PostgreSQL; executeInTransaction
-- false ensures each statement auto-commits so new values are visible immediately.
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'APPLIED';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'UNDER_REVIEW';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'INTERVIEW_PENDING';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'ON_HOLD';
ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'HIRED';

-- ─── 2. Add snapshot + flag columns ──────────────────────────────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS worker_snapshot  JSONB NOT NULL DEFAULT '{}';
ALTER TABLE applications ADD COLUMN IF NOT EXISTS team_snapshot    JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_snapshot JSONB;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_scouted       BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_verified      BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── 3. Add status_updated_at ────────────────────────────────────────────────
ALTER TABLE applications ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ─── 4. Index for scouted applications ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_applications_is_scouted ON applications (is_scouted) WHERE is_scouted = TRUE;


-- =================================================================
-- V7__content_model.sql
-- =================================================================
-- Extend job_intro_contents with rich JSONB sections
ALTER TABLE job_intro_contents
    ADD COLUMN IF NOT EXISTS work_characteristics JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS related_skills       JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS pricing_notes        JSONB,
    ADD COLUMN IF NOT EXISTS content_images       JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS meta_description     VARCHAR(300),
    ADD COLUMN IF NOT EXISTS reading_time_min     INT;

-- Link FAQs to job categories (nullable for backward compat)
ALTER TABLE faqs
    ADD COLUMN IF NOT EXISTS category_id BIGINT REFERENCES job_categories(id);

CREATE INDEX IF NOT EXISTS idx_faqs_category_id ON faqs (category_id) WHERE deleted_at IS NULL;

-- Seed rich Korean content for top 5 categories
-- Get category IDs dynamically using subqueries

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, is_published, work_characteristics, related_skills, pricing_notes, reading_time_min)
SELECT
    c.id,
    'ko',
    '콘크리트공 직종 가이드',
    '건설 현장의 기초를 다지는 전문 기술자',
    '콘크리트공은 건물의 기초, 기둥, 보, 슬래브 등 구조물을 콘크리트로 시공하는 전문 직종입니다. 레미콘 타설, 양생 관리, 표면 마감까지 전 과정을 담당하며 건설 현장에서 가장 핵심적인 역할을 수행합니다.',
    TRUE,
    '[
        {"title":"작업 강도", "description":"중장비 보조 및 수작업이 많아 체력 소모가 큰 편입니다. 하루 8~10시간 연속 작업이 기본입니다."},
        {"title":"팀워크", "description":"레미콘 차량 일정에 맞춰 팀 전체가 동시에 작업하므로 협업 능력이 필수입니다."},
        {"title":"날씨 영향", "description":"기온 5°C 이하 또는 35°C 이상에서는 타설이 제한됩니다. 계절별 작업량 편차가 큽니다."}
    ]'::jsonb,
    '[
        {"name":"콘크리트 타설", "level":"필수"},
        {"name":"양생 관리", "level":"필수"},
        {"name":"레벨링", "level":"권장"},
        {"name":"거푸집 이해", "level":"권장"}
    ]'::jsonb,
    '[
        {"type":"DAILY","minAmount":180000,"maxAmount":250000,"note":"일반 타설 기준"},
        {"type":"DAILY","minAmount":250000,"maxAmount":350000,"note":"고강도 특수 타설"}
    ]'::jsonb,
    5
FROM job_categories c WHERE c.code = 'CONCRETE'
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, is_published, work_characteristics, related_skills, pricing_notes, reading_time_min)
SELECT
    c.id, 'ko',
    '철근공 직종 가이드',
    '구조물의 뼈대를 만드는 정밀 기술 직종',
    '철근공은 건축 구조물의 내부 골격인 철근 배근 작업을 전문으로 합니다. 도면을 읽고 규격에 맞게 철근을 가공·조립하며, 구조 안전성에 직결되는 핵심 기술입니다.',
    TRUE,
    '[
        {"title":"도면 해독 능력", "description":"구조 설계 도면을 정확히 읽어야 하며, 철근 규격과 간격을 정밀하게 적용해야 합니다."},
        {"title":"육체적 작업", "description":"무거운 철근을 반복적으로 다루는 작업으로 허리·손목 부상 주의가 필요합니다."},
        {"title":"높이 작업", "description":"고층 작업 시 안전 장비 착용이 필수이며, 고소 작업 경험이 중요합니다."}
    ]'::jsonb,
    '[
        {"name":"철근 가공 및 절단", "level":"필수"},
        {"name":"철근 조립 및 결속", "level":"필수"},
        {"name":"도면 판독", "level":"필수"},
        {"name":"용접 기초", "level":"선택"}
    ]'::jsonb,
    '[
        {"type":"DAILY","minAmount":200000,"maxAmount":280000,"note":"일반 배근 기준"},
        {"type":"DAILY","minAmount":280000,"maxAmount":380000,"note":"특수 구조물 배근"}
    ]'::jsonb,
    4
FROM job_categories c WHERE c.code = 'REBAR'
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, is_published, work_characteristics, related_skills, pricing_notes, reading_time_min)
SELECT
    c.id, 'ko',
    '전기공 직종 가이드',
    '안전하고 효율적인 전기 시스템 구축 전문가',
    '전기공은 건축물의 전기 배선, 분전반 설치, 조명 시스템, 전기 설비 공사를 담당합니다. 자격증 보유 여부가 취업과 임금에 큰 영향을 미치는 전문 기술직입니다.',
    TRUE,
    '[
        {"title":"자격증 중요도 높음", "description":"전기기능사 이상의 자격증 보유 시 현장 투입 범위와 임금이 크게 달라집니다."},
        {"title":"안전 민감 직종", "description":"감전 위험이 항상 존재하므로 절연 장갑, 검전기 등 보호 장비 착용이 필수입니다."},
        {"title":"도면 필독 능력", "description":"전기 도면(CAD)을 해석하여 배선 경로를 계획하고 시공해야 합니다."}
    ]'::jsonb,
    '[
        {"name":"전기 배선", "level":"필수"},
        {"name":"분전반 설치", "level":"필수"},
        {"name":"전기기능사 자격증", "level":"권장"},
        {"name":"CAD 도면 판독", "level":"권장"}
    ]'::jsonb,
    '[
        {"type":"DAILY","minAmount":200000,"maxAmount":300000,"note":"일반 전기 공사"},
        {"type":"DAILY","minAmount":300000,"maxAmount":420000,"note":"특수·고압 공사 (자격증 필요)"}
    ]'::jsonb,
    5
FROM job_categories c WHERE c.code = 'ELECTRICAL'
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, is_published, work_characteristics, related_skills, pricing_notes, reading_time_min)
SELECT
    c.id, 'ko',
    '용접공 직종 가이드',
    '금속 구조물을 정밀하게 연결하는 기술 전문가',
    '용접공은 금속 부재를 열로 용융·접합하는 전문 기술자입니다. 건설 현장의 철골 구조물부터 플랜트 배관까지 넓은 분야에서 활약하며, 기술 등급에 따라 임금 차이가 매우 큽니다.',
    TRUE,
    '[
        {"title":"자격증 등급별 임금 차이 큼", "description":"특수 용접 자격 보유 시 일반 용접 대비 30~50% 이상 높은 임금을 받을 수 있습니다."},
        {"title":"유해 환경", "description":"용접 흄, 자외선, 열에 지속 노출되므로 방진마스크, 차광 안면 보호구 착용이 필수입니다."},
        {"title":"다양한 작업 환경", "description":"실내 공장 작업부터 고층 현장 철골 작업까지 다양한 환경에서 작업합니다."}
    ]'::jsonb,
    '[
        {"name":"아크 용접", "level":"필수"},
        {"name":"CO2 용접", "level":"필수"},
        {"name":"TIG 용접", "level":"고급"},
        {"name":"용접기능사 자격증", "level":"권장"}
    ]'::jsonb,
    '[
        {"type":"DAILY","minAmount":220000,"maxAmount":320000,"note":"일반 용접"},
        {"type":"DAILY","minAmount":320000,"maxAmount":480000,"note":"특수·플랜트 용접"}
    ]'::jsonb,
    4
FROM job_categories c WHERE c.code = 'WELDER'
ON CONFLICT (category_id, locale) DO NOTHING;

-- Seed FAQs for top categories
INSERT INTO faqs (category_id, locale, question, answer, sort_order, is_published)
SELECT c.id, 'ko', '콘크리트공이 되려면 어떤 자격증이 필요한가요?',
'콘크리트 관련 필수 자격증은 없지만 건설기능사(콘크리트) 자격증 취득 시 현장 신뢰도와 임금이 올라갑니다. 처음에는 무자격으로 시작해 경력을 쌓으면서 취득하는 경우가 많습니다.', 1, TRUE
FROM job_categories c WHERE c.code = 'CONCRETE'
ON CONFLICT DO NOTHING;

INSERT INTO faqs (category_id, locale, question, answer, sort_order, is_published)
SELECT c.id, 'ko', '외국인도 콘크리트공으로 일할 수 있나요?',
'네, 가능합니다. E-9(비전문취업), H-2(방문취업) 비자 소지자는 건설업 취업이 허용됩니다. GADA를 통해 합법적인 현장 매칭을 받으실 수 있습니다.', 2, TRUE
FROM job_categories c WHERE c.code = 'CONCRETE'
ON CONFLICT DO NOTHING;

INSERT INTO faqs (category_id, locale, question, answer, sort_order, is_published)
SELECT c.id, 'ko', '전기공 자격증 없이도 취업이 가능한가요?',
'보조 인력으로는 가능하지만, 실제 배선 작업을 하려면 전기기능사 자격증이 필요합니다. 자격증 취득 전에는 자격증 보유 기술자 밑에서 보조 업무를 수행하며 경험을 쌓을 수 있습니다.', 1, TRUE
FROM job_categories c WHERE c.code = 'ELECTRICAL'
ON CONFLICT DO NOTHING;

INSERT INTO faqs (category_id, locale, question, answer, sort_order, is_published)
SELECT c.id, 'ko', '용접공의 일당 범위는 어느 정도인가요?',
'일반 용접은 일당 22~32만원, 특수 용접(TIG, 플랜트)은 32~48만원 수준입니다. 보유 자격증, 작업 종류, 지역에 따라 크게 달라질 수 있습니다.', 1, TRUE
FROM job_categories c WHERE c.code = 'WELDER'
ON CONFLICT DO NOTHING;


-- =================================================================
-- V8__admin_roles.sql
-- =================================================================
-- Admin sub-role for ADMIN users (null for non-admin users)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS admin_role VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_users_admin_role ON users (admin_role) WHERE admin_role IS NOT NULL;

-- Soft-delete + restore support: add deleted_at to tables that don't have it
-- contracts table (already has soft delete via BaseEntity? Check — add if missing)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- notifications (add deleted_at for admin soft-delete)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- sms_templates already has deleted_at per V3 schema

-- Seed SMS templates for common operations
INSERT INTO sms_templates (code, name, locale, content, variables, is_active)
VALUES
    ('APPLICATION_RECEIVED', '지원 접수 알림', 'ko',
     '안녕하세요 {{name}}님, {{job_title}} 공고에 지원이 완료되었습니다. GADA에서 결과를 알려드리겠습니다.',
     '["name","job_title"]'::jsonb, TRUE),
    ('APPLICATION_STATUS_CHANGED', '지원 상태 변경 알림', 'ko',
     '{{name}}님의 {{job_title}} 지원 상태가 {{status}}으로 변경되었습니다.',
     '["name","job_title","status"]'::jsonb, TRUE),
    ('SCOUT_RECEIVED', '스카우트 제안 알림', 'ko',
     '{{name}}님, {{company_name}}에서 {{job_title}} 포지션으로 스카우트 제안을 보냈습니다.',
     '["name","company_name","job_title"]'::jsonb, TRUE),
    ('INTERVIEW_SCHEDULED', '면접 일정 안내', 'ko',
     '{{name}}님, {{company_name}} 면접이 {{date}} {{time}}에 예정되어 있습니다. {{location}}',
     '["name","company_name","date","time","location"]'::jsonb, TRUE),
    ('CONTRACT_READY', '계약서 서명 요청', 'ko',
     '{{name}}님, {{job_title}} 계약서가 준비되었습니다. GADA 앱에서 확인하고 서명해 주세요.',
     '["name","job_title"]'::jsonb, TRUE)
ON CONFLICT (code, locale) DO NOTHING;


-- =================================================================
-- V9__sms_infrastructure.sql
-- =================================================================
-- Add SENDING and CANCELLED to sms_status enum
ALTER TYPE sms_status ADD VALUE IF NOT EXISTS 'SENDING';
ALTER TYPE sms_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Add retry / scheduling columns to sms_send_logs
ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS attempt_count   INT          NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS max_attempts    INT          NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS next_retry_at   TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS scheduled_at    TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS admin_user_id   BIGINT       REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS trigger_event   VARCHAR(100);

-- Index for retry scheduler (polls FAILED rows with next_retry_at <= now)
CREATE INDEX IF NOT EXISTS idx_sms_logs_retry
    ON sms_send_logs (next_retry_at, attempt_count)
    WHERE status = 'FAILED' AND next_retry_at IS NOT NULL;

-- Index for scheduled sends
CREATE INDEX IF NOT EXISTS idx_sms_logs_scheduled
    ON sms_send_logs (scheduled_at)
    WHERE status = 'PENDING' AND scheduled_at IS NOT NULL;

-- Seed new templates
INSERT INTO sms_templates (code, name, locale, content, variables) VALUES
    ('ONBOARDING_COMPLETE', '가입 완료 안내', 'ko',
     '[GADA] {{name}}님, 가입을 축하합니다! 건설 현장의 일자리를 지금 바로 찾아보세요.',
     '["name"]'::jsonb),
    ('ONBOARDING_COMPLETE', '가입 완료 안내', 'vi',
     '[GADA] Chúc mừng {{name}} đã đăng ký thành công! Tìm việc làm xây dựng ngay hôm nay.',
     '["name"]'::jsonb),
    ('INSTALL_GUIDE', '앱 설치 안내', 'ko',
     '[GADA] {{name}}님, GADA 앱을 설치하고 더 편리하게 이용하세요.',
     '["name"]'::jsonb),
    ('INSTALL_GUIDE', '앱 설치 안내', 'vi',
     '[GADA] {{name}}, Cài đặt ứng dụng GADA để sử dụng thuận tiện hơn.',
     '["name"]'::jsonb),
    ('APPLICATION_STATUS_CHANGED', '지원 상태 변경', 'ko',
     '[GADA] {{name}}님의 {{job_title}} 지원 상태가 {{status}}(으)로 변경되었습니다.',
     '["name","job_title","status"]'::jsonb),
    ('INTERVIEW_SCHEDULED', '면접 일정 안내', 'ko',
     '[GADA] {{name}}님, {{company_name}} 면접이 {{date}} {{time}}에 예정되어 있습니다.',
     '["name","company_name","date","time"]'::jsonb)
ON CONFLICT (code, locale) DO NOTHING;


-- =================================================================
-- V10__fix_sms_send_logs_public_id.sql
-- =================================================================
-- V10: Add missing public_id to sms_send_logs
-- The SmsSendLog entity declares public_id but V3 omitted it from the table definition.

ALTER TABLE sms_send_logs
    ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4();

CREATE UNIQUE INDEX IF NOT EXISTS uq_sms_send_logs_public_id ON sms_send_logs (public_id);


-- =================================================================
-- V11__bookmarks_and_favorites.sql
-- =================================================================
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


-- =================================================================
-- V12__password_auth.sql
-- =================================================================
-- =============================================================
-- V12 — Password-based authentication
-- =============================================================

-- Add password hash column (nullable: Firebase-only users have no password)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add full name on the users table itself
-- (worker_profiles / employer_profiles already store full_name for profiles;
--  this column is used during registration before onboarding is complete)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(100);


-- =================================================================
-- V13__complete_guide_content.sql
-- =================================================================
-- V13: Complete trade guide content — all 15 trades × ko / en / vi
-- Adds job_intro_contents and FAQs for all 15 construction trades.
-- Uses ON CONFLICT DO NOTHING for intro_contents (safe for environments with custom content).
-- FAQs for the 15 guide trade categories are deleted and re-inserted for idempotency.

-- ══════════════════════════════════════════════════════════════════════════════
-- 15b. Complete Trade Guide Content — all 15 trades × ko / en / vi
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Category descriptions ──────────────────────────────────────────────────────
UPDATE job_categories SET description_ko='콘크리트 타설·양생·마감을 담당하는 건설 현장의 핵심 직종입니다.', description_en='Core construction role handling concrete pouring, curing, and surface finishing.', description_vi='Vai trò cốt lõi phụ trách đổ bê tông, bảo dưỡng và hoàn thiện bề mặt công trình.' WHERE code='CONCRETE';
UPDATE job_categories SET description_ko='철근 배치와 결속으로 구조물의 안전성을 책임지는 전문 직종입니다.', description_en='Specialist responsible for placing and tying rebar to ensure structural integrity.', description_vi='Chuyên gia đặt và buộc cốt thép đảm bảo độ bền kết cấu công trình.' WHERE code='REBAR';
UPDATE job_categories SET description_ko='콘크리트 타설을 위한 거푸집을 제작하고 설치하는 목공 전문 직종입니다.', description_en='Specialist who fabricates and erects temporary molds (formwork) for concrete pours.', description_vi='Chuyên gia chế tạo và lắp ráp ván khuôn tạm thời để đổ bê tông.' WHERE code='FORM';
UPDATE job_categories SET description_ko='벽돌·블록·석재를 쌓아 건물 벽체와 구조물을 완성하는 전문 직종입니다.', description_en='Expert in building walls and structures using bricks, blocks, and stone.', description_vi='Chuyên gia xây tường và kết cấu bằng gạch, khối xây và đá.' WHERE code='MASONRY';
UPDATE job_categories SET description_ko='내외부 공간에 다양한 타일을 시공하여 마감을 완성하는 전문 직종입니다.', description_en='Professional who installs tiles on interior and exterior surfaces for the final finish.', description_vi='Chuyên gia lắp đặt gạch ốp lát cho bề mặt trong và ngoài nhà.' WHERE code='TILE';
UPDATE job_categories SET description_ko='상하수도·가스·소방 배관을 설계도에 따라 시공하는 전문 직종입니다.', description_en='Expert installing water, gas, and fire protection piping systems per engineering drawings.', description_vi='Chuyên gia lắp đặt hệ thống ống nước, khí đốt và phòng cháy theo bản vẽ kỹ thuật.' WHERE code='PLUMBING';
UPDATE job_categories SET description_ko='건물의 전기 배선·조명·배전반을 설치하는 자격증 필수 전문 직종입니다.', description_en='Licensed specialist installing electrical wiring, lighting, and distribution panel systems.', description_vi='Chuyên gia có bằng lắp đặt dây điện, chiếu sáng và tủ phân phối điện.' WHERE code='ELECTRICAL';
UPDATE job_categories SET description_ko='건물 내외부 표면에 페인트와 도료를 시공하는 마감 전문 직종입니다.', description_en='Specialist applying paint and protective coatings to building surfaces.', description_vi='Chuyên gia thi công sơn và lớp phủ bảo vệ cho bề mặt công trình.' WHERE code='PAINTING';
UPDATE job_categories SET description_ko='고소 작업을 위한 발판(비계)을 조립하고 해체하는 안전 전문 직종입니다.', description_en='Safety specialist who erects and dismantles scaffolding systems for elevated work.', description_vi='Chuyên gia an toàn dựng và tháo dỡ hệ thống giàn giáo cho công việc trên cao.' WHERE code='SCAFFOLD';
UPDATE job_categories SET description_ko='지하·지붕·욕실 등 취약 부위에 방수 처리를 담당하는 전문 직종입니다.', description_en='Specialist applying waterproofing to basements, roofs, bathrooms, and other vulnerable areas.', description_vi='Chuyên gia xử lý chống thấm cho tầng hầm, mái nhà, nhà vệ sinh và các khu vực dễ bị thấm.' WHERE code='WATERPROOF';
UPDATE job_categories SET description_ko='건설 현장에서 타워크레인·이동식크레인을 조종하는 면허 필수 전문 직종입니다.', description_en='Licensed operator of tower cranes and mobile cranes on construction sites.', description_vi='Thợ có bằng vận hành cần cẩu tháp và cần cẩu di động tại công trường xây dựng.' WHERE code='CRANE';
UPDATE job_categories SET description_ko='굴착·성토·해체 등 토목 작업에 굴삭기를 운전하는 면허 필수 전문 직종입니다.', description_en='Licensed operator of excavators for earthwork, grading, and demolition tasks.', description_vi='Thợ có bằng vận hành máy xúc cho công tác đào đắp, san lấp và phá dỡ.' WHERE code='EXCAVATOR';
UPDATE job_categories SET description_ko='금속 부재를 용접으로 접합하는 기술 전문 직종으로 다양한 현장에서 활약합니다.', description_en='Technical specialist joining metal components by welding across construction and industrial sites.', description_vi='Chuyên gia kỹ thuật liên kết các cấu kiện kim loại bằng hàn trên nhiều công trường.' WHERE code='WELDER';
UPDATE job_categories SET description_ko='도배·마루·천장 등 실내 마감 작업으로 공간을 완성하는 전문 직종입니다.', description_en='Specialist completing interior spaces through wallpaper, flooring, and ceiling finishes.', description_vi='Chuyên gia hoàn thiện không gian nội thất bằng giấy dán tường, sàn nhà và trần.' WHERE code='INTERIOR';
UPDATE job_categories SET description_ko='자재 운반·보조 작업을 담당하는 건설업 입문 직종으로 전문 직종 전환의 발판입니다.', description_en='Entry-level role handling material transport and site support — the first step to specialised trades.', description_vi='Vị trí khởi đầu phụ trách vận chuyển vật liệu — bước đệm để tiến vào ngành chuyên môn.' WHERE code='GENERAL';

-- ── CONCRETE (en / vi) ────────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='CONCRETE'), 'en',
'What is a Concrete Worker?',
'The specialist behind every foundation, column, and slab',
'A concrete worker pours, levels, and finishes the ready-mix concrete that forms the bones of every building — foundations, columns, beams, and slabs. They coordinate with pump-truck operators, manage pour schedules, and control quality through slump tests and proper curing techniques.

Experienced concrete workers are among the most consistently employed tradespeople on any construction site. Wage levels vary significantly with skill: a journeyman who can handle high-strength specialty pours commands considerably more than a beginner.',
'[{"title":"Physical Endurance","description":"Supporting heavy equipment and doing manual work in 8–10 hour continuous shifts demands excellent physical conditioning and stamina."},
  {"title":"Team Coordination","description":"The entire crew must work in sync with the ready-mix truck schedule. Strong teamwork and clear communication are non-negotiable."},
  {"title":"Weather Sensitivity","description":"Pouring is restricted below 5°C or above 35°C, creating significant seasonal swings in workload and pace."}]'::jsonb,
'[{"name":"Concrete pouring","level":"필수"},{"name":"Curing management","level":"필수"},{"name":"Surface levelling","level":"권장"},{"name":"Formwork basics","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":250000,"note":"Standard ready-mix pour"},{"type":"DAILY","minAmount":250000,"maxAmount":350000,"note":"High-strength / specialty pour"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='CONCRETE'), 'vi',
'Thợ bê tông là gì?',
'Chuyên gia đứng sau mọi nền móng, cột và sàn',
'Thợ bê tông đổ, san bằng và hoàn thiện bê tông tươi tạo nên bộ khung của mọi công trình — nền móng, cột, dầm và sàn. Họ phối hợp với thợ vận hành xe bơm, quản lý lịch đổ và kiểm soát chất lượng qua thử nghiệm độ sụt và kỹ thuật bảo dưỡng.

Thợ bê tông lành nghề là những người được tuyển dụng thường xuyên nhất trên bất kỳ công trường nào. Mức lương thay đổi đáng kể theo kỹ năng: thợ có kinh nghiệm xử lý được các mác bê tông đặc biệt cường độ cao nhận được mức thù lao cao hơn nhiều so với người mới.',
'[{"title":"Sức bền thể chất","description":"Hỗ trợ thiết bị nặng và làm việc thủ công trong các ca liên tục 8–10 tiếng đòi hỏi thể lực và sức chịu đựng tốt."},
  {"title":"Phối hợp nhóm","description":"Cả tổ phải làm việc nhịp nhàng theo lịch xe trộn bê tông. Tinh thần đồng đội và giao tiếp rõ ràng là điều không thể thiếu."},
  {"title":"Ảnh hưởng thời tiết","description":"Việc đổ bê tông bị hạn chế dưới 5°C hoặc trên 35°C, tạo ra sự biến động lớn về khối lượng công việc theo mùa."}]'::jsonb,
'[{"name":"Đổ bê tông","level":"필수"},{"name":"Bảo dưỡng bê tông","level":"필수"},{"name":"San phẳng bề mặt","level":"권장"},{"name":"Cơ bản ván khuôn","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":250000,"note":"Đổ bê tông thông thường"},{"type":"DAILY","minAmount":250000,"maxAmount":350000,"note":"Đổ bê tông cường độ cao / đặc biệt"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── REBAR (en / vi) ───────────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='REBAR'), 'en',
'What is a Rebar Worker?',
'Precision specialist building the steel skeleton of concrete structures',
'A rebar worker cuts, bends, positions, and ties reinforcing steel bars to create the internal skeleton that gives concrete structures their tensile strength. Reading structural drawings accurately is a core requirement, as errors in bar size, spacing, or lap length directly compromise the safety of the building.

Rebar workers are in demand on every medium-to-large construction site. Experienced workers who can handle complex structural cores — high-rises, transfer plates, post-tensioned slabs — command premium wages.',
'[{"title":"Drawing Literacy","description":"Structural drawings must be read precisely: rebar sizes, spacing, and lap lengths must all be correct — errors affect building safety directly."},
  {"title":"Physical Strain","description":"Repeatedly handling heavy steel causes back and wrist fatigue. Ergonomic habits and protective equipment are essential."},
  {"title":"Working at Height","description":"High-rise projects demand full personal protective equipment and prior elevated-work experience is highly valued."}]'::jsonb,
'[{"name":"Rebar cutting & bending","level":"필수"},{"name":"Rebar tying","level":"필수"},{"name":"Drawing reading","level":"필수"},{"name":"Basic welding","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":280000,"note":"Standard rebar work"},{"type":"DAILY","minAmount":280000,"maxAmount":380000,"note":"Complex structural work"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='REBAR'), 'vi',
'Thợ sắt là gì?',
'Chuyên gia xây dựng bộ khung thép bên trong kết cấu bê tông',
'Thợ cốt thép cắt, uốn, định vị và buộc các thanh thép gia cường tạo nên bộ khung bên trong giúp kết cấu bê tông có sức chịu kéo. Đọc bản vẽ kết cấu chính xác là yêu cầu cốt lõi, vì sai sót về kích thước thanh, khoảng cách hay chiều dài neo đều ảnh hưởng trực tiếp đến an toàn công trình.

Thợ cốt thép được cần trên mọi công trình xây dựng quy mô vừa và lớn. Thợ có kinh nghiệm xử lý được các lõi kết cấu phức tạp — nhà cao tầng, sàn chuyển tiếp, sàn dự ứng lực — nhận mức lương cao hơn đáng kể.',
'[{"title":"Đọc bản vẽ","description":"Bản vẽ kết cấu phải được đọc chính xác: kích thước, khoảng cách và chiều dài neo của cốt thép đều phải đúng — sai sót ảnh hưởng trực tiếp đến an toàn."},
  {"title":"Căng thẳng thể chất","description":"Xử lý thép nặng lặp đi lặp lại gây mệt mỏi cho lưng và cổ tay. Thói quen tư thế đúng và trang bị bảo hộ là cần thiết."},
  {"title":"Làm việc trên cao","description":"Các dự án nhà cao tầng yêu cầu đầy đủ trang bị bảo hộ cá nhân và kinh nghiệm làm việc trên cao được đánh giá cao."}]'::jsonb,
'[{"name":"Cắt & uốn thép","level":"필수"},{"name":"Buộc cốt thép","level":"필수"},{"name":"Đọc bản vẽ","level":"필수"},{"name":"Hàn cơ bản","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":280000,"note":"Công việc cốt thép thông thường"},{"type":"DAILY","minAmount":280000,"maxAmount":380000,"note":"Kết cấu phức tạp"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── FORM (ko / en / vi) ───────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='FORM'), 'ko',
'거푸집공이란?',
'콘크리트 구조물의 틀을 만드는 목공 전문가',
'거푸집공은 콘크리트를 타설하기 위한 거푸집(형틀)을 제작하고 조립하는 전문 직종입니다. 나무 또는 금속 패널을 사용해 구조 설계도에 맞게 정밀하게 거푸집을 설치해야 하며, 콘크리트 타설 완료 후 거푸집 해체 작업까지 담당합니다.

콘크리트공과 긴밀하게 협업하며 건설 현장에서 꾸준한 수요를 보이는 핵심 직종입니다. 정밀한 치수 관리가 구조물의 품질과 안전성에 직결되므로 도면 해독 능력과 목공 기술이 필수입니다.',
'[{"title":"정밀 도면 해독","description":"구조 도면을 읽고 거푸집 치수와 위치를 정확하게 구현해야 합니다. 치수 오차는 구조물 품질에 직접 영향을 미칩니다."},
  {"title":"체력적 작업","description":"무거운 목재와 패널을 반복적으로 다루는 작업으로 허리와 어깨 부담이 큽니다. 근골격계 관리가 중요합니다."},
  {"title":"팀워크 필수","description":"콘크리트 타설 일정에 맞춰 팀 전체가 신속하게 거푸집을 완성해야 하므로 협업 능력이 중요합니다."}]'::jsonb,
'[{"name":"거푸집 제작","level":"필수"},{"name":"거푸집 해체","level":"필수"},{"name":"도면 판독","level":"권장"},{"name":"목재 가공","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"숙련도에 따라 차등 적용"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='FORM'), 'en',
'What is a Formwork Carpenter?',
'Specialist who builds the temporary molds that shape concrete structures',
'A formwork carpenter fabricates and erects the temporary timber or metal molds — called formwork or shuttering — that contain fresh concrete until it hardens into its final shape. Working from structural drawings, they must position panels and supports to exact tolerances, as any deviation transfers directly into the finished structure.

After the concrete has cured, the formwork carpenter is responsible for safe and efficient stripping (dismantling). Close coordination with the concrete gang is essential throughout the pour cycle.',
'[{"title":"Precision Fabrication","description":"Structural drawings must be interpreted accurately and forms built to tight dimensional tolerances. Even small errors can show up permanently in the finished concrete."},
  {"title":"Physical Demands","description":"Repeatedly handling heavy timber and panels puts significant strain on the back and shoulders. Proper lifting technique and rest management are critical."},
  {"title":"Teamwork","description":"Forms must be ready exactly on the ready-mix truck schedule. Tight coordination with the concrete team is essential throughout every pour cycle."}]'::jsonb,
'[{"name":"Formwork erection","level":"필수"},{"name":"Formwork stripping","level":"필수"},{"name":"Drawing reading","level":"권장"},{"name":"Timber processing","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Based on skill level"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='FORM'), 'vi',
'Thợ cốp pha là gì?',
'Chuyên gia làm khuôn tạm định hình kết cấu bê tông',
'Thợ cốp pha chế tạo và lắp dựng các khuôn gỗ hoặc kim loại tạm thời — gọi là cốp pha — giữ bê tông tươi cho đến khi đông cứng thành hình dạng cuối cùng. Dựa trên bản vẽ kết cấu, họ phải định vị các tấm ván và thanh chống với dung sai chính xác, vì bất kỳ sai lệch nào cũng sẽ in vĩnh viễn lên kết cấu hoàn thiện.

Sau khi bê tông đã đủ cường độ, thợ cốp pha chịu trách nhiệm tháo dỡ an toàn và hiệu quả. Phối hợp chặt chẽ với tổ đổ bê tông là điều cần thiết trong suốt chu trình đổ.',
'[{"title":"Gia công chính xác","description":"Bản vẽ kết cấu phải được diễn giải chính xác và ván khuôn lắp đúng kích thước. Sai sót nhỏ có thể hiển thị vĩnh viễn trên bê tông hoàn thiện."},
  {"title":"Nặng nhọc","description":"Xử lý gỗ và tấm ván nặng lặp đi lặp lại gây tải nặng cho lưng và vai. Kỹ thuật nâng đúng cách và nghỉ ngơi hợp lý rất quan trọng."},
  {"title":"Làm việc nhóm","description":"Ván khuôn phải hoàn thành đúng lịch xe bê tông. Phối hợp chặt chẽ với tổ đổ bê tông là cần thiết trong mọi chu trình đổ."}]'::jsonb,
'[{"name":"Lắp dựng cốp pha","level":"필수"},{"name":"Tháo dỡ cốp pha","level":"필수"},{"name":"Đọc bản vẽ","level":"권장"},{"name":"Gia công gỗ","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Tùy theo tay nghề"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── MASONRY (ko / en / vi) ────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='MASONRY'), 'ko',
'조적공이란?',
'벽돌과 블록으로 건물 벽체를 완성하는 기술 전문가',
'조적공은 벽돌, 콘크리트 블록, 석재 등을 모르타르로 쌓아 건물의 내외부 벽체와 구조물을 시공하는 전문 직종입니다. 수평·수직을 정밀하게 유지하면서 줄눈 간격과 모르타르 배합을 관리하는 것이 핵심 기술이며, 마감 품질이 건물의 외관과 내구성에 직접 영향을 미칩니다.

실내 미장 작업과 함께 수행하는 경우가 많아 두 가지 기술을 겸비하면 더 넓은 취업 기회를 얻을 수 있습니다.',
'[{"title":"정밀 작업 필요","description":"수평·수직이 일정해야 하며 줄눈 간격 유지에 세심한 주의가 필요합니다. 불균일한 작업은 마감 후에도 눈에 띄게 됩니다."},
  {"title":"체력적 소모","description":"무거운 벽돌을 반복적으로 다루며 허리를 구부리는 자세가 많아 근골격계 부담이 큽니다."},
  {"title":"기온 영향","description":"모르타르 양생은 기온과 습도에 크게 영향을 받아 극한 날씨에는 작업이 제한됩니다."}]'::jsonb,
'[{"name":"벽돌 쌓기","level":"필수"},{"name":"모르타르 배합","level":"필수"},{"name":"수평·수직 측정","level":"필수"},{"name":"석재 시공","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"자재 및 현장 조건에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='MASONRY'), 'en',
'What is a Masonry Worker?',
'Expert in building walls and structures with bricks, blocks, and stone',
'A masonry worker lays bricks, concrete blocks, and stone in mortar to construct the internal and external walls of buildings. Maintaining consistent level, plumb, and joint spacing is the defining skill — imprecisions in the substrate show clearly in the finished surface and can weaken the structure over time.

Many masonry workers also handle plastering work, making dual-skilled tradespeople especially employable across a wider range of jobs and sites.',
'[{"title":"Precision Required","description":"Level, plumb, and joint spacing must all be consistent. Irregularities in the substrate become visible in the finished wall and are difficult to remedy later."},
  {"title":"Physical Strain","description":"Repeatedly lifting heavy bricks and maintaining crouching or bending postures places significant strain on the back and knees."},
  {"title":"Temperature Sensitivity","description":"Mortar curing is strongly affected by temperature and humidity. Work may be restricted in extreme weather conditions."}]'::jsonb,
'[{"name":"Bricklaying","level":"필수"},{"name":"Mortar mixing","level":"필수"},{"name":"Level & plumb checking","level":"필수"},{"name":"Stonework","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Varies with material and site conditions"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='MASONRY'), 'vi',
'Thợ xây là gì?',
'Chuyên gia xây tường và kết cấu bằng gạch, khối xây và đá',
'Thợ xây đặt gạch, khối bê tông và đá trong vữa để xây dựng tường trong và ngoài của các tòa nhà. Duy trì thủy bình, độ thẳng đứng và khoảng cách mạch đều đặn là kỹ năng đặc trưng — sự không đều trên nền có thể thấy rõ trên bề mặt hoàn thiện và có thể làm yếu kết cấu theo thời gian.

Nhiều thợ xây cũng làm thêm công việc trát vữa, khiến những người có kỹ năng kép đặc biệt dễ được tuyển dụng trên nhiều loại công việc và công trường hơn.',
'[{"title":"Yêu cầu chính xác","description":"Mức ngang, độ thẳng đứng và khoảng cách mạch phải đều đặn. Sự không đều trong kết cấu nền trở nên rõ ràng trên tường hoàn thiện."},
  {"title":"Căng thẳng thể chất","description":"Liên tục nâng gạch nặng và duy trì tư thế cúi hoặc khom gây tải nặng cho lưng và đầu gối."},
  {"title":"Ảnh hưởng nhiệt độ","description":"Bảo dưỡng vữa bị ảnh hưởng mạnh bởi nhiệt độ và độ ẩm. Công việc có thể bị hạn chế trong điều kiện thời tiết khắc nghiệt."}]'::jsonb,
'[{"name":"Xây gạch","level":"필수"},{"name":"Trộn vữa","level":"필수"},{"name":"Kiểm tra mức & độ thẳng","level":"필수"},{"name":"Xây đá","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Tùy vật liệu và điều kiện công trường"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── PLUMBING (ko / en / vi) ──────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PLUMBING'), 'ko',
'배관공이란?',
'건물의 수도와 가스 시스템을 책임지는 전문가',
'배관공은 건축물의 상하수도, 가스 배관, 소방 배관 등을 설계도에 따라 시공하는 전문 직종입니다. 자격증 보유 여부가 업무 범위와 임금에 큰 영향을 미치며, 특히 가스 배관 작업은 법적 자격이 필수입니다.

신축 공사뿐만 아니라 리모델링과 유지보수 수요가 꾸준해 안정적인 일감을 확보할 수 있는 직종입니다.',
'[{"title":"자격증 중요","description":"배관기능사 이상 자격 보유 시 시공 범위가 넓어지고 임금이 높아집니다. 가스 배관은 자격증 없이 불가합니다."},
  {"title":"밀폐 공간 작업","description":"천장, 벽 내부, 지하 배관 작업 등 좁고 어두운 환경에서 작업하는 경우가 많습니다."},
  {"title":"도면 해독 필요","description":"배관 도면을 정확히 읽고 시공 순서와 자재 사양을 계획해야 합니다."}]'::jsonb,
'[{"name":"배관 시공","level":"필수"},{"name":"도면 판독","level":"권장"},{"name":"배관기능사 자격증","level":"권장"},{"name":"용접 기초","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":320000,"note":"자격증 보유 시 상단"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PLUMBING'), 'en',
'What is a Plumber?',
'Expert in water supply, drainage, gas, and fire-protection piping',
'A plumber installs and connects the water supply, drainage, gas, and fire-suppression pipe systems that keep a building functional and safe. Work ranges from cutting and threading pipe, to soldering joints, to commissioning and pressure-testing completed systems — always following engineering drawings and local codes.

Holding a plumbing licence significantly widens the scope of work and increases wage rates. Gas-pipe work is legally restricted to qualified, licensed tradespeople.',
'[{"title":"Licence Matters","description":"A plumbing qualification unlocks gas-pipe work and higher wages. Unlicensed workers are limited to support roles on licensed-scope tasks."},
  {"title":"Confined Spaces","description":"Much of the work happens inside ceiling voids, wall cavities, and underground trenches — cramped and often poorly lit."},
  {"title":"Drawing Literacy","description":"Plumbing drawings must be read accurately to plan pipe routes, select materials, and sequence the installation correctly."}]'::jsonb,
'[{"name":"Pipe installation","level":"필수"},{"name":"Drawing reading","level":"권장"},{"name":"Plumbing licence","level":"권장"},{"name":"Basic welding","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":320000,"note":"Higher end for licensed workers"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PLUMBING'), 'vi',
'Thợ ống nước là gì?',
'Chuyên gia về cấp thoát nước, khí đốt và ống phòng cháy',
'Thợ ống nước lắp đặt và kết nối hệ thống cấp nước, thoát nước, khí đốt và chữa cháy giúp công trình hoạt động an toàn. Công việc bao gồm cắt và ren ống, hàn mối nối, nghiệm thu và kiểm tra áp lực hệ thống — luôn tuân theo bản vẽ kỹ thuật và quy định.

Có bằng nghề mở rộng đáng kể phạm vi công việc và tăng mức lương. Công việc ống khí đốt bị pháp luật hạn chế đối với những người có bằng cấp và chứng chỉ phù hợp.',
'[{"title":"Bằng cấp quan trọng","description":"Chứng chỉ nghề mở ra công việc ống khí đốt và mức lương cao hơn. Người không có bằng bị giới hạn ở vai trò hỗ trợ."},
  {"title":"Không gian hạn chế","description":"Phần lớn công việc thực hiện trong hộp kỹ thuật trần, lõi tường và hào ngầm — chật hẹp và thường thiếu ánh sáng."},
  {"title":"Đọc bản vẽ","description":"Bản vẽ ống nước phải được đọc chính xác để lập kế hoạch tuyến ống, chọn vật liệu và sắp xếp trình tự lắp đặt."}]'::jsonb,
'[{"name":"Lắp đặt ống","level":"필수"},{"name":"Đọc bản vẽ","level":"권장"},{"name":"Bằng nghề ống nước","level":"권장"},{"name":"Hàn cơ bản","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":320000,"note":"Mức cao hơn cho thợ có bằng"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── ELECTRICAL (en / vi — ko already seeded above) ────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='ELECTRICAL'), 'en',
'What is an Electrician?',
'Licensed specialist powering every circuit, light, and panel in a building',
'An electrician installs the wiring, lighting fixtures, distribution panels, and electrical systems that bring a building to life. Because electrical work is regulated by law, a valid electrical licence is required to carry out independent installation — and the grade of licence held directly controls both the scope of permitted work and the wage commanded.

Safety is paramount: electricians work with live circuits and high voltages. Insulated gloves, voltage testers, and strict lockout/tag-out discipline are non-negotiable on every job.',
'[{"title":"Licence Is Essential","description":"An electrical craftsman licence or higher is required for independent wiring work. Higher grades unlock higher-voltage and specialty work at premium rates."},
  {"title":"Safety-Critical Trade","description":"Shock and arc-flash hazards are present at all times. Insulated PPE, voltage testers, and lockout/tag-out procedures must be followed without exception."},
  {"title":"Drawing Literacy","description":"Electrical schematics must be interpreted accurately to plan cable routes, panel layouts, and load balancing."}]'::jsonb,
'[{"name":"Electrical wiring","level":"필수"},{"name":"Panel installation","level":"필수"},{"name":"Electrical craftsman licence","level":"권장"},{"name":"CAD drawing reading","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":300000,"note":"General electrical work"},{"type":"DAILY","minAmount":300000,"maxAmount":420000,"note":"High-voltage / specialty (licence required)"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='ELECTRICAL'), 'vi',
'Thợ điện là gì?',
'Chuyên gia có bằng cấp cung cấp điện cho mọi mạch điện, đèn và tủ điện trong công trình',
'Thợ điện lắp đặt dây điện, đèn chiếu sáng, tủ phân phối và các hệ thống điện giúp công trình hoạt động. Vì công việc điện được pháp luật quy định, cần có bằng điện hợp lệ để thực hiện lắp đặt độc lập — và cấp bằng nắm giữ trực tiếp kiểm soát cả phạm vi công việc được phép lẫn mức lương.

An toàn là tối quan trọng: thợ điện làm việc với mạch điện có điện và điện áp cao. Găng tay cách điện, thiết bị kiểm tra điện áp và quy trình khóa/gắn thẻ là điều không thể thiếu.',
'[{"title":"Bằng cấp là bắt buộc","description":"Bằng thợ điện hoặc cao hơn được yêu cầu để làm việc đi dây độc lập. Cấp bậc cao hơn mở ra công việc điện áp cao và chuyên biệt với mức thù lao cao hơn."},
  {"title":"Ngành nghề an toàn cao","description":"Nguy hiểm điện giật và hồ quang điện luôn hiện diện. PPE cách điện, thiết bị kiểm tra điện áp và quy trình khóa/gắn thẻ phải được tuân thủ tuyệt đối."},
  {"title":"Đọc bản vẽ","description":"Sơ đồ điện phải được giải thích chính xác để lập kế hoạch tuyến cáp, bố cục tủ điện và cân bằng tải."}]'::jsonb,
'[{"name":"Đi dây điện","level":"필수"},{"name":"Lắp tủ điện","level":"필수"},{"name":"Bằng thợ điện","level":"권장"},{"name":"Đọc bản vẽ CAD","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":200000,"maxAmount":300000,"note":"Công việc điện thông thường"},{"type":"DAILY","minAmount":300000,"maxAmount":420000,"note":"Cao áp / chuyên biệt (cần bằng)"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── PAINTING (ko / en / vi) ───────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PAINTING'), 'ko',
'도장공이란?',
'건물 표면 마감을 책임지는 도장 전문 기술자',
'도장공은 건물 내외부 벽면, 천장, 구조물에 페인트와 도료를 시공하는 전문 직종입니다. 표면 전처리, 적절한 도료 선택, 균일한 도포 기술이 핵심이며 유해 물질을 다루므로 안전 장비 착용이 필수입니다.

신축 공사 외에도 건물 유지보수 수요가 높아 연중 안정적인 일감을 확보할 수 있습니다. 외벽 도장은 고소 작업이 수반되어 별도의 안전 교육이 중요합니다.',
'[{"title":"유해 물질 노출","description":"휘발성 유기화합물(VOC) 노출 위험으로 방진마스크와 충분한 환기 관리가 필수입니다."},
  {"title":"날씨·온도 영향","description":"도료 건조에 기온과 습도가 크게 영향을 미쳐 극한 날씨에는 작업이 제한됩니다."},
  {"title":"고소 작업 빈번","description":"외벽 도장은 비계나 달비계를 이용한 고소 작업이 많아 안전 장비와 관련 경험이 필요합니다."}]'::jsonb,
'[{"name":"도료 도포","level":"필수"},{"name":"표면 전처리","level":"필수"},{"name":"고소 작업","level":"권장"},{"name":"도장기능사 자격증","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"작업 범위와 난이도에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PAINTING'), 'en',
'What is a Painter?',
'Specialist applying protective and decorative coatings to every building surface',
'A construction painter prepares, primes, and finishes interior and exterior surfaces with paint, varnish, epoxy, or specialty coatings. Surface preparation — filling, sanding, priming — is often the most time-consuming step and is what separates a durable, professional finish from one that peels within months.

Beyond new builds, the building-maintenance market generates steady year-round demand. Exterior facade painters work at height using scaffolding or suspended cradles, making safety training and experience especially important.',
'[{"title":"Hazardous Materials","description":"Volatile organic compounds (VOCs) in many paints pose health risks. Respirators and adequate ventilation are mandatory whenever solvent-based products are used."},
  {"title":"Weather & Temperature","description":"Paint adhesion and drying are sensitive to temperature and humidity. Work may be restricted in extreme cold, heat, or rain."},
  {"title":"Working at Height","description":"Exterior facade work involves significant time on scaffolding or suspended cradles. Safety harness experience and height confidence are required."}]'::jsonb,
'[{"name":"Paint application","level":"필수"},{"name":"Surface preparation","level":"필수"},{"name":"Working at height","level":"권장"},{"name":"Painter''s licence","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Varies with scope and difficulty"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='PAINTING'), 'vi',
'Thợ sơn là gì?',
'Chuyên gia thi công lớp phủ bảo vệ và trang trí cho mọi bề mặt công trình',
'Thợ sơn xây dựng chuẩn bị, lót và hoàn thiện bề mặt trong và ngoài bằng sơn, vecni, epoxy hoặc lớp phủ đặc biệt. Chuẩn bị bề mặt — trám, chà nhám, sơn lót — thường là bước tốn nhiều thời gian nhất và là yếu tố phân biệt lớp hoàn thiện bền đẹp với lớp sơn bong tróc sau vài tháng.

Ngoài công trình mới, thị trường bảo trì tòa nhà tạo ra nhu cầu đều đặn quanh năm. Thợ sơn mặt tiền làm việc trên cao dùng giàn giáo hoặc bệ treo, khiến đào tạo an toàn và kinh nghiệm đặc biệt quan trọng.',
'[{"title":"Hóa chất nguy hiểm","description":"Hợp chất hữu cơ dễ bay hơi (VOC) trong nhiều loại sơn gây nguy cơ sức khỏe. Mặt nạ hô hấp và thông gió đủ là bắt buộc khi dùng sản phẩm gốc dung môi."},
  {"title":"Thời tiết và nhiệt độ","description":"Sự bám dính và khô của sơn nhạy cảm với nhiệt độ và độ ẩm. Công việc có thể bị hạn chế trong thời tiết cực lạnh, nóng hoặc mưa."},
  {"title":"Làm việc trên cao","description":"Công việc mặt tiền ngoài đòi hỏi nhiều thời gian trên giàn giáo hoặc bệ treo. Kinh nghiệm dây bảo hiểm và tự tin làm việc trên cao là cần thiết."}]'::jsonb,
'[{"name":"Thi công sơn","level":"필수"},{"name":"Chuẩn bị bề mặt","level":"필수"},{"name":"Làm việc trên cao","level":"권장"},{"name":"Bằng thợ sơn","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":250000,"note":"Tùy phạm vi và độ khó"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── SCAFFOLD (ko / en / vi) ───────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='SCAFFOLD'), 'ko',
'비계공이란?',
'안전한 고소 작업 환경을 만드는 비계 전문가',
'비계공은 건설 현장에서 고소 작업을 위한 발판(비계)을 설치하고 해체하는 전문 직종입니다. 비계의 안전 설치 기준을 철저히 준수해야 하며, 불량 설치는 대형 사고로 이어질 수 있어 현장에서 가장 책임이 무거운 직종 중 하나입니다.

대형 건설 현장일수록 비계 설치·해체 물량이 많아 안정적인 수요를 기대할 수 있습니다. 비계기능사 자격증 취득 시 취업과 임금 모두에서 유리합니다.',
'[{"title":"안전 최우선","description":"비계 설치 불량은 대형 낙하 사고로 이어질 수 있어 법정 안전 기준 준수가 절대적으로 필수입니다."},
  {"title":"고소 작업","description":"고층에서의 작업이 기본이므로 고소 공포증이 있으면 부적합합니다. 안전 장비 착용이 항상 필수입니다."},
  {"title":"팀 작업","description":"설치·해체 모두 팀으로 진행되며 신호 체계와 의사소통 능력이 사고 예방에 중요합니다."}]'::jsonb,
'[{"name":"비계 조립·해체","level":"필수"},{"name":"고소작업 안전","level":"필수"},{"name":"비계기능사 자격증","level":"권장"},{"name":"도면 이해","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":240000,"note":"자격증 및 경력에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='SCAFFOLD'), 'en',
'What is a Scaffolder?',
'Safety specialist who builds the elevated platforms that every trade depends on',
'A scaffolder erects, modifies, and dismantles the temporary steel or aluminium frame structures that allow workers to safely reach elevated parts of a building. Getting a scaffold wrong can be catastrophic — a collapse endangers everyone on site — so strict adherence to legal erection standards and load ratings is non-negotiable.

On large construction sites, scaffolding is erected and adapted continuously as the building rises, providing consistent employment. Holding a scaffolding licence significantly improves both job prospects and pay.',
'[{"title":"Safety Is Absolute","description":"An improperly erected scaffold can collapse and kill. Every component must be installed to legal standards with no shortcuts permitted."},
  {"title":"Working at Height","description":"Scaffolders spend most of their day working at elevation. A fear of heights makes this trade unsuitable; proper PPE is mandatory at all times."},
  {"title":"Team Signals","description":"Erection and dismantling are team operations. Clear signalling and communication discipline prevent dropped materials and coordination accidents."}]'::jsonb,
'[{"name":"Scaffold erection & dismantling","level":"필수"},{"name":"Working-at-height safety","level":"필수"},{"name":"Scaffold licence","level":"권장"},{"name":"Drawing reading","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":240000,"note":"Higher end for licensed workers"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='SCAFFOLD'), 'vi',
'Thợ giàn giáo là gì?',
'Chuyên gia an toàn xây dựng sàn công tác trên cao mà mọi ngành nghề đều phụ thuộc',
'Thợ giàn giáo dựng, điều chỉnh và tháo dỡ các kết cấu khung thép hoặc nhôm tạm thời cho phép công nhân tiếp cận an toàn các phần cao của công trình. Dựng giàn giáo sai có thể gây thảm họa — sụp đổ gây nguy hiểm cho tất cả mọi người trên công trường — vì vậy tuân thủ nghiêm ngặt tiêu chuẩn dựng và tải trọng là điều không thể thoả hiệp.

Trên các công trường lớn, giàn giáo liên tục được dựng và điều chỉnh theo tiến độ xây dựng, tạo ra việc làm ổn định. Có bằng giàn giáo cải thiện đáng kể triển vọng việc làm và mức lương.',
'[{"title":"An toàn là tuyệt đối","description":"Giàn giáo lắp không đúng có thể sụp đổ và gây chết người. Mọi bộ phận phải lắp theo tiêu chuẩn pháp lý, không có ngoại lệ."},
  {"title":"Làm việc trên cao","description":"Thợ giàn giáo dành phần lớn thời gian làm việc ở độ cao. Sợ độ cao khiến ngành này không phù hợp; PPE thích hợp là bắt buộc mọi lúc."},
  {"title":"Tín hiệu nhóm","description":"Dựng và tháo dỡ là hoạt động nhóm. Tín hiệu rõ ràng và kỷ luật giao tiếp ngăn ngừa vật liệu rơi và tai nạn phối hợp."}]'::jsonb,
'[{"name":"Dựng & tháo giàn giáo","level":"필수"},{"name":"An toàn làm việc trên cao","level":"필수"},{"name":"Bằng giàn giáo","level":"권장"},{"name":"Đọc bản vẽ","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":160000,"maxAmount":240000,"note":"Mức cao hơn cho thợ có bằng"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── WATERPROOF (ko / en / vi) ─────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='WATERPROOF'), 'ko',
'방수공이란?',
'건물의 물 침투를 막는 방수 처리 전문가',
'방수공은 지하층, 지붕, 욕실, 베란다 등 물이 스며들기 쉬운 부위에 방수 처리를 하는 전문 직종입니다. 도막방수, 시트방수, 우레탄방수 등 다양한 공법을 이해하고 현장 조건에 맞게 선택·시공하는 것이 핵심입니다.

리모델링과 누수 보수 수요가 꾸준해 연중 안정적인 일감을 기대할 수 있습니다. 방수기능사 자격증 취득 시 시공 범위와 임금이 모두 향상됩니다.',
'[{"title":"다양한 공법 이해","description":"도막방수, 시트방수, 무기질방수 등 상황에 따른 공법 선택과 시공 순서가 방수 성능을 좌우합니다."},
  {"title":"화학 물질 취급","description":"우레탄, 에폭시 등 유해 화학 물질을 다루므로 보호 장갑, 마스크 등 보호 장비 착용이 필수입니다."},
  {"title":"협소 공간 작업","description":"지하 배수로, 욕실 등 좁고 환기가 어려운 공간에서의 작업이 많아 안전 관리에 주의가 필요합니다."}]'::jsonb,
'[{"name":"도막방수","level":"필수"},{"name":"시트방수","level":"권장"},{"name":"방수기능사 자격증","level":"권장"},{"name":"실링 작업","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":170000,"maxAmount":280000,"note":"공법 및 현장 규모에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='WATERPROOF'), 'en',
'What is a Waterproofing Specialist?',
'Expert in sealing structures against water infiltration — roofs, basements, and bathrooms',
'A waterproofing specialist applies membranes, coatings, and sealants to the most vulnerable parts of a structure: below-ground foundations, flat roofs, wet areas like bathrooms and kitchens, and balconies. Different areas require different systems — torch-applied sheet membranes for roofs, liquid-applied coatings for bathrooms, crystalline products for below-grade concrete — and choosing the right system is a key part of the expertise.

Renovation and leak-repair work ensures year-round demand. Holding a waterproofing licence expands both the scope of permitted work and earning potential.',
'[{"title":"System Knowledge","description":"Torch-on sheet, liquid-applied, and crystalline waterproofing each suit different applications. Choosing and applying the correct system determines long-term effectiveness."},
  {"title":"Chemical Hazards","description":"Urethane, epoxy, and bitumen-based products are hazardous. Protective gloves, respirators, and adequate ventilation are mandatory."},
  {"title":"Confined Spaces","description":"Much waterproofing work happens in basements, sumps, and small bathrooms with poor ventilation — requiring careful safety management."}]'::jsonb,
'[{"name":"Liquid-applied membrane","level":"필수"},{"name":"Sheet membrane","level":"권장"},{"name":"Waterproofing licence","level":"권장"},{"name":"Joint sealing","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":170000,"maxAmount":280000,"note":"Varies with method and site scale"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='WATERPROOF'), 'vi',
'Thợ chống thấm là gì?',
'Chuyên gia bịt kín kết cấu chống thấm nước — mái, tầng hầm và nhà vệ sinh',
'Thợ chống thấm thi công màng, lớp phủ và chất bịt kín cho các phần dễ bị tổn thương nhất của công trình: móng dưới đất, mái bằng, khu vực ướt như nhà vệ sinh và nhà bếp, và ban công. Các khu vực khác nhau cần hệ thống khác nhau — màng bitum khò lửa cho mái, lớp phủ lỏng cho nhà vệ sinh, sản phẩm tinh thể cho bê tông ngầm — và chọn đúng hệ thống là một phần quan trọng của chuyên môn.

Công việc cải tạo và sửa chữa rò rỉ đảm bảo nhu cầu quanh năm. Có bằng chống thấm mở rộng cả phạm vi công việc được phép lẫn tiềm năng thu nhập.',
'[{"title":"Kiến thức hệ thống","description":"Màng khò lửa, lớp phủ lỏng và chống thấm tinh thể mỗi loại phù hợp với ứng dụng khác nhau. Chọn và thi công đúng hệ thống quyết định hiệu quả lâu dài."},
  {"title":"Hóa chất nguy hiểm","description":"Các sản phẩm gốc urethane, epoxy và bitum nguy hiểm. Găng tay bảo hộ, mặt nạ hô hấp và thông gió đủ là bắt buộc."},
  {"title":"Không gian hạn chế","description":"Nhiều công việc chống thấm diễn ra ở tầng hầm, hố thu và nhà vệ sinh nhỏ kém thông gió — đòi hỏi quản lý an toàn cẩn thận."}]'::jsonb,
'[{"name":"Màng chống thấm lỏng","level":"필수"},{"name":"Màng chống thấm tấm","level":"권장"},{"name":"Bằng chống thấm","level":"권장"},{"name":"Bịt khe hở","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":170000,"maxAmount":280000,"note":"Tùy phương pháp và quy mô công trường"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── CRANE (ko / en / vi) ──────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='CRANE'), 'ko',
'크레인 기사란?',
'대형 중장비를 정밀하게 조종하는 타워크레인 전문가',
'크레인 기사는 건설 현장에서 타워크레인 또는 트럭크레인을 운전하여 자재를 들어올리고 이동시키는 전문 직종입니다. 국가 자격증이 필수이며 현장에서 가장 높은 일당을 받는 직종 중 하나입니다.

수십 층 높이에서 수 톤의 자재를 정밀하게 제어해야 하므로 집중력, 공간 감각, 신호수와의 통신 능력이 매우 중요합니다. 타워크레인운전기능사 외에 이동식크레인 자격까지 갖추면 더 다양한 현장에서 활동할 수 있습니다.',
'[{"title":"자격증 필수","description":"타워크레인운전기능사 또는 이동식크레인운전기능사 자격증 없이는 취업이 불가합니다."},
  {"title":"장시간 고소 근무","description":"크레인 운전석에서 하루 8~10시간 근무해야 하며 협소한 공간에서 집중력을 유지해야 합니다."},
  {"title":"정밀 제어 능력","description":"수십 미터 높이에서 mm 단위의 정밀한 자재 위치 조정이 요구되며 신호수와의 팀워크가 필수입니다."}]'::jsonb,
'[{"name":"타워크레인 조종","level":"필수"},{"name":"크레인운전기능사 자격증","level":"필수"},{"name":"신호 체계 이해","level":"필수"},{"name":"장비 점검","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":300000,"maxAmount":500000,"note":"경력 및 크레인 규모에 따라 차등"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='CRANE'), 'en',
'What is a Crane Operator?',
'Licensed specialist controlling massive tower cranes high above the construction site',
'A crane operator controls tower cranes or mobile cranes to lift and precisely position materials — steel, concrete, formwork, and equipment — anywhere on site. Because a crane failure or load drop can be fatal, a valid crane operator licence is legally required and strictly enforced on all sites.

Crane operators are among the highest-paid tradespeople in construction. The most experienced operators, capable of handling the largest tower cranes and working on major high-rise projects, can earn at the very top of the daily-wage scale.',
'[{"title":"Licence Is Mandatory","description":"A tower crane or mobile crane operator licence is required by law. Operating without one is illegal and no reputable site will permit it."},
  {"title":"Extended High-Altitude Work","description":"Operators spend 8–10 hours per day in the cab, which on a tower crane may be 100 m above ground. Concentration, stamina, and comfort at height are all essential."},
  {"title":"Millimetre Precision","description":"Placing loads accurately in tight spaces, often guided only by radio signals from a banksman below, requires exceptional spatial awareness and fine motor control."}]'::jsonb,
'[{"name":"Tower crane operation","level":"필수"},{"name":"Crane operator licence","level":"필수"},{"name":"Banksman signal system","level":"필수"},{"name":"Equipment pre-shift inspection","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":300000,"maxAmount":500000,"note":"Varies with experience and crane size"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='CRANE'), 'vi',
'Thợ lái cần cẩu là gì?',
'Chuyên gia có bằng điều khiển cần cẩu tháp khổng lồ cao trên công trường',
'Thợ lái cần cẩu điều khiển cần cẩu tháp hoặc cần cẩu di động để nâng và định vị chính xác vật liệu — thép, bê tông, ván khuôn và thiết bị — ở bất kỳ đâu trên công trường. Vì sự cố cần cẩu hoặc rơi tải có thể gây chết người, bằng lái cần cẩu hợp lệ được pháp luật yêu cầu và thực thi nghiêm ngặt.

Thợ lái cần cẩu là một trong những người được trả lương cao nhất trong ngành xây dựng. Những thợ có kinh nghiệm nhất, có thể xử lý được cần cẩu tháp lớn nhất trên các dự án nhà cao tầng lớn, có thể kiếm ở mức cao nhất của thang lương ngày.',
'[{"title":"Bằng lái là bắt buộc","description":"Bằng vận hành cần cẩu tháp hoặc cần cẩu di động được pháp luật yêu cầu. Vận hành không có bằng là bất hợp pháp."},
  {"title":"Làm việc trên cao kéo dài","description":"Thợ lái dành 8–10 giờ mỗi ngày trong cabin, có thể ở độ cao 100 m trên mặt đất. Sự tập trung, sức bền và thoải mái ở độ cao đều cần thiết."},
  {"title":"Độ chính xác mm","description":"Đặt tải chính xác vào không gian chật hẹp, thường chỉ được hướng dẫn qua tín hiệu vô tuyến từ người đứng hiệu bên dưới, đòi hỏi nhận thức không gian xuất sắc."}]'::jsonb,
'[{"name":"Vận hành cần cẩu tháp","level":"필수"},{"name":"Bằng lái cần cẩu","level":"필수"},{"name":"Hệ thống tín hiệu","level":"필수"},{"name":"Kiểm tra thiết bị trước ca","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":300000,"maxAmount":500000,"note":"Tùy kinh nghiệm và kích cỡ cần cẩu"}]'::jsonb,
TRUE, 5
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── EXCAVATOR (ko / en / vi) ──────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='EXCAVATOR'), 'ko',
'굴삭기 기사란?',
'토목 현장의 핵심, 굴삭기 운전 전문가',
'굴삭기 기사는 건설 현장에서 굴착, 성토, 해체 등 토목 작업에 굴삭기를 운전하는 전문 직종입니다. 굴삭기운전기능사 자격증이 필수이며 버킷, 브레이커, 집게 등 다양한 어태치먼트를 능숙하게 다룰 수 있으면 더 높은 일당을 받을 수 있습니다.

도심 공사부터 산악 지형까지 다양한 현장에서 활약하며, 경력이 쌓일수록 대형 장비 운전 기회가 늘어나 임금 상승을 기대할 수 있습니다.',
'[{"title":"자격증 및 경력 중시","description":"굴삭기운전기능사 자격증과 실무 경력이 임금에 직결됩니다. 대형 장비 운전 경험이 있을수록 유리합니다."},
  {"title":"정밀 조작 필요","description":"협소한 현장에서 주변 구조물과 안전선을 확인하며 정밀하게 조작해야 하므로 집중력이 중요합니다."},
  {"title":"장비 유지관리","description":"운전 전후 일상 점검과 기초적인 유지보수 능력이 있으면 현장에서 더 높은 신뢰를 받습니다."}]'::jsonb,
'[{"name":"굴삭기 조종","level":"필수"},{"name":"굴삭기운전기능사 자격증","level":"필수"},{"name":"어태치먼트 활용","level":"권장"},{"name":"장비 점검","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":280000,"maxAmount":450000,"note":"장비 규모 및 경력에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='EXCAVATOR'), 'en',
'What is an Excavator Operator?',
'Licensed earthmover who shapes the ground every project is built on',
'An excavator operator uses a hydraulic excavator — fitted with buckets, breakers, grapples, or other attachments — to dig foundations, level ground, demolish structures, and move bulk material. A valid excavator operator licence is required by law, and hands-on experience in diverse ground conditions is what distinguishes the highest-paid operators.

Excavator operators work across urban demolition sites, highway projects, and remote mountain terrain. As experience accumulates, opportunities to run larger machines grow, with pay rising commensurately.',
'[{"title":"Licence and Experience","description":"An excavator operator licence is mandatory. After qualifying, real-world experience with diverse ground conditions and machine sizes is what drives wages up."},
  {"title":"Precision Control","description":"Working in tight urban sites requires precise machine control to avoid underground utilities, adjacent structures, and safety exclusion zones."},
  {"title":"Equipment Maintenance","description":"Pre-shift and post-shift daily checks and basic first-line maintenance ability earn trust on site and reduce unplanned downtime."}]'::jsonb,
'[{"name":"Excavator operation","level":"필수"},{"name":"Excavator operator licence","level":"필수"},{"name":"Attachment operation","level":"권장"},{"name":"Equipment inspection","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":280000,"maxAmount":450000,"note":"Varies with machine size and experience"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='EXCAVATOR'), 'vi',
'Thợ lái máy xúc là gì?',
'Thợ đào đất có bằng định hình nền đất mà mọi dự án được xây dựng trên đó',
'Thợ lái máy xúc dùng máy xúc thủy lực — trang bị gầu, búa phá, kẹp hoặc các thiết bị đính kèm khác — để đào móng, san phẳng mặt bằng, phá dỡ kết cấu và di chuyển vật liệu rời. Bằng lái máy xúc hợp lệ được pháp luật yêu cầu, và kinh nghiệm thực tế trên nhiều điều kiện địa chất là điều phân biệt những thợ được trả lương cao nhất.

Thợ lái máy xúc làm việc trên các công trường phá dỡ đô thị, dự án đường bộ và địa hình núi hẻo lánh. Khi kinh nghiệm tích lũy, cơ hội vận hành máy lớn hơn tăng lên với mức lương tương ứng.',
'[{"title":"Bằng cấp và kinh nghiệm","description":"Bằng lái máy xúc là bắt buộc. Sau khi đủ điều kiện, kinh nghiệm thực tế với các điều kiện địa chất và kích cỡ máy khác nhau là điều thúc đẩy mức lương tăng."},
  {"title":"Kiểm soát chính xác","description":"Làm việc trên các công trường đô thị chật hẹp đòi hỏi kiểm soát máy chính xác để tránh đường ngầm, kết cấu liền kề và vùng an toàn."},
  {"title":"Bảo trì thiết bị","description":"Kiểm tra hàng ngày trước và sau ca và khả năng bảo trì cơ bản đường một tạo được sự tin tưởng và giảm thời gian ngừng hoạt động ngoài kế hoạch."}]'::jsonb,
'[{"name":"Vận hành máy xúc","level":"필수"},{"name":"Bằng lái máy xúc","level":"필수"},{"name":"Vận hành thiết bị đính kèm","level":"권장"},{"name":"Kiểm tra thiết bị","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":280000,"maxAmount":450000,"note":"Tùy kích cỡ máy và kinh nghiệm"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── WELDER (en / vi — ko already in V7 migration and seed) ────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='WELDER'), 'en',
'What is a Welder?',
'Technical specialist joining metal with heat — from steel frames to plant pipework',
'A welder uses electric arc, MIG/CO₂, or TIG processes to fuse metal components into permanent joints. In construction, welders work on structural steel frames, reinforcing connections, pipe systems, and metal cladding — anywhere metal must be permanently joined with structural integrity.

Welding qualifications are tiered: the higher the grade and the more exotic the process, the larger the wage premium. Specialist TIG welders working on high-purity plant pipework command some of the highest daily rates in the entire construction industry.',
'[{"title":"Qualification Grade Drives Wages","description":"A specialty welding certificate can add 30–50% to daily wages compared to general arc welding. Investing in higher grades pays back quickly."},
  {"title":"Hazardous Environment","description":"Constant exposure to welding fume, UV arc light, and heat requires dust masks, darkened face shields, and fire-resistant clothing at all times."},
  {"title":"Varied Work Environments","description":"Welders move between controlled factory fabrication floors and outdoor high-rise ironwork — adaptability to different environments and positions is valued."}]'::jsonb,
'[{"name":"Arc welding","level":"필수"},{"name":"MIG/CO₂ welding","level":"필수"},{"name":"TIG welding","level":"고급"},{"name":"Welder''s certification","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":220000,"maxAmount":320000,"note":"General welding"},{"type":"DAILY","minAmount":320000,"maxAmount":480000,"note":"Specialty / plant welding"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='WELDER'), 'vi',
'Thợ hàn là gì?',
'Chuyên gia kỹ thuật liên kết kim loại bằng nhiệt — từ khung thép đến đường ống nhà máy',
'Thợ hàn sử dụng quy trình hồ quang điện, MIG/CO₂ hoặc TIG để hàn các cấu kiện kim loại thành mối nối vĩnh viễn. Trong xây dựng, thợ hàn làm việc trên khung thép kết cấu, kết nối gia cường, hệ thống ống và vỏ bọc kim loại — bất kỳ nơi nào kim loại phải được liên kết vĩnh viễn với độ bền kết cấu.

Chứng chỉ hàn được phân cấp: cấp độ càng cao và quy trình càng đặc biệt, mức phụ cấp lương càng lớn. Thợ hàn TIG chuyên biệt làm việc trên đường ống nhà máy độ tinh khiết cao có thể nhận một số mức lương ngày cao nhất trong toàn ngành xây dựng.',
'[{"title":"Cấp độ bằng quyết định lương","description":"Chứng chỉ hàn đặc biệt có thể tăng 30–50% lương ngày so với hàn hồ quang thông thường. Đầu tư vào cấp cao hơn nhanh chóng được hoàn vốn."},
  {"title":"Môi trường nguy hiểm","description":"Tiếp xúc liên tục với khói hàn, ánh sáng hồ quang UV và nhiệt yêu cầu mặt nạ bụi, kính bảo hộ tối màu và quần áo chống cháy mọi lúc."},
  {"title":"Môi trường làm việc đa dạng","description":"Thợ hàn di chuyển giữa xưởng gia công trong nhà được kiểm soát và công tác thép ngoài trời trên cao — khả năng thích ứng được đánh giá cao."}]'::jsonb,
'[{"name":"Hàn hồ quang","level":"필수"},{"name":"Hàn MIG/CO₂","level":"필수"},{"name":"Hàn TIG","level":"고급"},{"name":"Chứng chỉ thợ hàn","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":220000,"maxAmount":320000,"note":"Hàn thông thường"},{"type":"DAILY","minAmount":320000,"maxAmount":480000,"note":"Hàn đặc biệt / nhà máy"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── INTERIOR (ko / en / vi) ───────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='INTERIOR'), 'ko',
'인테리어공이란?',
'공간의 가치를 높이는 실내 마감 전문가',
'인테리어공은 건물의 내부 공간을 완성하는 전문 직종으로, 도배, 마루 시공, 몰딩, 가벽, 천장 작업 등 다양한 마감 작업을 담당합니다. 수십 가지 자재와 공법을 숙지해야 하며, 마감의 완성도가 고객 만족에 직결됩니다.

신축 공사보다 리모델링 시장에서 특히 수요가 높아 연중 안정적인 일감을 기대할 수 있습니다. 다양한 기술을 보유할수록 다음 일감을 구하기 쉬워집니다.',
'[{"title":"다양한 자재 지식","description":"마루, 벽지, 타일, 몰딩, 도어 등 수십 가지 자재의 특성과 시공법을 이해해야 합니다."},
  {"title":"마감 품질 민감도","description":"고객 눈에 직접 보이는 작업으로 마감 품질에 대한 높은 기준이 요구됩니다."},
  {"title":"실내 작업 위주","description":"외부 날씨 영향이 적고 실내에서 진행되어 작업 환경이 비교적 쾌적합니다."}]'::jsonb,
'[{"name":"도배 시공","level":"권장"},{"name":"마루 시공","level":"권장"},{"name":"몰딩 및 마감","level":"권장"},{"name":"실내 목공","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":300000,"note":"시공 범위와 자재에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='INTERIOR'), 'en',
'What is an Interior Finisher?',
'Specialist who transforms bare concrete shells into polished, liveable spaces',
'An interior finisher completes the inside of buildings — installing wallpaper, hardwood or laminate flooring, decorative mouldings, partition walls, suspended ceilings, and door frames. Dozens of materials and techniques must be mastered, and the quality of the finish is immediately visible to the building owner.

Renovation and refurbishment work provides especially strong demand. Interior finishers who can handle a wide range of materials — wallcovering, flooring, ceilings, and joinery — keep themselves employed year-round with relative ease.',
'[{"title":"Material Versatility","description":"Flooring, wallcovering, mouldings, doors, and ceilings each involve different materials, adhesives, and installation methods — breadth of knowledge is a competitive advantage."},
  {"title":"Finish Quality Is Visible","description":"Interior work is what owners see every day. A high standard of precision and cleanliness is expected on every job."},
  {"title":"Comfortable Indoor Work","description":"Almost all interior finishing work takes place indoors and is less affected by extreme weather, making the working environment more consistent and comfortable."}]'::jsonb,
'[{"name":"Wallpaper installation","level":"권장"},{"name":"Flooring installation","level":"권장"},{"name":"Moulding & trim","level":"권장"},{"name":"Interior carpentry","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":300000,"note":"Varies with scope and materials"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='INTERIOR'), 'vi',
'Thợ nội thất là gì?',
'Chuyên gia biến đổi vỏ bê tông trần thành không gian hoàn thiện và có thể ở được',
'Thợ nội thất hoàn thiện bên trong các tòa nhà — lắp đặt giấy dán tường, sàn gỗ hoặc laminate, gờ trang trí, vách ngăn, trần treo và khung cửa. Hàng chục loại vật liệu và kỹ thuật phải được thành thạo, và chất lượng hoàn thiện hiện ra ngay trước mắt chủ nhà.

Công việc cải tạo và tu sửa tạo ra nhu cầu đặc biệt mạnh. Thợ nội thất có thể xử lý nhiều loại vật liệu — giấy dán tường, sàn nhà, trần và đồ mộc — duy trì việc làm quanh năm tương đối dễ dàng.',
'[{"title":"Đa dạng vật liệu","description":"Sàn nhà, giấy dán tường, gờ, cửa và trần mỗi loại liên quan đến vật liệu, keo và phương pháp lắp đặt khác nhau — kiến thức rộng là lợi thế cạnh tranh."},
  {"title":"Chất lượng hoàn thiện hiện hữu","description":"Công việc nội thất là thứ chủ sở hữu nhìn thấy hàng ngày. Tiêu chuẩn cao về độ chính xác và sạch sẽ được yêu cầu trên mọi công việc."},
  {"title":"Làm việc trong nhà thoải mái","description":"Hầu hết công việc hoàn thiện nội thất diễn ra trong nhà và ít bị ảnh hưởng bởi thời tiết khắc nghiệt, tạo môi trường làm việc nhất quán và thoải mái hơn."}]'::jsonb,
'[{"name":"Lắp giấy dán tường","level":"권장"},{"name":"Lắp sàn nhà","level":"권장"},{"name":"Gờ & hoàn thiện","level":"권장"},{"name":"Mộc nội thất","level":"선택"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":300000,"note":"Tùy phạm vi và vật liệu"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── GENERAL (ko / en / vi) ────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='GENERAL'), 'ko',
'일반 노무란?',
'건설 현장 전반을 지원하는 기초 직종',
'일반 노무는 건설 현장에서 별도의 전문 기술 없이도 참여할 수 있는 직종으로, 자재 운반, 정리, 청소, 전문 기술자 보조 등 현장 전반의 기초 업무를 담당합니다. 진입 장벽이 낮아 건설업을 처음 시작하는 분들이 많이 선택합니다.

현장 경험을 쌓으면서 원하는 전문 직종을 찾고 기술을 배울 수 있는 기회가 됩니다. 체력과 성실함이 가장 중요한 직종이며, 경험이 쌓일수록 더 좋은 조건을 기대할 수 있습니다.',
'[{"title":"낮은 진입 장벽","description":"특별한 자격증이나 경력 없이 시작할 수 있어 건설업 입문에 적합합니다."},
  {"title":"다양한 작업 수행","description":"하루에도 다양한 작업을 수행하므로 유연성과 체력이 중요합니다. 지시에 따라 빠르게 움직이는 능력이 필요합니다."},
  {"title":"전문 직종 전환 기회","description":"현장에서 다양한 전문 기술자를 보조하며 배우고 관심 직종으로 성장할 수 있습니다."}]'::jsonb,
'[{"name":"자재 운반","level":"필수"},{"name":"현장 청소 및 정리","level":"필수"},{"name":"기초 공구 사용","level":"권장"},{"name":"안전 수칙 준수","level":"필수"}]'::jsonb,
'[{"type":"DAILY","minAmount":130000,"maxAmount":180000,"note":"경험 및 현장에 따라 차등"}]'::jsonb,
TRUE, 3
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='GENERAL'), 'en',
'What is a General Labourer?',
'The backbone of every construction site — supporting every trade, every day',
'A general labourer handles the support work that keeps a construction site moving: transporting materials by hand or with trolleys, clearing debris and waste, keeping work areas clean and safe, and assisting specialised tradespeople with their tasks. No formal qualifications are required to start, making it the most accessible entry point into the construction industry.

The role is an excellent apprenticeship for someone deciding which trade to specialise in. Observing and assisting tradespeople up close provides a realistic picture of different careers, and demonstrating reliability as a labourer is often the first step to being taken on as a trade apprentice.',
'[{"title":"Low Entry Barrier","description":"No formal qualification or prior experience is required. Physical fitness and reliability are what matter most when starting out."},
  {"title":"Varied Tasks","description":"Tasks change throughout the day — material handling, cleaning, mixing, assisting. Physical stamina and the ability to follow instructions quickly are the key traits."},
  {"title":"Trade Apprenticeship Pathway","description":"Working alongside tradespeople is one of the best ways to learn a specific trade and get taken on as a qualified apprentice."}]'::jsonb,
'[{"name":"Material handling","level":"필수"},{"name":"Site cleaning & tidying","level":"필수"},{"name":"Basic tool use","level":"권장"},{"name":"Safety compliance","level":"필수"}]'::jsonb,
'[{"type":"DAILY","minAmount":130000,"maxAmount":180000,"note":"Varies with experience and site"}]'::jsonb,
TRUE, 3
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='GENERAL'), 'vi',
'Lao động phổ thông là gì?',
'Xương sống của mọi công trường — hỗ trợ mọi ngành nghề, mọi ngày',
'Lao động phổ thông xử lý công việc hỗ trợ giúp công trường xây dựng vận hành: vận chuyển vật liệu bằng tay hoặc xe đẩy, dọn dẹp mảnh vỡ và rác thải, giữ khu vực làm việc sạch sẽ và an toàn, và hỗ trợ các thợ chuyên môn trong công việc của họ. Không cần bằng cấp chính thức để bắt đầu, khiến đây là điểm vào dễ tiếp cận nhất trong ngành xây dựng.

Vai trò này là một kỳ học việc xuất sắc cho người đang quyết định chuyên ngành nào để chuyên môn hóa. Quan sát và hỗ trợ thợ chuyên môn từ gần cung cấp cái nhìn thực tế về các nghề nghiệp khác nhau.',
'[{"title":"Rào cản gia nhập thấp","description":"Không cần bằng cấp hoặc kinh nghiệm trước. Thể lực tốt và đáng tin cậy là điều quan trọng nhất khi bắt đầu."},
  {"title":"Nhiệm vụ đa dạng","description":"Nhiệm vụ thay đổi trong ngày — vận chuyển vật liệu, dọn dẹp, trộn vữa, hỗ trợ. Sức bền thể chất và khả năng làm theo hướng dẫn nhanh là đặc điểm chính."},
  {"title":"Con đường học nghề","description":"Làm việc cùng thợ chuyên môn là một trong những cách tốt nhất để học một nghề cụ thể và được nhận vào làm học nghề."}]'::jsonb,
'[{"name":"Vận chuyển vật liệu","level":"필수"},{"name":"Dọn dẹp & chỉnh lý công trường","level":"필수"},{"name":"Dùng dụng cụ cơ bản","level":"권장"},{"name":"Tuân thủ an toàn","level":"필수"}]'::jsonb,
'[{"type":"DAILY","minAmount":130000,"maxAmount":180000,"note":"Tùy kinh nghiệm và công trường"}]'::jsonb,
TRUE, 3
ON CONFLICT (category_id, locale) DO NOTHING;

-- ── TILE (ko / en / vi) ───────────────────────────────────────────────────────
INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='TILE'), 'ko',
'타일공이란?',
'욕실부터 외벽까지 타일로 마감을 완성하는 전문가',
'타일공은 건물 내외부 표면에 타일을 붙여 마감하는 전문 직종으로, 욕실·주방·외벽·바닥 등 다양한 부위에 시공합니다. 접착제 배합, 레벨링, 타일 컷팅, 줄눈 작업 등 섬세한 기술이 요구되며 완성도에 따라 건물의 미관과 방수 성능에 직접 영향을 미칩니다.

인테리어 리모델링 수요 증가와 함께 숙련 타일공의 수요는 꾸준히 높습니다. 도자기·포세린·모자이크 등 다양한 자재를 다룰 수 있으면 더 많은 일감을 확보할 수 있습니다.',
'[{"title":"섬세한 마감 능력","description":"타일 수평, 줄눈 간격, 컷팅 정밀도가 시공 품질과 방수 성능을 결정합니다."},
  {"title":"무릎·허리 부담","description":"쭈그려 앉아 장시간 작업하는 경우가 많아 관절 보호 장구 착용이 권장됩니다."},
  {"title":"다양한 자재 지식","description":"도자기 타일, 대형 포세린, 모자이크 등 자재별 특성과 적합한 접착제 선택이 중요합니다."}]'::jsonb,
'[{"name":"타일 붙이기","level":"필수"},{"name":"타일 컷팅","level":"필수"},{"name":"레벨링","level":"필수"},{"name":"방수 처리","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":290000,"note":"자재 종류와 시공 난이도에 따라 차등"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='TILE'), 'en',
'What is a Tile Layer?',
'The finishing specialist who transforms bathrooms, kitchens, and facades with tile',
'A tile layer installs ceramic, porcelain, mosaic, and natural-stone tiles on floors, walls, and external facades. Mixing adhesives correctly, setting tiles to a precise level, cutting complex shapes, and finishing with grout are the core tasks — the quality of this work determines both the appearance and the waterproofing performance of the surface.

Demand for skilled tile layers is strong and consistent, driven not only by new construction but by the ever-growing renovation and remodelling market.',
'[{"title":"Fine Finishing Skill","description":"Tile level, joint spacing, and cut precision together determine how watertight and visually consistent the finished surface is."},
  {"title":"Knee and Back Strain","description":"Extended kneeling and crouching are common. Knee pads and regular stretch breaks are strongly recommended."},
  {"title":"Material Knowledge","description":"Ceramic, large-format porcelain, mosaic, and stone each require different adhesives, spacers, and cutting techniques."}]'::jsonb,
'[{"name":"Tile setting","level":"필수"},{"name":"Tile cutting","level":"필수"},{"name":"Levelling","level":"필수"},{"name":"Waterproof membrane","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":290000,"note":"Varies with material type and complexity"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body, work_characteristics, related_skills, pricing_notes, is_published, reading_time_min)
SELECT (SELECT id FROM job_categories WHERE code='TILE'), 'vi',
'Thợ lát gạch là gì?',
'Chuyên gia hoàn thiện biến đổi nhà vệ sinh, nhà bếp và mặt tiền bằng gạch',
'Thợ lát gạch lắp đặt gạch gốm, sứ, đá mosaic và đá tự nhiên trên sàn, tường và mặt tiền ngoài. Trộn keo đúng cách, đặt gạch bằng phẳng chính xác, cắt hình dạng phức tạp và hoàn thiện bằng ron là các nhiệm vụ cốt lõi — chất lượng công việc này xác định cả vẻ ngoài lẫn hiệu suất chống thấm của bề mặt.

Nhu cầu về thợ lát gạch lành nghề mạnh và ổn định, được thúc đẩy không chỉ bởi xây dựng mới mà còn bởi thị trường cải tạo và sửa chữa ngày càng tăng.',
'[{"title":"Kỹ năng hoàn thiện tinh tế","description":"Độ phẳng gạch, khoảng cách mạch và độ chính xác khi cắt cùng nhau xác định độ chống thấm và tính đồng đều thị giác của bề mặt."},
  {"title":"Căng thẳng đầu gối và lưng","description":"Quỳ gối và ngồi xổm trong thời gian dài là phổ biến. Miếng đệm đầu gối và nghỉ giải lao thường xuyên được khuyến nghị."},
  {"title":"Kiến thức vật liệu","description":"Gốm, sứ định dạng lớn, đá mosaic và đá tự nhiên mỗi loại cần keo, miếng đệm và kỹ thuật cắt khác nhau."}]'::jsonb,
'[{"name":"Đặt gạch","level":"필수"},{"name":"Cắt gạch","level":"필수"},{"name":"San phẳng","level":"필수"},{"name":"Màng chống thấm","level":"권장"}]'::jsonb,
'[{"type":"DAILY","minAmount":180000,"maxAmount":290000,"note":"Tùy loại vật liệu và độ phức tạp"}]'::jsonb,
TRUE, 4
ON CONFLICT (category_id, locale) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15c. Trade Guide FAQs — all 15 trades × ko / en / vi
-- ══════════════════════════════════════════════════════════════════════════════
DELETE FROM faqs WHERE category_id IN (SELECT id FROM job_categories WHERE code IN (
  'CONCRETE','REBAR','FORM','MASONRY','TILE','PLUMBING','ELECTRICAL',
  'PAINTING','SCAFFOLD','WATERPROOF','CRANE','EXCAVATOR','WELDER','INTERIOR','GENERAL'
));

INSERT INTO faqs (category_id, locale, question, answer, sort_order, is_published) VALUES
-- CONCRETE
((SELECT id FROM job_categories WHERE code='CONCRETE'),'ko','콘크리트공이 되려면 어떤 자격증이 필요한가요?','법적으로 필수인 자격증은 없지만 건설기능사(콘크리트) 자격증 취득 시 현장 신뢰도와 일당이 올라갑니다. 처음에는 무자격으로 시작해 경력을 쌓으면서 취득하는 경우가 많습니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CONCRETE'),'ko','외국인도 콘크리트공으로 일할 수 있나요?','네, 가능합니다. E-9(비전문취업), H-2(방문취업) 비자 소지자는 건설업 취업이 허용됩니다. GADA를 통해 합법적인 현장 매칭을 받으실 수 있습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='CONCRETE'),'en','Do I need a qualification to work as a concrete worker?','No mandatory licence is required to start, but a construction craftsman certificate improves site credibility and daily wages. Most workers begin without one and obtain it after gaining practical experience.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CONCRETE'),'en','Can foreign workers get concrete work in Korea?','Yes. Workers with E-9 (non-professional employment) or H-2 (visit employment) visas are permitted to work in construction. GADA matches you to legal job sites that accept your visa type.',2,TRUE),
((SELECT id FROM job_categories WHERE code='CONCRETE'),'vi','Tôi có cần bằng cấp để làm thợ bê tông không?','Không có bằng bắt buộc để bắt đầu, nhưng có chứng chỉ thợ thủ công xây dựng cải thiện uy tín và mức lương ngày. Hầu hết thợ bắt đầu không có bằng và lấy sau khi tích lũy kinh nghiệm thực tế.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CONCRETE'),'vi','Lao động nước ngoài có thể làm thợ bê tông ở Hàn Quốc không?','Có. Người lao động có visa E-9 hoặc H-2 được phép làm việc trong ngành xây dựng. GADA ghép bạn với các công trường hợp pháp chấp nhận loại visa của bạn.',2,TRUE),
-- REBAR
((SELECT id FROM job_categories WHERE code='REBAR'),'ko','철근기능사 자격증은 취업에 얼마나 중요한가요?','자격증 없이도 현장 투입이 가능하지만, 철근기능사 자격증 보유 시 일당이 20~30% 이상 높아지는 경우가 많습니다. 경력 1년 이상이면 충분히 도전할 수 있습니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='REBAR'),'ko','철근 작업에서 가장 흔한 부상은 무엇인가요?','무거운 철근을 반복적으로 다루어 허리와 손목 부상이 가장 많습니다. 올바른 자세와 적절한 휴식으로 장기적인 부상 위험을 크게 줄일 수 있습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='REBAR'),'en','How important is a rebar qualification for employment?','You can start without one, but a rebar craftsman certificate typically adds 20–30% or more to the daily rate. Most workers pursue it after about a year of practical experience.',1,TRUE),
((SELECT id FROM job_categories WHERE code='REBAR'),'en','What is the biggest injury risk for rebar workers?','Back and wrist injuries from repetitive heavy lifting are most common. Proper lifting technique, stretch breaks, and wrist supports significantly reduce long-term risk.',2,TRUE),
((SELECT id FROM job_categories WHERE code='REBAR'),'vi','Bằng thợ sắt quan trọng như thế nào cho việc tuyển dụng?','Bạn có thể bắt đầu mà không có, nhưng chứng chỉ thợ thủ công cốt thép thường tăng thêm 20–30% mức lương ngày. Hầu hết thợ theo đuổi bằng sau khoảng một năm kinh nghiệm thực tế.',1,TRUE),
((SELECT id FROM job_categories WHERE code='REBAR'),'vi','Rủi ro chấn thương lớn nhất cho thợ sắt là gì?','Chấn thương lưng và cổ tay do nâng vật nặng lặp đi lặp lại là phổ biến nhất. Kỹ thuật nâng đúng cách và nghỉ giải lao giảm đáng kể rủi ro lâu dài.',2,TRUE),
-- FORM
((SELECT id FROM job_categories WHERE code='FORM'),'ko','거푸집공은 목수 경력이 없어도 시작할 수 있나요?','네, 가능합니다. 목공 경력이 없어도 현장에서 배우며 시작할 수 있습니다. 기본적인 줄자·수평기 사용법을 익혀오면 입문이 훨씬 수월합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='FORM'),'ko','거푸집공과 인테리어 목공의 차이는 무엇인가요?','거푸집공은 콘크리트 타설을 위한 임시 형틀 제작에 특화되어 있습니다. 인테리어 목공보다 외부 작업과 중장비 협업이 많고, 반복적인 조립·해체 작업이 주를 이룹니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='FORM'),'en','Do I need carpentry experience to start as a formwork carpenter?','No prior carpentry experience is required — many workers learn on the job. Basic familiarity with a tape measure and spirit level makes the learning curve easier.',1,TRUE),
((SELECT id FROM job_categories WHERE code='FORM'),'en','How does formwork carpentry differ from interior carpentry?','Formwork is focused on temporary structures for concrete pours — more outdoor work and heavy-equipment coordination, dominated by repetitive erect-and-strip cycles rather than fine finish work.',2,TRUE),
((SELECT id FROM job_categories WHERE code='FORM'),'vi','Tôi có cần kinh nghiệm mộc để làm thợ cốp pha không?','Không cần kinh nghiệm mộc trước — nhiều thợ học ngay tại công trường. Quen với thước cuộn và thước thủy sẽ giúp quá trình học dễ hơn.',1,TRUE),
((SELECT id FROM job_categories WHERE code='FORM'),'vi','Thợ cốp pha khác thợ mộc nội thất như thế nào?','Thợ cốp pha tập trung vào kết cấu tạm cho việc đổ bê tông — nhiều công việc ngoài trời hơn và phối hợp thiết bị nặng hơn, chủ yếu là chu trình lắp đặt-tháo dỡ lặp đi lặp lại.',2,TRUE),
-- MASONRY
((SELECT id FROM job_categories WHERE code='MASONRY'),'ko','조적공은 진입 장벽이 높은 편인가요?','비교적 낮은 편입니다. 기본 기술은 현장에서 배울 수 있고 경력을 쌓으면서 임금이 오릅니다. 수평·수직을 잡는 감각은 꾸준한 연습이 필요합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='MASONRY'),'ko','조적공과 미장공의 차이가 있나요?','조적공은 벽돌·블록을 쌓는 작업이 주이고, 미장공은 시멘트 모르타르를 벽면에 바르는 마감 작업이 주입니다. 현장에서 두 작업 모두 수행하는 경우도 많습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='MASONRY'),'en','Is masonry work hard to break into without experience?','The entry barrier is relatively low — core skills can be learned on the job and wages rise with experience. Developing an eye and feel for level and plumb is what takes consistent practice.',1,TRUE),
((SELECT id FROM job_categories WHERE code='MASONRY'),'en','What is the difference between a masonry worker and a plasterer?','A masonry worker primarily lays bricks, blocks, and stone using mortar. A plasterer applies the cement or gypsum render coat to wall surfaces. On many sites the same worker does both.',2,TRUE),
((SELECT id FROM job_categories WHERE code='MASONRY'),'vi','Nghề xây có khó gia nhập khi không có kinh nghiệm không?','Rào cản gia nhập tương đối thấp — kỹ năng cốt lõi có thể học khi làm việc và mức lương tăng theo kinh nghiệm. Phát triển mắt và cảm giác về mức ngang và độ thẳng đòi hỏi luyện tập nhất quán.',1,TRUE),
((SELECT id FROM job_categories WHERE code='MASONRY'),'vi','Sự khác biệt giữa thợ xây và thợ trát là gì?','Thợ xây chủ yếu đặt gạch và khối xây bằng vữa. Thợ trát thi công lớp xi măng hoặc thạch cao lên bề mặt tường. Trên nhiều công trường cùng một thợ làm cả hai.',2,TRUE),
-- TILE
((SELECT id FROM job_categories WHERE code='TILE'),'ko','타일공은 자격증이 필요한가요?','법적으로 필수는 아니지만 타일기능사 자격증 취득 시 일당이 높아지고 더 다양한 현장에 투입될 수 있습니다. 경력을 쌓으면서 도전해보는 것을 추천합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='TILE'),'ko','대형 포세린 타일 시공은 일반 타일과 많이 다른가요?','네, 다릅니다. 대형 포세린은 무게가 무거워 두 명이 작업하는 경우가 많고, 전용 접착제와 레벨링 클립 시스템을 사용해야 합니다. 숙련도가 높을수록 일당도 높아집니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='TILE'),'en','Do tile layers need a qualification?','No legal requirement, but a tile-laying craftsman certificate raises daily wages and makes you eligible for a wider range of sites. Pursuing it after hands-on experience is recommended.',1,TRUE),
((SELECT id FROM job_categories WHERE code='TILE'),'en','Is large-format porcelain tile work significantly different?','Yes. Large-format tiles are heavy — often requiring two workers — and need specialist adhesive and levelling-clip systems. Skill with large-format tile commands a higher daily rate.',2,TRUE),
((SELECT id FROM job_categories WHERE code='TILE'),'vi','Thợ lát gạch có cần bằng cấp không?','Không có yêu cầu pháp lý, nhưng chứng chỉ thợ lát gạch tăng mức lương ngày và giúp bạn đủ điều kiện cho nhiều công trường hơn. Khuyến khích theo đuổi sau khi có kinh nghiệm thực tế.',1,TRUE),
((SELECT id FROM job_categories WHERE code='TILE'),'vi','Công việc gạch sứ định dạng lớn có khác biệt đáng kể không?','Có. Gạch định dạng lớn nặng — thường cần hai thợ — và cần keo đặc biệt và hệ thống kẹp san bằng. Kỹ năng với gạch định dạng lớn nhận mức lương ngày cao hơn.',2,TRUE),
-- PLUMBING
((SELECT id FROM job_categories WHERE code='PLUMBING'),'ko','배관기능사 자격증은 어디서 취득할 수 있나요?','한국산업인력공단에서 배관기능사 시험을 진행합니다. 필기와 실기 시험으로 구성되어 있으며, 실기 준비를 위해 직업훈련기관을 이용하면 도움이 됩니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PLUMBING'),'ko','가스 배관 작업은 아무나 할 수 있나요?','아니요. 가스 배관 시공은 가스기능사 이상의 자격증 보유자만 수행할 수 있습니다. 무자격자가 가스 배관 작업을 하면 법적 처벌을 받을 수 있습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='PLUMBING'),'en','Where can I get a plumbing qualification in Korea?','HRD Korea administers the plumbing craftsman examination, which consists of a written and a practical test. Vocational training institutes can help with practical exam preparation.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PLUMBING'),'en','Can anyone do gas-pipe work?','No. Gas-pipe installation is legally restricted to individuals holding at minimum a gas craftsman licence. Doing gas work without the required licence carries legal penalties.',2,TRUE),
((SELECT id FROM job_categories WHERE code='PLUMBING'),'vi','Tôi có thể lấy bằng nghề ống nước ở Hàn Quốc ở đâu?','HRD Korea tổ chức kỳ thi thợ ống nước, bao gồm bài kiểm tra lý thuyết và thực hành. Các cơ sở đào tạo nghề có thể giúp chuẩn bị cho kỳ thi thực hành.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PLUMBING'),'vi','Ai cũng có thể làm công việc ống khí đốt không?','Không. Lắp đặt ống khí đốt bị pháp luật hạn chế đối với những người có ít nhất bằng thợ khí đốt. Làm công việc khí đốt mà không có bằng yêu cầu sẽ bị xử phạt pháp lý.',2,TRUE),
-- ELECTRICAL
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'ko','전기기능사 자격증 없이도 전기 작업을 할 수 있나요?','보조 인력으로는 가능하지만, 실제 배선 작업을 수행하려면 전기기능사 자격증이 필요합니다. 자격증 없이는 자격증 보유 기술자 지도 하에 보조 업무만 가능합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'ko','전기산업기사와 전기기능사는 어떻게 다른가요?','전기기능사는 현장 배선 작업을 수행할 수 있는 기본 자격입니다. 전기산업기사는 더 높은 등급으로 설계·감리 업무까지 가능하며 일당도 크게 높아집니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'en','Can I do electrical work without a licence?','You can assist a licensed electrician, but you cannot independently perform wiring work. A minimum electrical craftsman licence is required for independent installation work.',1,TRUE),
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'en','What is the difference between an electrical craftsman and an industrial technician licence?','An electrical craftsman (기능사) permits independent site wiring. An industrial technician (산업기사) is a higher grade covering design and supervision, commanding significantly higher wages.',2,TRUE),
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'vi','Tôi có thể làm công việc điện mà không có bằng không?','Bạn có thể làm trợ lý cho thợ điện có bằng, nhưng không thể độc lập thực hiện công việc đi dây. Cần ít nhất bằng thợ điện để thực hiện lắp đặt một cách độc lập.',1,TRUE),
((SELECT id FROM job_categories WHERE code='ELECTRICAL'),'vi','Sự khác biệt giữa bằng thợ thủ công điện và kỹ thuật viên điện là gì?','Bằng thợ thủ công (기능사) cho phép đi dây độc lập. Kỹ thuật viên (산업기사) là cấp cao hơn bao gồm thiết kế và giám sát, với mức lương cao hơn đáng kể.',2,TRUE),
-- PAINTING
((SELECT id FROM job_categories WHERE code='PAINTING'),'ko','도장공은 어떤 계절에 일감이 많은가요?','봄·가을이 외벽 도장 성수기이며 여름과 겨울에는 실내 작업 위주로 전환됩니다. 날씨에 따라 일정이 자주 변경될 수 있습니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PAINTING'),'ko','에폭시 도장은 일반 페인트 작업과 다른가요?','네, 에폭시는 2액형 제품으로 혼합 비율과 가사 시간 관리가 중요합니다. 바닥 에폭시나 산업 도장은 기술 습득이 필요하지만 일당이 일반 도장보다 높습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='PAINTING'),'en','Which season is busiest for painters?','Spring and autumn are peak season for exterior work; summer and winter shift towards interior painting. Year-round employment is achievable, but weather frequently disrupts outdoor schedules.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PAINTING'),'en','Is epoxy coating work very different from regular painting?','Yes. Epoxy is a two-component product requiring careful mixing ratios and pot-life management. Floor epoxy and industrial coating pays significantly more than standard painting.',2,TRUE),
((SELECT id FROM job_categories WHERE code='PAINTING'),'vi','Mùa nào bận rộn nhất cho thợ sơn?','Mùa xuân và thu là mùa cao điểm cho sơn ngoài trời; mùa hè và đông chuyển sang sơn nội thất. Có thể làm việc quanh năm nhưng thời tiết thường xuyên làm gián đoạn lịch ngoài trời.',1,TRUE),
((SELECT id FROM job_categories WHERE code='PAINTING'),'vi','Công việc phủ epoxy có khác nhiều so với sơn thông thường không?','Có. Epoxy là sản phẩm hai thành phần cần quản lý tỷ lệ trộn và thời gian sử dụng. Epoxy sàn và sơn công nghiệp trả cao hơn đáng kể so với sơn tiêu chuẩn.',2,TRUE),
-- SCAFFOLD
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'ko','비계기능사 자격증 없이도 비계 작업을 할 수 있나요?','보조 인력으로는 참여 가능하지만, 독립적으로 비계 조립·해체를 수행하려면 비계기능사 자격증이 필요합니다. 자격증 취득 시 일당이 크게 올라갑니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'ko','비계 작업 중 가장 주의해야 할 안전 사항은 무엇인가요?','낙하물 방지(안전망, 발끝막이판)와 본인 추락 방지(안전벨트 착용)가 가장 중요합니다. 비계 조립 기준 미준수 시 과태료 부과 및 형사처벌 대상이 됩니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'en','Do I need a scaffold licence to erect scaffolding?','You can assist a licensed scaffolder without one, but independently erecting or dismantling scaffolding requires a scaffold technician certificate. The licence significantly increases pay.',1,TRUE),
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'en','What are the most critical safety points in scaffold work?','Preventing falls from the scaffold (mandatory safety harness) and preventing objects from falling below (toe-boards and safety netting) are the two most critical priorities.',2,TRUE),
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'vi','Tôi có cần bằng giàn giáo để dựng giàn giáo không?','Bạn có thể hỗ trợ thợ có bằng mà không cần, nhưng độc lập dựng hoặc tháo giàn giáo yêu cầu chứng chỉ kỹ thuật viên giàn giáo. Bằng tăng đáng kể mức lương ngày.',1,TRUE),
((SELECT id FROM job_categories WHERE code='SCAFFOLD'),'vi','Những điểm an toàn quan trọng nhất trong công việc giàn giáo là gì?','Ngăn ngừa người ngã (dây bảo hiểm bắt buộc) và ngăn vật rơi xuống bên dưới (tấm chắn chân và lưới an toàn) là hai ưu tiên quan trọng nhất.',2,TRUE),
-- WATERPROOF
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'ko','방수공 일을 시작하려면 어떤 준비가 필요한가요?','처음에는 자격증 없이도 보조 인력으로 참여 가능합니다. 방수기능사 자격증을 취득하면 독립 시공이 가능해지며 일당이 크게 올라갑니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'ko','방수 시공 후 품질 확인은 어떻게 하나요?','우레탄·도막방수는 완전 양생에 24~72시간이 소요됩니다. 작업 후 담수 시험으로 누수 여부를 확인하며, 하자 발생 시 보수 책임이 있어 품질 관리가 중요합니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'en','What preparation do I need to start waterproofing work?','You can start as an assistant without a licence. A waterproofing craftsman licence enables independent work and significantly raises the daily rate. Basic chemical-safety training is strongly recommended.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'en','How soon after application can waterproofing be tested?','Urethane and liquid-applied coatings typically need 24–72 hours to cure. After curing, a ponding test checks for leaks. Quality matters greatly — defects are the installer''s warranty responsibility.',2,TRUE),
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'vi','Tôi cần chuẩn bị gì để bắt đầu công việc chống thấm?','Bạn có thể bắt đầu làm trợ lý mà không cần bằng. Bằng thợ chống thấm cho phép làm việc độc lập và tăng đáng kể mức lương ngày. Đào tạo an toàn hóa chất cơ bản cũng được khuyến nghị.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WATERPROOF'),'vi','Bao lâu sau khi thi công thì có thể kiểm tra chống thấm?','Lớp phủ urethane và lỏng thường cần 24–72 giờ để bảo dưỡng. Sau bảo dưỡng, thử nghiệm đọng nước kiểm tra rò rỉ. Chất lượng rất quan trọng — khuyết điểm là trách nhiệm bảo hành của người lắp đặt.',2,TRUE),
-- CRANE
((SELECT id FROM job_categories WHERE code='CRANE'),'ko','타워크레인운전기능사 자격증은 어떻게 취득하나요?','한국산업인력공단에서 시험을 진행합니다. 필기시험 합격 후 실기 시험을 통과해야 합니다. 민간 교육기관의 장비 운전 훈련 과정 이수를 추천합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CRANE'),'ko','크레인 기사의 하루 근무 패턴은 어떻게 되나요?','현장 출근 전 크레인 점검을 마치고 작업 시간 내내 운전석에서 신호수와 무전 통신하며 자재를 운반합니다. 한 현장에 장기간 배치되는 경우가 많아 안정적인 근무 환경이 장점입니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='CRANE'),'en','How do I obtain a tower crane operator licence in Korea?','HRD Korea administers the tower crane operator craftsman test. After passing the written exam you must pass the practical test. Attending a private training institute for machine-time practice is strongly recommended.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CRANE'),'en','What does a typical working day look like for a crane operator?','Operators complete a pre-shift crane inspection, then spend the working day in the cab communicating with a banksman by radio to position loads. Long-term assignment to one site is common, providing stable employment.',2,TRUE),
((SELECT id FROM job_categories WHERE code='CRANE'),'vi','Làm thế nào để lấy bằng lái cần cẩu tháp ở Hàn Quốc?','HRD Korea tổ chức kỳ thi thợ vận hành cần cẩu tháp. Sau khi đỗ bài kiểm tra lý thuyết, bạn phải đỗ bài kiểm tra thực hành. Tham gia viện đào tạo tư nhân để thực hành được khuyến nghị mạnh mẽ.',1,TRUE),
((SELECT id FROM job_categories WHERE code='CRANE'),'vi','Ngày làm việc điển hình của thợ lái cần cẩu như thế nào?','Thợ lái hoàn thành kiểm tra cần cẩu trước ca, sau đó dành ngày làm việc trong cabin giao tiếp với người đứng hiệu qua radio để định vị tải. Được giao cho một công trường trong thời gian dài là phổ biến, tạo ra việc làm ổn định.',2,TRUE),
-- EXCAVATOR
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'ko','굴삭기운전기능사 자격증은 얼마나 걸려서 취득할 수 있나요?','필기와 실기 시험으로 구성되며, 실기 준비(장비 운전 훈련)를 포함해 보통 2~4개월이 소요됩니다. 직업훈련기관이나 중장비 학원을 통해 준비하는 것을 추천합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'ko','여러 종류의 굴삭기를 운전할 수 있으면 유리한가요?','네, 크게 유리합니다. 미니 굴삭기부터 대형 굴삭기, 다양한 어태치먼트를 다룰 수 있으면 더 많은 현장에서 더 높은 일당을 받을 수 있습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'en','How long does it take to get an excavator operator licence?','The process consists of a written test and a practical driving test. Including machine-time practice, most people complete it in 2–4 months via a vocational training institute or heavy-equipment school.',1,TRUE),
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'en','Is it an advantage to operate multiple excavator types?','Yes, significantly. Operators who can run mini through large machines, and handle various attachments, access more sites and command higher daily rates.',2,TRUE),
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'vi','Mất bao lâu để lấy bằng lái máy xúc?','Quá trình bao gồm bài kiểm tra lý thuyết và thực hành. Bao gồm thực hành thời gian trên máy, hầu hết mọi người hoàn thành trong 2–4 tháng qua viện đào tạo nghề hoặc trường thiết bị hạng nặng.',1,TRUE),
((SELECT id FROM job_categories WHERE code='EXCAVATOR'),'vi','Có lợi thế khi vận hành được nhiều loại máy xúc không?','Có, đáng kể. Thợ lái vận hành được từ máy xúc mini đến máy lớn và nhiều thiết bị đính kèm tiếp cận nhiều công trường và nhận mức lương ngày cao hơn.',2,TRUE),
-- WELDER
((SELECT id FROM job_categories WHERE code='WELDER'),'ko','용접공의 일당 범위는 어느 정도인가요?','일반 아크·CO2 용접은 일당 22~32만원, 특수 TIG·플랜트 용접은 32~48만원 수준입니다. 보유 자격증, 작업 종류, 지역에 따라 크게 달라집니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WELDER'),'ko','용접 자격증은 어떤 종류가 있나요?','용접기능사(일반), 특수용접기능사(TIG·MIG 등), 압력용기용접기능사 등이 있습니다. 등급이 높을수록 고임금 현장에 투입될 수 있습니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='WELDER'),'en','What is the daily wage range for welders?','General arc and CO₂ welding pays ₩220,000–₩320,000 per day. Specialty TIG and plant welding pays ₩320,000–₩480,000. The range depends heavily on certification, work type, and region.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WELDER'),'en','What welding certifications are available in Korea?','The main tiers are: welding craftsman (arc/CO₂), specialty welding craftsman (TIG/MIG), and pressure-vessel welding craftsman. Higher grades unlock higher-wage sites and faster career progression.',2,TRUE),
((SELECT id FROM job_categories WHERE code='WELDER'),'vi','Mức lương ngày cho thợ hàn là bao nhiêu?','Hàn hồ quang và CO₂ thông thường trả 220.000–320.000 won/ngày. Hàn TIG đặc biệt và hàn nhà máy trả 320.000–480.000 won. Mức độ phụ thuộc nhiều vào chứng chỉ và loại công việc.',1,TRUE),
((SELECT id FROM job_categories WHERE code='WELDER'),'vi','Có những chứng chỉ hàn nào ở Hàn Quốc?','Các cấp chính là: thợ hàn thủ công (hồ quang/CO₂), thợ hàn đặc biệt (TIG/MIG) và thợ hàn bình áp lực. Cấp cao hơn mở ra các công trường lương cao hơn và tiến độ nghề nghiệp nhanh hơn.',2,TRUE),
-- INTERIOR
((SELECT id FROM job_categories WHERE code='INTERIOR'),'ko','인테리어공은 어떤 기술부터 배우면 좋을까요?','도배(벽지 시공)와 마루 시공이 수요가 가장 많아 입문하기 좋습니다. 이 두 가지를 숙련하고 나서 몰딩, 천장, 목공 순으로 범위를 넓혀 가면 꾸준히 일감을 확보할 수 있습니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='INTERIOR'),'ko','신축 공사와 리모델링 중 어느 쪽 일감이 더 많은가요?','최근에는 리모델링 수요가 크게 늘어 인테리어공에게 더 많은 기회가 생기고 있습니다. 리모델링은 기존 마감 철거 후 재시공으로 작업 범위가 다양하고 연중 균등하게 일감이 분산됩니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='INTERIOR'),'en','Which interior finishing skill is best to learn first?','Wallpaper hanging and flooring installation have the highest demand and are the best entry points. Once competent in those two, expanding to moulding, ceilings, and carpentry steadily builds market value.',1,TRUE),
((SELECT id FROM job_categories WHERE code='INTERIOR'),'en','Is renovation or new-build work more plentiful for interior finishers?','Renovation demand has grown strongly in recent years, creating more opportunities. Renovation involves stripping and replacing existing finishes across a wide variety of work types, providing relatively even year-round demand.',2,TRUE),
((SELECT id FROM job_categories WHERE code='INTERIOR'),'vi','Kỹ năng hoàn thiện nội thất nào tốt nhất để học đầu tiên?','Dán giấy tường và lắp sàn nhà có nhu cầu cao nhất và là điểm gia nhập tốt nhất. Khi thành thạo hai kỹ năng đó, mở rộng sang gờ, trần và mộc dần dần tăng giá trị thị trường.',1,TRUE),
((SELECT id FROM job_categories WHERE code='INTERIOR'),'vi','Công việc cải tạo hay xây mới nhiều hơn cho thợ nội thất?','Nhu cầu cải tạo tăng mạnh trong những năm gần đây, tạo ra nhiều cơ hội hơn. Cải tạo liên quan đến tháo và thay thế lớp hoàn thiện hiện có trên nhiều loại công việc, cung cấp nhu cầu đều quanh năm.',2,TRUE),
-- GENERAL
((SELECT id FROM job_categories WHERE code='GENERAL'),'ko','일반 노무로 시작해서 전문 직종으로 바꿀 수 있나요?','네, 가능합니다. 많은 건설 기술자들이 일반 노무로 시작해 현장에서 기술을 배우고 전문 직종으로 전환했습니다. 관심 있는 직종 기술자 옆에서 적극적으로 배우는 자세가 중요합니다.',1,TRUE),
((SELECT id FROM job_categories WHERE code='GENERAL'),'ko','일반 노무로 처음 현장에 투입될 때 준비해야 할 것이 있나요?','안전화, 안전모, 작업복은 기본 필수품입니다. 가장 중요한 것은 안전 교육 이수와 지시에 따르는 태도입니다.',2,TRUE),
((SELECT id FROM job_categories WHERE code='GENERAL'),'en','Can I switch from general labour to a specialised trade?','Yes, and it is a well-trodden path. Many skilled tradespeople started as general labourers and learned their trade by assisting specialists on site. Taking an active interest and asking questions is the key.',1,TRUE),
((SELECT id FROM job_categories WHERE code='GENERAL'),'en','What should I bring on my first day as a general labourer?','Safety boots, a hard hat, and work clothing are the basic essentials. The most important preparation is completing any required safety induction and coming with a cooperative, safety-conscious attitude.',2,TRUE),
((SELECT id FROM job_categories WHERE code='GENERAL'),'vi','Tôi có thể chuyển từ lao động phổ thông sang nghề chuyên môn không?','Có, và đây là con đường đã được nhiều người đi qua. Nhiều thợ có tay nghề bắt đầu làm lao động phổ thông và học nghề bằng cách hỗ trợ chuyên gia tại công trường.',1,TRUE),
((SELECT id FROM job_categories WHERE code='GENERAL'),'vi','Tôi nên mang gì vào ngày đầu tiên làm lao động phổ thông?','Giày bảo hộ, mũ cứng và quần áo bảo hộ là những thứ cần thiết cơ bản. Chuẩn bị quan trọng nhất là hoàn thành đào tạo an toàn cần thiết và đến với thái độ hợp tác, ý thức an toàn.',2,TRUE);


-- =================================================================
-- V14__points_and_proposals.sql
-- =================================================================
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


-- =================================================================
-- V17__chat_system.sql
-- =================================================================
-- V17: Chat system (employer ↔ team leader)

CREATE TABLE IF NOT EXISTS chat_rooms (
    id                    BIGSERIAL PRIMARY KEY,
    public_id             UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employer_id           BIGINT NOT NULL REFERENCES users(id),
    team_public_id        VARCHAR(100) NOT NULL,
    team_leader_id        BIGINT NOT NULL REFERENCES users(id),
    team_name             VARCHAR(255),
    points_used           INTEGER NOT NULL DEFAULT 1,
    employer_unread       INTEGER NOT NULL DEFAULT 0,
    leader_unread         INTEGER NOT NULL DEFAULT 0,
    last_message_at       TIMESTAMPTZ,
    last_message_preview  VARCHAR(200),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (employer_id, team_public_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id          BIGSERIAL PRIMARY KEY,
    public_id   UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    room_id     BIGINT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id   BIGINT NOT NULL REFERENCES users(id),
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_rooms_employer ON chat_rooms(employer_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_leader ON chat_rooms(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_created ON chat_messages(room_id, created_at);


-- =================================================================
-- V18__member_proposals.sql
-- =================================================================
-- V18: Team member proposals (worker proposes to join a team)

CREATE TABLE IF NOT EXISTS member_proposals (
    id                BIGSERIAL PRIMARY KEY,
    public_id         UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    team_public_id    VARCHAR(100) NOT NULL,
    team_leader_id    BIGINT NOT NULL REFERENCES users(id),
    proposer_id       BIGINT NOT NULL REFERENCES users(id),
    message           TEXT,
    status            VARCHAR(20) NOT NULL DEFAULT 'PENDING'
                        CHECK (status IN ('PENDING','ACCEPTED','DECLINED')),
    responded_at      TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (team_public_id, proposer_id)
);

CREATE INDEX IF NOT EXISTS idx_member_proposals_leader   ON member_proposals(team_leader_id);
CREATE INDEX IF NOT EXISTS idx_member_proposals_proposer ON member_proposals(proposer_id);
CREATE INDEX IF NOT EXISTS idx_member_proposals_team     ON member_proposals(team_public_id);


-- =================================================================
-- V19__contract_templates_and_chat_contracts.sql
-- =================================================================
-- V19: Contract templates + contract message type in chat

-- Contract templates (per employer)
CREATE TABLE IF NOT EXISTS contract_templates (
    id              BIGSERIAL PRIMARY KEY,
    public_id       UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    employer_user_id BIGINT NOT NULL REFERENCES users(id) UNIQUE,
    pay_amount      INTEGER,
    pay_unit        VARCHAR(20),
    terms           TEXT,
    document_url    VARCHAR(500),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add message type to chat messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) NOT NULL DEFAULT 'TEXT';
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS contract_public_id UUID;


-- =================================================================
-- V20__direct_chat.sql
-- =================================================================
-- Direct 1:1 chat rooms between workers/team leaders
CREATE TABLE IF NOT EXISTS direct_chat_rooms (
    id           BIGSERIAL PRIMARY KEY,
    public_id    UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    sender_id    BIGINT      NOT NULL REFERENCES users(id),
    recipient_id BIGINT      NOT NULL REFERENCES users(id),
    sender_unread   INT      NOT NULL DEFAULT 0,
    recipient_unread INT     NOT NULL DEFAULT 0,
    last_message_at  TIMESTAMPTZ,
    last_message_preview VARCHAR(200),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (sender_id, recipient_id)
);

CREATE TABLE IF NOT EXISTS direct_chat_messages (
    id        BIGSERIAL PRIMARY KEY,
    public_id UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    room_id   BIGINT      NOT NULL REFERENCES direct_chat_rooms(id) ON DELETE CASCADE,
    sender_id BIGINT      NOT NULL REFERENCES users(id),
    content   TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_direct_chat_rooms_sender    ON direct_chat_rooms(sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_chat_rooms_recipient ON direct_chat_rooms(recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_chat_messages_room   ON direct_chat_messages(room_id);


-- =================================================================
-- V22__clean_application_status_enum.sql
-- =================================================================
-- ────────────────────────────────────────────────────────────
-- V22: Remove legacy application_status enum values that don't
--      exist in the Kotlin ApplicationStatus enum, preventing
--      "No enum constant" runtime errors.
--
-- Affected tables: applications (status col + indexes),
--                  application_status_history (from_status, to_status)
-- Legacy values removed: PENDING, REVIEWING, ACCEPTED, CANCELLED
-- Valid values kept: APPLIED, UNDER_REVIEW, SHORTLISTED,
--   INTERVIEW_PENDING, ON_HOLD, REJECTED, HIRED, WITHDRAWN
-- ────────────────────────────────────────────────────────────

-- 1. Map legacy rows to valid equivalents (applications)
UPDATE applications SET status = 'APPLIED'       WHERE status::text = 'PENDING';
UPDATE applications SET status = 'UNDER_REVIEW'  WHERE status::text = 'REVIEWING';
UPDATE applications SET status = 'HIRED'         WHERE status::text = 'ACCEPTED';
UPDATE applications SET status = 'WITHDRAWN'     WHERE status::text = 'CANCELLED';

-- 2. Map legacy rows in history table
UPDATE application_status_history SET from_status = 'APPLIED'       WHERE from_status::text = 'PENDING';
UPDATE application_status_history SET from_status = 'UNDER_REVIEW'  WHERE from_status::text = 'REVIEWING';
UPDATE application_status_history SET from_status = 'HIRED'         WHERE from_status::text = 'ACCEPTED';
UPDATE application_status_history SET from_status = 'WITHDRAWN'     WHERE from_status::text = 'CANCELLED';
UPDATE application_status_history SET to_status = 'APPLIED'         WHERE to_status::text = 'PENDING';
UPDATE application_status_history SET to_status = 'UNDER_REVIEW'    WHERE to_status::text = 'REVIEWING';
UPDATE application_status_history SET to_status = 'HIRED'           WHERE to_status::text = 'ACCEPTED';
UPDATE application_status_history SET to_status = 'WITHDRAWN'       WHERE to_status::text = 'CANCELLED';

-- 3. Drop column defaults that reference the enum
ALTER TABLE applications ALTER COLUMN status DROP DEFAULT;

-- 4. Drop indexes referencing the enum column
DROP INDEX IF EXISTS idx_applications_status;
DROP INDEX IF EXISTS idx_applications_job_status;

-- 5. Convert ALL enum columns to VARCHAR (applications + history)
ALTER TABLE applications ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
ALTER TABLE application_status_history ALTER COLUMN from_status TYPE VARCHAR(50) USING from_status::text;
ALTER TABLE application_status_history ALTER COLUMN to_status TYPE VARCHAR(50) USING to_status::text;

-- 6. Now safe to drop and recreate the enum
DROP TYPE application_status;
CREATE TYPE application_status AS ENUM (
    'APPLIED',
    'UNDER_REVIEW',
    'SHORTLISTED',
    'INTERVIEW_PENDING',
    'ON_HOLD',
    'REJECTED',
    'HIRED',
    'WITHDRAWN'
);

-- 7. Restore enum columns
ALTER TABLE applications ALTER COLUMN status TYPE application_status USING status::application_status;
ALTER TABLE application_status_history ALTER COLUMN from_status TYPE application_status USING from_status::application_status;
ALTER TABLE application_status_history ALTER COLUMN to_status TYPE application_status USING to_status::application_status;

-- 8. Restore column default with a valid value
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'APPLIED'::application_status;

-- 9. Recreate indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_job_status ON applications(job_id, status) WHERE deleted_at IS NULL;


-- =================================================================
-- V23__fix_team_invite_flow.sql
-- =================================================================
-- ────────────────────────────────────────────────────────────────────────────
-- V23: Fix team invitation flow
--
-- Problem: joined_at was NOT NULL with DEFAULT NOW(), so PENDING invites
--          got a joinedAt immediately and appeared as full team members.
--
-- Fix: Make joined_at nullable so PENDING members have no joinedAt.
--      It is set only when the invitation is ACCEPTED.
-- ────────────────────────────────────────────────────────────────────────────

-- 1. Drop the default so existing NULL behaviour is preserved on new inserts
ALTER TABLE team_members ALTER COLUMN joined_at DROP DEFAULT;

-- 2. Allow NULL (pending invitations have no joined_at until accepted)
ALTER TABLE team_members ALTER COLUMN joined_at DROP NOT NULL;

-- 3. Clear joinedAt for any existing PENDING members that incorrectly have it set
UPDATE team_members SET joined_at = NULL WHERE invitation_status = 'PENDING';


-- =================================================================
-- V24__toss_payments.sql
-- =================================================================
-- V24: Toss Payments — add payment gateway fields to point_charge_requests
ALTER TABLE point_charge_requests
  ADD COLUMN IF NOT EXISTS toss_payment_key  VARCHAR(200),
  ADD COLUMN IF NOT EXISTS toss_order_id     VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_point_charge_toss_payment_key
  ON point_charge_requests (toss_payment_key)
  WHERE toss_payment_key IS NOT NULL;


-- =================================================================
-- V25__team_leader_points.sql
-- =================================================================
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


-- =================================================================
-- V26__team_work_schedules.sql
-- =================================================================
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


-- =================================================================
-- V27__notification_chat_type.sql
-- =================================================================
-- V27: Add CHAT value to notification_type enum
-- Used for notifications when a new chat room is opened with the user

ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'CHAT';


-- =================================================================
-- V28__add_email_to_users.sql
-- =================================================================
-- V28: Add email column to users for admin password-based login
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE;

-- Index for email lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email) WHERE email IS NOT NULL;


-- =================================================================
-- V29__hiring_commissions_and_subsidies.sql
-- =================================================================
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

