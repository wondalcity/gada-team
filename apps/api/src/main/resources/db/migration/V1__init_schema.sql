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
