-- ================================================================
-- GADA Local Dev Seed Data  (Comprehensive)
-- Run: make seed  OR  docker exec -i gada-hiring-postgres psql -U gada -d gada_hiring < seed-local.sql
-- WARNING: Only run on local/dev databases!
-- ================================================================

-- ── 1. Clean existing dev seed data (correct FK order) ──────────

-- 1a. Status history first (depends on applications)
DELETE FROM application_status_history
WHERE application_id IN (
    SELECT a.id FROM applications a
    WHERE a.applicant_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%')
       OR a.team_id IN (SELECT t.id FROM teams t JOIN users u ON u.id = t.leader_id WHERE u.phone LIKE '+82-10-1%')
);

-- 1b. Contracts (depends on applications + users)
DELETE FROM contracts
WHERE worker_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%')
   OR employer_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-2%');

-- Also delete contracts referencing applications from these companies
DELETE FROM contracts
WHERE application_id IN (
    SELECT a.id FROM applications a
    JOIN jobs j ON j.id = a.job_id
    JOIN companies c ON c.id = j.company_id
    WHERE c.name IN ('(주)GADA건설','신흥건설(주)','한국건설개발(주)','동성이앤씨(주)','한양건설산업(주)','대경종합건설(주)')
);

-- 1c. Applications (depends on jobs, teams, users)
DELETE FROM applications
WHERE applicant_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%')
   OR team_id IN (SELECT t.id FROM teams t JOIN users u ON u.id = t.leader_id WHERE u.phone LIKE '+82-10-1%')
   OR job_id IN (SELECT j.id FROM jobs j JOIN companies c ON c.id = j.company_id
                 WHERE c.name IN ('(주)GADA건설','신흥건설(주)','한국건설개발(주)','동성이앤씨(주)','한양건설산업(주)','대경종합건설(주)'));

-- 1d. Scouts, notifications
DELETE FROM scouts
WHERE target_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%')
   OR sender_user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%');

DELETE FROM notifications
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%');

-- 1e. Team members, teams
DELETE FROM team_members
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%');

DELETE FROM teams
WHERE leader_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%');

-- 1f. Jobs, sites, employer profiles
DELETE FROM jobs
WHERE company_id IN (
    SELECT c.id FROM companies c
    WHERE c.name IN ('(주)GADA건설','신흥건설(주)','한국건설개발(주)','동성이앤씨(주)','한양건설산업(주)','대경종합건설(주)')
);

DELETE FROM sites
WHERE company_id IN (
    SELECT c.id FROM companies c
    WHERE c.name IN ('(주)GADA건설','신흥건설(주)','한국건설개발(주)','동성이앤씨(주)','한양건설산업(주)','대경종합건설(주)')
);

DELETE FROM employer_profiles
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-2%');

DELETE FROM companies
WHERE name IN ('(주)GADA건설','신흥건설(주)','한국건설개발(주)','동성이앤씨(주)','한양건설산업(주)','대경종합건설(주)');

-- 1g. Worker profiles, FAQs, SMS templates
DELETE FROM worker_profiles
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-9%');

DELETE FROM faqs WHERE category IN ('GENERAL','EMPLOYER','CONCRETE','REBAR','ELECTRICAL');
DELETE FROM sms_templates WHERE code IN ('ONBOARD','APPLICATION_APPLIED','APPLICATION_STATUS_CHANGED','SCOUT_OFFER',
    'BROADCAST_GENERAL','CONTRACT_SENT','CONTRACT_SIGNED','INTERVIEW_SCHEDULED','JOB_PUBLISHED',
    'TEAM_INVITE','HEALTH_CHECK_REMIND','WELCOME_EN','ONBOARD_VN','APPLICATION_HIRED','APPLICATION_REJECTED');

-- 1h. Audit logs (depends on users)
DELETE FROM audit_logs
WHERE actor_id IN (SELECT id FROM users WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%' OR phone LIKE '+84-%');

-- 1i. Users last
DELETE FROM users
WHERE phone LIKE '+82-10-1%' OR phone LIKE '+82-10-2%' OR phone LIKE '+82-10-9%'
   OR phone LIKE '+84-%';

-- Reset sequence to avoid conflicts with leftover rows
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 0));

-- ── 2. Users ──────────────────────────────────────────────────────
INSERT INTO users (phone, firebase_uid, role, status, admin_role) VALUES
-- Workers
    ('+82-10-1001-0001', 'dev-worker-1',       'WORKER',      'ACTIVE', NULL),
    ('+82-10-1002-0002', 'dev-worker-2',       'WORKER',      'ACTIVE', NULL),
    ('+82-10-1004-0004', 'dev-worker-4',       'WORKER',      'ACTIVE', NULL),
    ('+82-10-1005-0005', 'dev-worker-5',       'WORKER',      'ACTIVE', NULL),
    ('+82-10-1006-0006', 'dev-worker-6',       'WORKER',      'ACTIVE', NULL),
-- Team Leaders
    ('+82-10-1003-0003', 'dev-leader-3',       'TEAM_LEADER', 'ACTIVE', NULL),
    ('+82-10-1007-0007', 'dev-leader-7',       'TEAM_LEADER', 'ACTIVE', NULL),
-- Employers
    ('+82-10-2001-0001', 'dev-employer-1',     'EMPLOYER',    'ACTIVE', NULL),
    ('+82-10-2002-0002', 'dev-employer-2',     'EMPLOYER',    'ACTIVE', NULL),
    ('+82-10-2003-0003', 'dev-employer-3',     'EMPLOYER',    'ACTIVE', NULL),
-- Admin
    ('+82-10-9001-0001', 'dev-admin-1',        'ADMIN',       'ACTIVE', 'SUPER_ADMIN')
ON CONFLICT (phone) DO UPDATE SET
    firebase_uid = EXCLUDED.firebase_uid,
    role         = EXCLUDED.role,
    status       = EXCLUDED.status,
    admin_role   = EXCLUDED.admin_role;

-- ── 3. Worker Profiles ─────────────────────────────────────────────

-- 김철수 (KR, 콘크리트/철근 전문, 건강검진 완료)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, '김철수', '1990-05-15', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"},{"code":"en","level":"BASIC"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('CONCRETE', 'REBAR')),
    180000, 250000, 'DAILY',
    '["SAFETY_HARNESS"]'::jsonb,
    '[{"code":"CONSTRUCTION_SAFETY","name":"건설안전기능사","issueDate":"2022-03-01"},{"code":"CONCRETE_CRAFTSMAN","name":"콘크리트기능사","issueDate":"2021-06-15"}]'::jsonb,
    '[{"title":"강남 오피스텔 콘크리트 타설","startDate":"2024-01-01","endDate":"2024-06-30","description":"지하 2층~지상 28층 콘크리트 타설 작업"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1001-0001'
ON CONFLICT (user_id) DO NOTHING;

-- Nguyen Van A (VN, E9, 콘크리트/일반, 건강검진 미완료)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, 'Nguyen Van A', '1995-08-22', 'VN', 'E9', 'NOT_DONE',
    '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('CONCRETE', 'GENERAL')),
    150000, 200000, 'DAILY',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1002-0002'
ON CONFLICT (user_id) DO NOTHING;

-- 박팀장 (KR, 콘크리트/거푸집/철근 전문, 팀장)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, '박팀장', '1985-03-10', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('CONCRETE', 'FORM', 'REBAR')),
    250000, 350000, 'DAILY',
    '["SAFETY_HARNESS","HARD_HAT","CONCRETE_PUMP"]'::jsonb,
    '[{"code":"CONSTRUCTION_SAFETY","name":"건설안전기능사"},{"code":"CONCRETE_CRAFTSMAN","name":"콘크리트기능사"},{"code":"FORM_CRAFTSMAN","name":"거푸집기능사"}]'::jsonb,
    '[{"title":"판교 테크노밸리 2단계","startDate":"2023-03-01","endDate":"2023-12-31","description":"지상 15층 오피스 콘크리트/거푸집 팀장 역할"},{"title":"잠실 주상복합 현장","startDate":"2022-01-01","endDate":"2022-12-31","description":"팀 인원 7명 관리"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1003-0003'
ON CONFLICT (user_id) DO NOTHING;

-- 이민호 (KR, 철근 전문, 자격증 다수)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, '이민호', '1988-11-20', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('REBAR', 'CONCRETE')),
    200000, 280000, 'DAILY',
    '["SAFETY_HARNESS","REBAR_BENDER"]'::jsonb,
    '[{"code":"REBAR_CRAFTSMAN","name":"철근기능사","issueDate":"2019-09-01"},{"code":"CONSTRUCTION_SAFETY","name":"건설안전기능사","issueDate":"2020-03-15"}]'::jsonb,
    '[{"title":"마포 복합문화공간 철근작업","startDate":"2025-01-01","endDate":"2025-06-30","description":"지상 20층 철근 배근 총괄"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1004-0004'
ON CONFLICT (user_id) DO NOTHING;

-- Tran Thi B (VN, E9, 타일/미장)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, 'Tran Thi B', '1997-04-10', 'VN', 'E9', 'SCHEDULED',
    '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('TILE', 'PAINTING')),
    130000, 180000, 'DAILY',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1005-0005'
ON CONFLICT (user_id) DO NOTHING;

-- 정수진 (KR, 전기 전문, 팀장)
INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type, health_check_status,
    languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit,
    equipment, certifications, portfolio
)
SELECT u.id, '정수진', '1983-07-25', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('ELECTRICAL', 'PLUMBING')),
    280000, 380000, 'DAILY',
    '["SAFETY_HARNESS","ELECTRICAL_TESTER"]'::jsonb,
    '[{"code":"ELECTRICAL_CRAFTSMAN","name":"전기기능사","issueDate":"2010-07-01"},{"code":"CONSTRUCTION_SAFETY","name":"건설안전기능사"}]'::jsonb,
    '[{"title":"용인 물류센터 전기공사","startDate":"2024-06-01","endDate":"2024-12-31","description":"3만평 물류센터 전기배선 팀장 역할"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1007-0007'
ON CONFLICT (user_id) DO NOTHING;

-- ── 4. Companies ──────────────────────────────────────────────────

INSERT INTO companies (name, business_registration_number, ceo_name, phone, status, verified_at, address, description)
VALUES
    ('(주)GADA건설',    '123-45-67890', '이사장', '02-1234-5678', 'ACTIVE', NOW(),  '서울특별시 강남구 테헤란로 123', '국내 최고 수준의 건설 전문 기업. 주거/상업/물류 현장 전문.'),
    ('신흥건설(주)',    '234-56-78901', '김부장', '02-9876-5432', 'ACTIVE', NOW(),  '서울특별시 마포구 합정동 456', '서울 서부권 특화 건설사. 주거/오피스 복합 개발.'),
    ('한국건설개발(주)','345-67-89012', '최대표', '031-111-2222', 'PENDING', NULL,  '경기도 수원시 영통구 789',   '수도권 중소형 현장 전문 건설사. 빠른 성장 중.');

-- ── 5. Employer Profiles ──────────────────────────────────────────

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '이사장', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2001-0001' AND c.name = '(주)GADA건설'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '김부장', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2002-0002' AND c.name = '신흥건설(주)'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '최대표', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2003-0003' AND c.name = '한국건설개발(주)'
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ── 6. Sites ──────────────────────────────────────────────────────

-- GADA건설 현장 3개
INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '강남 신축 아파트 현장', '서울특별시 강남구 삼성동 100-1', '서울특별시', '강남구', 37.5114, 127.0609, 'ACTIVE'
FROM companies c WHERE c.name = '(주)GADA건설';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '분당 오피스텔 현장', '경기도 성남시 분당구 정자동 200', '경기도', '성남시', 37.3595, 127.1087, 'ACTIVE'
FROM companies c WHERE c.name = '(주)GADA건설';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '잠실 주상복합 현장', '서울특별시 송파구 잠실동 50', '서울특별시', '송파구', 37.5133, 127.0999, 'PLANNING'
FROM companies c WHERE c.name = '(주)GADA건설';

-- 신흥건설 현장 2개
INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '마포 복합문화공간 현장', '서울특별시 마포구 합정동 320', '서울특별시', '마포구', 37.5498, 126.9097, 'ACTIVE'
FROM companies c WHERE c.name = '신흥건설(주)';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '용인 물류센터 현장', '경기도 용인시 처인구 양지면 123', '경기도', '용인시', 37.2378, 127.2031, 'ACTIVE'
FROM companies c WHERE c.name = '신흥건설(주)';

-- ── 7. Jobs ───────────────────────────────────────────────────────

-- Job 1: GADA 강남 콘크리트 (PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date, end_date,
    visa_requirements, application_types, health_check_required,
    accommodation_provided, meal_provided, transportation_provided)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'CONCRETE'),
    '강남 신축 아파트 콘크리트공 모집',
    'PUBLISHED',
    '강남구 신축 아파트 현장 콘크리트 타설 작업입니다. 경력 2년 이상 우대. 일당 20~24만원, 숙식 제공 없음. 안전화 필참.',
    200000, 240000, 'DAILY', 5,
    CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '90 days',
    '["CITIZEN","H2","E9","F4","F5"]'::jsonb,
    '["INDIVIDUAL","TEAM"]'::jsonb,
    FALSE, FALSE, TRUE, FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%강남%';

-- Job 2: GADA 분당 철근 (PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required,
    accommodation_provided, meal_provided)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'REBAR'),
    '분당 오피스텔 철근공 구인',
    'PUBLISHED',
    '분당 오피스텔 신축 현장 철근 배근 작업. 무경력 지원 가능. 점심 제공.',
    180000, 220000, 'DAILY', 3,
    CURRENT_DATE + INTERVAL '14 days',
    '["CITIZEN","H2","E9","F4","F5","F6"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    FALSE, FALSE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%분당%';

-- Job 3: GADA 강남 거푸집 (PAUSED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'FORM'),
    '강남 아파트 거푸집공 구인 (일시정지)',
    'PAUSED',
    '강남 현장 거푸집 설치/해체 작업. 현재 모집 일시 중단.',
    190000, 230000, 'DAILY', 4,
    '["CITIZEN","H2","F4","F5"]'::jsonb,
    '["INDIVIDUAL","TEAM"]'::jsonb,
    TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%강남%';

-- Job 4: GADA 방수 (CLOSED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'WATERPROOF'),
    '분당 방수공 모집 (마감)',
    'CLOSED',
    '분당 오피스텔 지하 방수공사 완료 모집 종료.',
    170000, 200000, 'DAILY', 2,
    '["CITIZEN","H2"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%분당%';

-- Job 5: 신흥 마포 전기 (PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required,
    accommodation_provided, meal_provided, transportation_provided)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'ELECTRICAL'),
    '마포 복합문화공간 전기공 모집',
    'PUBLISHED',
    '마포 복합문화공간 신축 현장 전기배선 작업. 전기기능사 자격증 우대. 교통비 지원.',
    260000, 320000, 'DAILY', 6,
    CURRENT_DATE + INTERVAL '5 days',
    '["CITIZEN","F4","F5"]'::jsonb,
    '["INDIVIDUAL","TEAM"]'::jsonb,
    TRUE, FALSE, FALSE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%마포%';

-- Job 6: 신흥 마포 미장 (PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'MASONRY'),
    '마포 복합문화공간 미장공 구인',
    'PUBLISHED',
    '마포 복합문화공간 내장 미장 작업. 외국인 근로자 환영.',
    160000, 200000, 'DAILY', 8,
    CURRENT_DATE + INTERVAL '10 days',
    '["CITIZEN","H2","E9","F4","F5","F6"]'::jsonb,
    '["INDIVIDUAL","TEAM","COMPANY"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%마포%';

-- Job 7: 신흥 용인 크레인 (PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date, always_open,
    visa_requirements, application_types, health_check_required,
    accommodation_provided, meal_provided)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'CRANE'),
    '용인 물류센터 크레인 기사 모집',
    'PUBLISHED',
    '용인 물류센터 신축 현장 타워크레인 운전. 자격증 필수. 숙식 제공.',
    350000, 450000, 'DAILY', 2,
    CURRENT_DATE + INTERVAL '3 days', TRUE,
    '["CITIZEN","F4","F5"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    TRUE, TRUE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%용인%';

-- Job 8: 신흥 용인 타일 (DRAFT)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'TILE'),
    '용인 물류센터 타일공 모집 (작성중)',
    'DRAFT',
    '용인 물류센터 내부 타일 작업 예정. 공고 작성 중.',
    150000, 190000, 'DAILY', 5,
    '["CITIZEN","H2","E9"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%용인%';

-- ── 8. Teams ──────────────────────────────────────────────────────

-- Team 1: 박팀장 콘크리트팀 (with 2 members: 박팀장 + 김철수)
INSERT INTO teams (leader_id, name, team_type, status, intro_short, intro_long, member_count,
    is_nationwide, regions, equipment, desired_pay_min, desired_pay_max, desired_pay_unit, headcount_target)
SELECT u.id, '박팀장 콘크리트팀', 'SQUAD', 'ACTIVE',
    '콘크리트 전문 팀. 수도권 중심 활동. 숙련 인원 구성.',
    '2018년부터 활동한 콘크리트 전문 팀입니다. 팀장 포함 현재 2명이며 3-4명 규모로 운영합니다. 강남/분당/판교 위주 현장 경험 풍부. 안전 최우선.',
    2, FALSE,
    '[{"sido":"서울특별시","sigungu":"강남구"},{"sido":"경기도","sigungu":"성남시"},{"sido":"경기도","sigungu":"수원시"}]'::jsonb,
    '["SAFETY_HARNESS","CONCRETE_PUMP","HARD_HAT"]'::jsonb,
    200000, 320000, 'DAILY', 4
FROM users u WHERE u.phone = '+82-10-1003-0003';

INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status,
    full_name, birth_date, invitation_status, joined_at)
SELECT t.id, u.id, 'LEADER', 'KR', 'CITIZEN', 'COMPLETED', '박팀장', '1985-03-10', 'ACCEPTED', NOW() - INTERVAL '2 years'
FROM teams t JOIN users u ON u.phone = '+82-10-1003-0003'
WHERE t.name = '박팀장 콘크리트팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status,
    full_name, birth_date, invitation_status, joined_at)
SELECT t.id, u.id, 'MEMBER', 'KR', 'CITIZEN', 'COMPLETED', '김철수', '1990-05-15', 'ACCEPTED', NOW() - INTERVAL '6 months'
FROM teams t JOIN users u ON u.phone = '+82-10-1001-0001'
WHERE t.name = '박팀장 콘크리트팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Team 2: 정팀장 전기팀 (단독)
INSERT INTO teams (leader_id, name, team_type, status, intro_short, intro_long, member_count,
    is_nationwide, regions, equipment, desired_pay_min, desired_pay_max, desired_pay_unit, headcount_target)
SELECT u.id, '정팀장 전기팀', 'SQUAD', 'ACTIVE',
    '15년 경력 전기 전문 팀. 서울 전 지역 활동 가능.',
    '2010년부터 전기 전문으로 활동해온 팀입니다. 전기기능사 보유 인원으로 구성되어 있으며 대형 물류센터, 복합문화공간 경험 다수. 현재 팀원 추가 모집 중.',
    1, FALSE,
    '[{"sido":"서울특별시","sigungu":""},{"sido":"경기도","sigungu":"용인시"}]'::jsonb,
    '["SAFETY_HARNESS","ELECTRICAL_TESTER","LADDER"]'::jsonb,
    250000, 380000, 'DAILY', 3
FROM users u WHERE u.phone = '+82-10-1007-0007';

INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status,
    full_name, birth_date, invitation_status, joined_at)
SELECT t.id, u.id, 'LEADER', 'KR', 'CITIZEN', 'COMPLETED', '정수진', '1983-07-25', 'ACCEPTED', NOW() - INTERVAL '1 year'
FROM teams t JOIN users u ON u.phone = '+82-10-1007-0007'
WHERE t.name = '정팀장 전기팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ── 9. Applications ───────────────────────────────────────────────

-- Application 1: 김철수 → 강남 콘크리트 (SHORTLISTED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, is_verified, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'SHORTLISTED',
    '콘크리트 경력 8년입니다. 강남 지역 현장 경험 다수 보유. 성실하게 임하겠습니다.',
    '{"fullName":"김철수","birthDate":"1990-05-15","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","languages":[{"code":"ko","level":"NATIVE"}],"certifications":[{"code":"CONCRETE_CRAFTSMAN","name":"콘크리트기능사"}],"desiredPayMin":180000,"desiredPayMax":250000,"desiredPayUnit":"DAILY"}'::jsonb,
    TRUE, NOW() - INTERVAL '3 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1001-0001'
WHERE j.title LIKE '%강남%콘크리트%';

-- Application 2: 김철수 → 분당 철근 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '철근 작업도 가능합니다. 열심히 하겠습니다.',
    '{"fullName":"김철수","birthDate":"1990-05-15","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","languages":[{"code":"ko","level":"NATIVE"}],"certifications":[],"desiredPayMin":180000,"desiredPayMax":250000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '1 day'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1001-0001'
WHERE j.title LIKE '%분당%철근%';

-- Application 3: Nguyen Van A → 강남 콘크리트 (UNDER_REVIEW)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'UNDER_REVIEW',
    '콘크리트 경력 3년. 성실히 일하겠습니다.',
    '{"fullName":"Nguyen Van A","birthDate":"1995-08-22","nationality":"VN","visaType":"E9","healthCheckStatus":"NOT_DONE","languages":[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}],"certifications":[],"desiredPayMin":150000,"desiredPayMax":200000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '5 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1002-0002'
WHERE j.title LIKE '%강남%콘크리트%';

-- Application 4: Nguyen Van A → 마포 미장 (REJECTED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'REJECTED',
    '열심히 하겠습니다.',
    '{"fullName":"Nguyen Van A","birthDate":"1995-08-22","nationality":"VN","visaType":"E9","healthCheckStatus":"NOT_DONE","languages":[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}],"certifications":[],"desiredPayMin":150000,"desiredPayMax":200000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '10 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1002-0002'
WHERE j.title LIKE '%마포%미장%';

-- Application 5: 이민호 → 분당 철근 (HIRED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, is_verified, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'HIRED',
    '철근기능사 자격증 보유. 경력 10년 이상입니다.',
    '{"fullName":"이민호","birthDate":"1988-11-20","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","languages":[{"code":"ko","level":"NATIVE"}],"certifications":[{"code":"REBAR_CRAFTSMAN","name":"철근기능사"}],"desiredPayMin":200000,"desiredPayMax":280000,"desiredPayUnit":"DAILY"}'::jsonb,
    TRUE, NOW() - INTERVAL '20 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1004-0004'
WHERE j.title LIKE '%분당%철근%';

-- Application 6: 이민호 → 마포 전기 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '철근 외 전기보조 작업 가능합니다.',
    '{"fullName":"이민호","birthDate":"1988-11-20","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","languages":[{"code":"ko","level":"NATIVE"}],"certifications":[{"code":"REBAR_CRAFTSMAN","name":"철근기능사"}],"desiredPayMin":200000,"desiredPayMax":280000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1004-0004'
WHERE j.title LIKE '%마포%전기%';

-- Application 7: Tran Thi B → 마포 미장 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter,
    worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '미장 경력 2년 있습니다.',
    '{"fullName":"Tran Thi B","birthDate":"1997-04-10","nationality":"VN","visaType":"E9","healthCheckStatus":"SCHEDULED","languages":[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}],"certifications":[],"desiredPayMin":130000,"desiredPayMax":180000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '1 day'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN users u ON u.phone = '+82-10-1005-0005'
WHERE j.title LIKE '%마포%미장%';

-- Application 8: 박팀장 팀 → 강남 콘크리트 (INTERVIEW_PENDING, TEAM type)
INSERT INTO applications (job_id, application_type, team_id, status, cover_letter,
    worker_snapshot, team_snapshot, status_updated_at)
SELECT j.id, 'TEAM', t.id, 'INTERVIEW_PENDING',
    '팀 지원입니다. 콘크리트 전문 2인 팀. 즉시 투입 가능합니다.',
    '{"fullName":"박팀장","birthDate":"1985-03-10","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","languages":[{"code":"ko","level":"NATIVE"}],"certifications":[{"code":"CONCRETE_CRAFTSMAN","name":"콘크리트기능사"}],"desiredPayMin":250000,"desiredPayMax":350000,"desiredPayUnit":"DAILY"}'::jsonb,
    '{"name":"박팀장 콘크리트팀","type":"SQUAD","memberCount":2,"desiredPayMin":200000,"desiredPayMax":320000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '4 days'
FROM jobs j JOIN companies c ON c.id = j.company_id
     JOIN teams t ON t.name = '박팀장 콘크리트팀'
WHERE j.title LIKE '%강남%콘크리트%';

-- Update application_count on jobs
UPDATE jobs SET application_count = (
    SELECT COUNT(*) FROM applications a WHERE a.job_id = jobs.id AND a.deleted_at IS NULL
);

-- ── 10. Application Status History ────────────────────────────────

-- 김철수 강남 콘크리트: APPLIED → SHORTLISTED
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'SHORTLISTED',
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '서류 통과. 면접 대상자 선정.', NOW() - INTERVAL '3 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1001-0001' AND j.title LIKE '%강남%콘크리트%';

-- Nguyen Van A 강남 콘크리트: APPLIED → UNDER_REVIEW
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'UNDER_REVIEW',
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '검토 중.', NOW() - INTERVAL '5 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1002-0002' AND j.title LIKE '%강남%콘크리트%';

-- Nguyen Van A 마포 미장: APPLIED → REJECTED
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'REJECTED',
    (SELECT id FROM users WHERE phone = '+82-10-2002-0002'),
    '건강검진 미완료로 불합격.', NOW() - INTERVAL '10 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1002-0002' AND j.title LIKE '%마포%미장%';

-- 이민호 분당 철근: APPLIED → UNDER_REVIEW → SHORTLISTED → HIRED
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'UNDER_REVIEW', (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '서류 접수 완료.', NOW() - INTERVAL '25 days'
FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1004-0004' AND j.title LIKE '%분당%철근%';

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'UNDER_REVIEW', 'SHORTLISTED', (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '전화 인터뷰 통과.', NOW() - INTERVAL '22 days'
FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1004-0004' AND j.title LIKE '%분당%철근%';

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'SHORTLISTED', 'HIRED', (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '최종 합격. 4월 8일 출근.', NOW() - INTERVAL '20 days'
FROM applications a JOIN jobs j ON j.id = a.job_id JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1004-0004' AND j.title LIKE '%분당%철근%';

-- 팀 지원: APPLIED → INTERVIEW_PENDING
INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'INTERVIEW_PENDING', (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '팀 인터뷰 예정. 현장 방문 요청.', NOW() - INTERVAL '4 days'
FROM applications a JOIN jobs j ON j.id = a.job_id JOIN teams t ON t.id = a.team_id
WHERE t.name = '박팀장 콘크리트팀' AND j.title LIKE '%강남%콘크리트%';

-- ── 11. Contracts ─────────────────────────────────────────────────

-- Contract 1: 이민호 - 분당 철근 (SIGNED)
INSERT INTO contracts (application_id, job_id, employer_user_id, worker_user_id,
    status, start_date, end_date, pay_amount, pay_unit, terms,
    sent_at, employer_signed_at, worker_signed_at)
SELECT a.id, j.id,
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    (SELECT id FROM users WHERE phone = '+82-10-1004-0004'),
    'SIGNED',
    CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '97 days',
    210000, 'DAILY',
    '1. 작업: 철근 배근 및 결속 작업
2. 근무시간: 오전 7시 ~ 오후 5시 (1시간 휴식)
3. 급여: 일당 21만원 (매월 10일 지급)
4. 안전장비: 갑(고용주) 제공
5. 계약기간 중 무단이탈 시 손해배상 책임.',
    NOW() - INTERVAL '18 days', NOW() - INTERVAL '17 days', NOW() - INTERVAL '16 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1004-0004' AND j.title LIKE '%분당%철근%';

-- Contract 2: 김철수 - 강남 콘크리트 (SENT)
INSERT INTO contracts (application_id, job_id, employer_user_id, worker_user_id,
    status, start_date, end_date, pay_amount, pay_unit, terms, sent_at)
SELECT a.id, j.id,
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    (SELECT id FROM users WHERE phone = '+82-10-1001-0001'),
    'SENT',
    CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '104 days',
    220000, 'DAILY',
    '1. 작업: 콘크리트 타설 작업
2. 근무시간: 오전 7시 ~ 오후 5시
3. 급여: 일당 22만원
4. 안전장비: 갑 제공
5. 점심 제공.',
    NOW() - INTERVAL '1 day'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1001-0001' AND j.title LIKE '%강남%콘크리트%';

-- ── 12. Notifications ─────────────────────────────────────────────

-- 김철수 알림 (4개)
INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '지원서가 검토 중입니다', '강남 신축 아파트 콘크리트공 지원서가 검토 중입니다.',
    '{"jobTitle":"강남 신축 아파트 콘크리트공 모집","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
FROM users u WHERE u.phone = '+82-10-1001-0001';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '서류 합격! 최종 검토 중', '강남 콘크리트공 지원서가 최종 검토 단계입니다.',
    '{"jobTitle":"강남 신축 아파트 콘크리트공 모집","status":"SHORTLISTED","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
FROM users u WHERE u.phone = '+82-10-1001-0001';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', '계약서가 발송되었습니다', '강남 신축 아파트 현장 계약서를 확인해주세요.',
    '{"action":"VIEW_CONTRACT"}'::jsonb,
    FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
FROM users u WHERE u.phone = '+82-10-1001-0001';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'MARKETING', 'GADA 서비스 이용 안내', '더 많은 공고를 확인하고 빠르게 지원하세요!',
    '{"action":"BROWSE_JOBS"}'::jsonb,
    TRUE, NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
FROM users u WHERE u.phone = '+82-10-1001-0001';

-- Nguyen Van A 알림 (3개)
INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '지원서가 접수되었습니다', '강남 신축 아파트 콘크리트공 지원이 완료되었습니다.',
    '{"jobTitle":"강남 신축 아파트 콘크리트공 모집","action":"VIEW_APPLICATION"}'::jsonb,
    TRUE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
FROM users u WHERE u.phone = '+82-10-1002-0002';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '지원이 불합격되었습니다', '마포 복합문화공간 미장공 지원이 불합격 처리되었습니다.',
    '{"jobTitle":"마포 복합문화공간 미장공 구인","status":"REJECTED","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
FROM users u WHERE u.phone = '+82-10-1002-0002';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', '건강검진을 예약하세요', '건강검진을 완료하면 더 많은 공고에 지원할 수 있습니다.',
    '{"action":"HEALTH_CHECK"}'::jsonb,
    FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
FROM users u WHERE u.phone = '+82-10-1002-0002';

-- 이민호 알림 (3개)
INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '최종 합격되었습니다!', '분당 오피스텔 철근공 지원서가 최종 합격되었습니다.',
    '{"jobTitle":"분당 오피스텔 철근공 구인","status":"HIRED","action":"VIEW_APPLICATION"}'::jsonb,
    TRUE, NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days'
FROM users u WHERE u.phone = '+82-10-1004-0004';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', '계약서를 확인해주세요', '분당 오피스텔 현장 계약서가 서명 완료되었습니다.',
    '{"action":"VIEW_CONTRACT"}'::jsonb,
    TRUE, NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days'
FROM users u WHERE u.phone = '+82-10-1004-0004';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SCOUT', '스카우트 제안이 도착했습니다', '신흥건설에서 마포 전기공 포지션을 제안했습니다.',
    '{"companyName":"신흥건설(주)","jobTitle":"마포 복합문화공간 전기공 모집","action":"VIEW_SCOUT"}'::jsonb,
    FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
FROM users u WHERE u.phone = '+82-10-1004-0004';

-- ── 13. SMS Templates ─────────────────────────────────────────────

INSERT INTO sms_templates (code, name, locale, content, variables, is_active) VALUES
(
    'ONBOARD', '신규 가입 환영',  'ko',
    '안녕하세요 {name}님! GADA에 가입하신 것을 환영합니다. 지금 바로 건설 현장 공고를 확인해보세요.',
    '["name"]'::jsonb, TRUE
),
(
    'APPLICATION_APPLIED', '지원 완료 알림', 'ko',
    '{name}님, {jobTitle} 공고에 지원이 완료되었습니다. 결과는 빠른 시일 내 안내드리겠습니다.',
    '["name","jobTitle"]'::jsonb, TRUE
),
(
    'APPLICATION_STATUS_CHANGED', '지원 상태 변경', 'ko',
    '{name}님, {jobTitle} 지원 상태가 [{status}]로 변경되었습니다. GADA 앱에서 자세한 내용을 확인하세요.',
    '["name","jobTitle","status"]'::jsonb, TRUE
),
(
    'SCOUT_OFFER', '스카우트 제안', 'ko',
    '{name}님께 {companyName}에서 스카우트 제안이 도착했습니다. {jobTitle} 포지션입니다. GADA 앱에서 확인하세요.',
    '["name","companyName","jobTitle"]'::jsonb, TRUE
),
(
    'BROADCAST_GENERAL', '공지 발송', 'ko',
    '[GADA 공지] {message}',
    '["message"]'::jsonb, TRUE
)
ON CONFLICT (code, locale) DO UPDATE SET
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    variables = EXCLUDED.variables,
    is_active = EXCLUDED.is_active;

-- ── 14. FAQs ─────────────────────────────────────────────────────

INSERT INTO faqs (category, locale, question, answer, sort_order, is_published) VALUES
(
    'GENERAL', 'ko',
    'GADA는 어떤 서비스인가요?',
    'GADA는 건설 근로자와 고용주를 연결하는 플랫폼입니다. 콘크리트, 철근, 전기, 타일 등 다양한 직종의 건설 현장 공고를 확인하고 지원할 수 있습니다.',
    1, TRUE
),
(
    'GENERAL', 'ko',
    '외국인 근로자도 지원할 수 있나요?',
    '네, E9/H2/F4/F5 등 다양한 비자를 보유한 외국인 근로자도 지원 가능합니다. 단, 각 공고마다 비자 요건이 다를 수 있으니 확인 후 지원하세요.',
    2, TRUE
),
(
    'GENERAL', 'ko',
    '지원 후 얼마나 걸려서 결과를 알 수 있나요?',
    '고용주에 따라 다르지만, 보통 3~5 영업일 내에 검토 결과를 안내드립니다. 앱 알림을 켜두시면 빠르게 확인할 수 있습니다.',
    3, TRUE
),
(
    'GENERAL', 'ko',
    '건강검진은 왜 필요한가요?',
    '일부 현장은 안전 및 법적 요건으로 건강검진 결과를 요구합니다. 건강검진을 완료하면 더 많은 공고에 지원할 수 있습니다.',
    4, TRUE
),
(
    'GENERAL', 'ko',
    '팀으로 지원할 수 있나요?',
    '네, 팀을 구성하면 팀 단위로 공고에 지원할 수 있습니다. 팀 지원이 가능한 공고는 공고 상세에서 확인할 수 있습니다.',
    5, TRUE
),
(
    'CONCRETE', 'ko',
    '콘크리트공으로 취업하려면 자격증이 필요한가요?',
    '자격증이 없어도 지원 가능한 현장이 많습니다. 다만 콘크리트기능사 자격증을 보유하면 우대를 받을 수 있으며 일당도 높아집니다.',
    1, TRUE
),
(
    'REBAR', 'ko',
    '철근 작업 초보자도 지원 가능한가요?',
    '네, 무경력 지원을 허용하는 현장도 있습니다. 초보자는 철근기능사 자격 취득을 목표로 하시면 취업 기회가 더 넓어집니다.',
    1, TRUE
)
;

-- ── 15. Job Intro Contents ────────────────────────────────────────

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body,
    work_characteristics, related_skills, pricing_notes, is_published)
SELECT
    (SELECT id FROM job_categories WHERE code = 'CONCRETE'),
    'ko',
    '콘크리트공이란?',
    '건설 현장의 뼈대를 만드는 핵심 직종',
    '콘크리트공은 건축물의 기초, 기둥, 보, 슬래브 등을 만들기 위해 콘크리트를 타설하고 마감하는 전문 직종입니다. 건설 현장에서 가장 수요가 높은 직종 중 하나로, 숙련도에 따라 높은 일당을 기대할 수 있습니다.',
    '[{"title":"콘크리트 타설","description":"펌프카를 이용해 거푸집 내에 콘크리트를 채우는 작업"},{"title":"콘크리트 마감","description":"타설 후 표면을 고르고 양생하는 작업"},{"title":"품질 관리","description":"슬럼프 테스트 등 품질 확인 작업"}]'::jsonb,
    '[{"name":"콘크리트기능사","level":"우대"},{"name":"건설안전기능사","level":"권장"},{"name":"콘크리트펌프기사","level":"가산점"}]'::jsonb,
    '[{"type":"DAILY","minAmount":180000,"maxAmount":280000,"note":"숙련도에 따라 차등 적용"}]'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM job_intro_contents jic
    JOIN job_categories jcat ON jcat.id = jic.category_id
    WHERE jcat.code = 'CONCRETE' AND jic.locale = 'ko'
);

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body,
    work_characteristics, related_skills, pricing_notes, is_published)
SELECT
    (SELECT id FROM job_categories WHERE code = 'REBAR'),
    'ko',
    '철근공이란?',
    '철근 배근으로 건물 구조를 책임지는 전문가',
    '철근공은 건축물 내 콘크리트 구조체를 보강하기 위해 철근을 배치하고 결속하는 전문 직종입니다. 구조 안전에 직접 영향을 미치는 중요한 역할로, 경력과 자격증에 따라 높은 보수를 받을 수 있습니다.',
    '[{"title":"철근 배근","description":"설계도에 따라 철근을 배치하는 작업"},{"title":"철근 결속","description":"결속선으로 철근을 묶는 작업"},{"title":"스페이서 설치","description":"피복 두께 확보를 위한 스페이서 설치"}]'::jsonb,
    '[{"name":"철근기능사","level":"우대"},{"name":"건설안전기능사","level":"권장"}]'::jsonb,
    '[{"type":"DAILY","minAmount":170000,"maxAmount":260000,"note":"자격증 보유 시 우대"}]'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM job_intro_contents jic
    JOIN job_categories jcat ON jcat.id = jic.category_id
    WHERE jcat.code = 'REBAR' AND jic.locale = 'ko'
);

INSERT INTO job_intro_contents (category_id, locale, title, subtitle, body,
    work_characteristics, related_skills, pricing_notes, is_published)
SELECT
    (SELECT id FROM job_categories WHERE code = 'ELECTRICAL'),
    'ko',
    '전기공이란?',
    '건물의 신경망을 책임지는 전기 전문가',
    '전기공은 건설 현장에서 전기 배선, 조명, 배전반 설치 등을 담당하는 전문 직종입니다. 법적 자격 요건이 있어 진입 장벽이 있지만, 그만큼 높은 급여와 안정적인 수요를 자랑합니다.',
    '[{"title":"전기 배선","description":"건물 내 전기 배선 작업"},{"title":"조명 설치","description":"각종 조명기구 설치 작업"},{"title":"배전반 작업","description":"배전반 조립 및 연결 작업"}]'::jsonb,
    '[{"name":"전기기능사","level":"필수"},{"name":"전기산업기사","level":"우대"},{"name":"건설안전기능사","level":"권장"}]'::jsonb,
    '[{"type":"DAILY","minAmount":250000,"maxAmount":400000,"note":"자격증 등급에 따라 차등"}]'::jsonb,
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM job_intro_contents jic
    JOIN job_categories jcat ON jcat.id = jic.category_id
    WHERE jcat.code = 'ELECTRICAL' AND jic.locale = 'ko'
);

-- ================================================================
-- PHASE 2 — Expanded dummy data for fully populated admin pages
-- ================================================================

-- ── A. Additional Users ──────────────────────────────────────────

INSERT INTO users (phone, firebase_uid, role, status, admin_role) VALUES
-- More Workers
    ('+82-10-1008-0008', 'dev-worker-8',   'WORKER',      'ACTIVE',    NULL),
    ('+82-10-1009-0009', 'dev-worker-9',   'WORKER',      'ACTIVE',    NULL),
    ('+82-10-1010-0010', 'dev-worker-10',  'WORKER',      'ACTIVE',    NULL),
    ('+82-10-1011-0011', 'dev-worker-11',  'WORKER',      'ACTIVE',    NULL),
    ('+82-10-1012-0012', 'dev-worker-12',  'WORKER',      'PENDING',   NULL),
    ('+82-10-1013-0013', 'dev-worker-13',  'WORKER',      'SUSPENDED', NULL),
    ('+82-10-1014-0014', 'dev-worker-14',  'WORKER',      'ACTIVE',    NULL),
    ('+82-10-1015-0015', 'dev-worker-15',  'WORKER',      'ACTIVE',    NULL),
-- More Team Leaders
    ('+82-10-1016-0016', 'dev-leader-16',  'TEAM_LEADER', 'ACTIVE',    NULL),
    ('+82-10-1017-0017', 'dev-leader-17',  'TEAM_LEADER', 'ACTIVE',    NULL),
-- More Employers
    ('+82-10-2004-0004', 'dev-employer-4', 'EMPLOYER',    'ACTIVE',    NULL),
    ('+82-10-2005-0005', 'dev-employer-5', 'EMPLOYER',    'ACTIVE',    NULL),
    ('+82-10-2006-0006', 'dev-employer-6', 'EMPLOYER',    'PENDING',   NULL)
ON CONFLICT (phone) DO UPDATE SET
    firebase_uid = EXCLUDED.firebase_uid,
    role         = EXCLUDED.role,
    status       = EXCLUDED.status;

-- ── B. Additional Worker Profiles ────────────────────────────────

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '홍길동', '1992-02-14', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('WATERPROOF','PAINTING')),
    140000, 200000, 'DAILY',
    '["SAFETY_HARNESS"]'::jsonb,
    '[{"code":"WATERPROOF_CRAFTSMAN","name":"방수기능사","issueDate":"2020-05-01"}]'::jsonb,
    '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1008-0008'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, 'Le Van C', '1993-11-30', 'VN', 'E9', 'COMPLETED',
    '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('TILE','MASONRY')),
    150000, 210000, 'DAILY',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1009-0009'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '최성훈', '1987-06-05', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('CRANE','EQUIPMENT')),
    350000, 480000, 'DAILY',
    '["CRANE_OPERATOR_LICENSE"]'::jsonb,
    '[{"code":"CRANE_OPERATOR","name":"타워크레인운전기능사","issueDate":"2015-08-01"},{"code":"HEAVY_EQUIPMENT","name":"굴착기운전기능사","issueDate":"2016-03-01"}]'::jsonb,
    '[{"title":"판교 알파돔 타워크레인 운전","startDate":"2024-03-01","endDate":"2024-12-31","description":"지상 32층 오피스 타워 타워크레인 운전"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1010-0010'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, 'Pham Van D', '1998-03-20', 'VN', 'E9', 'NOT_DONE',
    '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('GENERAL','MASONRY')),
    130000, 170000, 'DAILY',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1011-0011'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '강병철', '1991-09-18', 'KR', 'CITIZEN', 'SCHEDULED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('PLUMBING','HVAC')),
    180000, 260000, 'DAILY',
    '["PIPE_WRENCH","SAFETY_HARNESS"]'::jsonb,
    '[{"code":"PLUMBING_CRAFTSMAN","name":"배관기능사","issueDate":"2018-11-01"}]'::jsonb,
    '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1012-0012'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '윤재원', '1986-04-22', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('FORM','CONCRETE')),
    210000, 290000, 'DAILY',
    '["SAFETY_HARNESS","FORM_JACK"]'::jsonb,
    '[{"code":"FORM_CRAFTSMAN","name":"거푸집기능사","issueDate":"2012-06-01"},{"code":"CONSTRUCTION_SAFETY","name":"건설안전기능사","issueDate":"2014-09-01"}]'::jsonb,
    '[{"title":"인천 송도 주상복합","startDate":"2023-01-01","endDate":"2023-11-30","description":"지상 45층 거푸집 팀장 보조"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1014-0014'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, 'Nguyen Thi E', '1996-07-08', 'VN', 'H2', 'COMPLETED',
    '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('PAINTING','TILE')),
    140000, 195000, 'DAILY',
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
FROM users u WHERE u.phone = '+82-10-1015-0015'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '오재현', '1980-12-01', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('ELECTRICAL','PLUMBING')),
    300000, 420000, 'DAILY',
    '["ELECTRICAL_TESTER","SAFETY_HARNESS","MULTIMETER"]'::jsonb,
    '[{"code":"ELECTRICAL_ENGINEER","name":"전기산업기사","issueDate":"2008-07-01"},{"code":"ELECTRICAL_CRAFTSMAN","name":"전기기능사","issueDate":"2006-09-01"}]'::jsonb,
    '[{"title":"수원 삼성디지털시티 전기공사","startDate":"2024-01-01","endDate":"2024-12-31","description":"대규모 산업단지 전기 인프라 팀장"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1016-0016'
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO worker_profiles (user_id, full_name, birth_date, nationality, visa_type, health_check_status, languages, desired_job_categories, desired_pay_min, desired_pay_max, desired_pay_unit, equipment, certifications, portfolio)
SELECT u.id, '김민석', '1984-08-15', 'KR', 'CITIZEN', 'COMPLETED',
    '[{"code":"ko","level":"NATIVE"}]'::jsonb,
    (SELECT jsonb_agg(id) FROM job_categories WHERE code IN ('PAINTING','MASONRY','TILE')),
    160000, 240000, 'DAILY',
    '["SPRAY_MACHINE","SAFETY_HARNESS"]'::jsonb,
    '[{"code":"PAINTING_CRAFTSMAN","name":"도장기능사","issueDate":"2011-04-01"}]'::jsonb,
    '[{"title":"잠실 롯데월드몰 도장","startDate":"2023-06-01","endDate":"2023-12-31","description":"대형 상업시설 내외부 도장 마감"}]'::jsonb
FROM users u WHERE u.phone = '+82-10-1017-0017'
ON CONFLICT (user_id) DO NOTHING;

-- ── C. Additional Companies ──────────────────────────────────────

INSERT INTO companies (name, business_registration_number, ceo_name, phone, status, verified_at, address, description) VALUES
    ('동성이앤씨(주)',   '456-78-90123', '박동성', '02-5555-6666', 'ACTIVE',    NOW(),  '서울특별시 서초구 강남대로 200', '서울 동남권 전문 건설사. 주거/오피스 현장 다수 보유.'),
    ('한양건설산업(주)', '567-89-01234', '한기범', '031-222-3333', 'PENDING',   NULL,   '경기도 화성시 동탄2신도시 501', '동탄 신도시 전문 건설사. 현재 기업 인증 심사 중.'),
    ('대경종합건설(주)', '678-90-12345', '이대경', '051-777-8888', 'SUSPENDED', NULL,   '부산광역시 해운대구 마린시티 99', '부산 지역 건설사. 위반 이력으로 일시 정지 중.')
ON CONFLICT (business_registration_number) DO NOTHING;

-- ── D. Additional Employer Profiles ─────────────────────────────

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '박동성', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2004-0004' AND c.name = '동성이앤씨(주)'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '한기범', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2005-0005' AND c.name = '한양건설산업(주)'
ON CONFLICT (user_id, company_id) DO NOTHING;

INSERT INTO employer_profiles (user_id, company_id, full_name, role)
SELECT u.id, c.id, '이대경', 'OWNER'
FROM users u, companies c
WHERE u.phone = '+82-10-2006-0006' AND c.name = '대경종합건설(주)'
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ── E. Additional Sites ──────────────────────────────────────────

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '서초 복합업무시설 현장', '서울특별시 서초구 반포대로 310', '서울특별시', '서초구', 37.5044, 127.0055, 'ACTIVE'
FROM companies c WHERE c.name = '동성이앤씨(주)';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '동탄 2신도시 아파트 A현장', '경기도 화성시 동탄대로 600', '경기도', '화성시', 37.2010, 127.0742, 'ACTIVE'
FROM companies c WHERE c.name = '동성이앤씨(주)';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '화성 물류단지 현장', '경기도 화성시 팔탄면 산단로 100', '경기도', '화성시', 37.2135, 126.8943, 'PLANNING'
FROM companies c WHERE c.name = '한양건설산업(주)';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '수원 영통구 오피스 현장', '경기도 수원시 영통구 광교로 107', '경기도', '수원시', 37.2943, 127.0434, 'ACTIVE'
FROM companies c WHERE c.name = '(주)GADA건설';

INSERT INTO sites (company_id, name, address, sido, sigungu, latitude, longitude, status)
SELECT c.id, '인천 검단 주거단지 현장', '인천광역시 서구 검단로 500', '인천광역시', '서구', 37.5912, 126.6878, 'ACTIVE'
FROM companies c WHERE c.name = '신흥건설(주)';

-- ── F. Additional Jobs ───────────────────────────────────────────

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, visa_requirements, application_types, health_check_required, accommodation_provided, meal_provided, transportation_provided)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'FORM'),
    '서초 복합업무시설 거푸집공 모집', 'PUBLISHED',
    '서초구 복합업무시설 신축 현장 거푸집 설치/해체 작업. 경력 3년 이상 우대. 팀 지원 환영.',
    200000, 260000, 'DAILY', 6,
    CURRENT_DATE + INTERVAL '5 days',
    '["CITIZEN","H2","F4","F5"]'::jsonb, '["INDIVIDUAL","TEAM"]'::jsonb,
    FALSE, FALSE, TRUE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '동성이앤씨(주)' AND s.name LIKE '%서초%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, visa_requirements, application_types, health_check_required, accommodation_provided, meal_provided)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'REBAR'),
    '동탄 아파트 철근공 대규모 모집', 'PUBLISHED',
    '동탄2신도시 대단지 아파트 철근 배근 작업. 팀 단위 지원 우대. 점심 제공.',
    185000, 235000, 'DAILY', 15,
    CURRENT_DATE + INTERVAL '10 days',
    '["CITIZEN","H2","E9","F4","F5","F6"]'::jsonb, '["INDIVIDUAL","TEAM"]'::jsonb,
    FALSE, FALSE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '동성이앤씨(주)' AND s.name LIKE '%동탄%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, visa_requirements, application_types, health_check_required)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'ELECTRICAL'),
    '수원 영통 오피스 전기공 모집', 'PUBLISHED',
    '수원 오피스 빌딩 전기 배선 및 조명 설치. 전기기능사 이상 필수.',
    270000, 350000, 'DAILY', 4,
    CURRENT_DATE + INTERVAL '7 days',
    '["CITIZEN","F4","F5"]'::jsonb, '["INDIVIDUAL","TEAM"]'::jsonb,
    TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%수원%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, always_open, visa_requirements, application_types, health_check_required, accommodation_provided, meal_provided)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'GENERAL'),
    '인천 검단 일반노무 상시모집', 'PUBLISHED',
    '인천 검단 주거단지 일반노무 작업. 무경력 가능. 외국인 환영.',
    130000, 160000, 'DAILY', 20,
    CURRENT_DATE + INTERVAL '1 days', TRUE,
    '["CITIZEN","H2","E9","F4","F5","F6"]'::jsonb, '["INDIVIDUAL"]'::jsonb,
    FALSE, TRUE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%인천%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, visa_requirements, application_types, health_check_required)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'PLUMBING'),
    '동탄 아파트 배관공 모집 (검토중)', 'DRAFT',
    '동탄 아파트 위생배관 설치 예정 공고. 배관기능사 우대.',
    190000, 250000, 'DAILY', 5,
    '["CITIZEN","H2","F4","F5"]'::jsonb, '["INDIVIDUAL"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '동성이앤씨(주)' AND s.name LIKE '%동탄%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, visa_requirements, application_types, health_check_required)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'PAINTING'),
    '서초 도장공 구인 (마감)', 'CLOSED',
    '서초 복합업무시설 내부 도장 완료. 모집 종료.',
    160000, 210000, 'DAILY', 4,
    '["CITIZEN","H2"]'::jsonb, '["INDIVIDUAL"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '동성이앤씨(주)' AND s.name LIKE '%서초%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, visa_requirements, application_types, health_check_required, accommodation_provided, meal_provided)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'CRANE'),
    '화성 물류단지 타워크레인 기사', 'PUBLISHED',
    '화성 물류단지 신축 타워크레인 운전. 자격증 필수. 숙식 제공.',
    380000, 480000, 'DAILY', 1,
    CURRENT_DATE + INTERVAL '14 days',
    '["CITIZEN","F4","F5"]'::jsonb, '["INDIVIDUAL"]'::jsonb,
    TRUE, TRUE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '한양건설산업(주)' AND s.name LIKE '%화성%';

INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description, pay_min, pay_max, pay_unit, required_count, start_date, visa_requirements, application_types, health_check_required)
SELECT s.id, c.id, (SELECT id FROM job_categories WHERE code = 'TILE'),
    '인천 검단 타일공 모집', 'PUBLISHED',
    '인천 검단 공동주택 타일 시공. E9 비자 가능.',
    155000, 200000, 'DAILY', 8,
    CURRENT_DATE + INTERVAL '3 days',
    '["CITIZEN","H2","E9","F4","F5"]'::jsonb, '["INDIVIDUAL","TEAM"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%인천%';

-- ── G. Additional Teams ──────────────────────────────────────────

INSERT INTO teams (leader_id, name, team_type, status, intro_short, intro_long, member_count, is_nationwide, regions, equipment, desired_pay_min, desired_pay_max, desired_pay_unit, headcount_target)
SELECT u.id, '오재현 전기팀', 'SQUAD', 'ACTIVE',
    '전기산업기사 보유 전기 전문팀. 수도권/충청 광역 활동.',
    '전기산업기사 자격 보유 팀장을 중심으로 구성된 전기 전문팀입니다. 대형 산업시설, 공동주택, 오피스 현장 시공 경력 풍부. 팀원 2명 추가 모집 중.',
    1, TRUE,
    '[{"sido":"서울특별시","sigungu":""},{"sido":"경기도","sigungu":""},{"sido":"충청남도","sigungu":""}]'::jsonb,
    '["ELECTRICAL_TESTER","SAFETY_HARNESS","MULTIMETER"]'::jsonb,
    280000, 420000, 'DAILY', 4
FROM users u WHERE u.phone = '+82-10-1016-0016';

INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status, full_name, birth_date, invitation_status, joined_at)
SELECT t.id, u.id, 'LEADER', 'KR', 'CITIZEN', 'COMPLETED', '오재현', '1980-12-01', 'ACCEPTED', NOW() - INTERVAL '8 months'
FROM teams t JOIN users u ON u.phone = '+82-10-1016-0016'
WHERE t.name = '오재현 전기팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

INSERT INTO teams (leader_id, name, team_type, status, intro_short, intro_long, member_count, is_nationwide, regions, equipment, desired_pay_min, desired_pay_max, desired_pay_unit, headcount_target)
SELECT u.id, '김민석 도장팀', 'SQUAD', 'ACTIVE',
    '도장기능사 보유 인테리어 마감 전문팀.',
    '도장 및 타일 마감 전문팀입니다. 대형 상업시설과 공동주택 인테리어 마감 경험 다수. 빠르고 깔끔한 시공으로 평가 우수.',
    1, FALSE,
    '[{"sido":"서울특별시","sigungu":""},{"sido":"경기도","sigungu":"성남시"}]'::jsonb,
    '["SPRAY_MACHINE","SAFETY_HARNESS","TILE_CUTTER"]'::jsonb,
    160000, 240000, 'DAILY', 3
FROM users u WHERE u.phone = '+82-10-1017-0017';

INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status, full_name, birth_date, invitation_status, joined_at)
SELECT t.id, u.id, 'LEADER', 'KR', 'CITIZEN', 'COMPLETED', '김민석', '1984-08-15', 'ACCEPTED', NOW() - INTERVAL '4 months'
FROM teams t JOIN users u ON u.phone = '+82-10-1017-0017'
WHERE t.name = '김민석 도장팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Add Le Van C to 박팀장 팀 as pending invitation
INSERT INTO team_members (team_id, user_id, role, nationality, visa_type, health_check_status, full_name, birth_date, invitation_status, invited_by, invited_at, joined_at)
SELECT t.id, u.id, 'MEMBER', 'VN', 'E9', 'COMPLETED', 'Le Van C', '1993-11-30', 'PENDING',
    (SELECT id FROM users WHERE phone = '+82-10-1003-0003'), NOW() - INTERVAL '2 days', NOW()
FROM teams t JOIN users u ON u.phone = '+82-10-1009-0009'
WHERE t.name = '박팀장 콘크리트팀'
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ── H. Additional Applications ───────────────────────────────────

-- 홍길동 → 분당 방수 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '방수기능사 보유. 성실히 하겠습니다.',
    '{"fullName":"홍길동","birthDate":"1992-02-14","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"WATERPROOF_CRAFTSMAN","name":"방수기능사"}],"desiredPayMin":140000,"desiredPayMax":200000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM jobs j JOIN users u ON u.phone = '+82-10-1008-0008'
WHERE j.title LIKE '%분당%방수%';

-- 최성훈 → 용인 크레인 (UNDER_REVIEW)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'UNDER_REVIEW',
    '타워크레인운전기능사 보유. 경력 10년.',
    '{"fullName":"최성훈","birthDate":"1987-06-05","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"CRANE_OPERATOR","name":"타워크레인운전기능사"}],"desiredPayMin":350000,"desiredPayMax":480000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '4 days'
FROM jobs j JOIN users u ON u.phone = '+82-10-1010-0010'
WHERE j.title LIKE '%용인%크레인%';

-- 최성훈 → 화성 타워크레인 (SHORTLISTED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'SHORTLISTED',
    '즉시 투입 가능합니다.',
    '{"fullName":"최성훈","birthDate":"1987-06-05","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"CRANE_OPERATOR","name":"타워크레인운전기능사"}],"desiredPayMin":380000,"desiredPayMax":480000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM jobs j JOIN users u ON u.phone = '+82-10-1010-0010'
WHERE j.title LIKE '%화성%타워크레인%';

-- Le Van C → 인천 타일 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '타일 경력 3년 있습니다.',
    '{"fullName":"Le Van C","birthDate":"1993-11-30","nationality":"VN","visaType":"E9","healthCheckStatus":"COMPLETED","certifications":[],"desiredPayMin":150000,"desiredPayMax":210000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '1 day'
FROM jobs j JOIN users u ON u.phone = '+82-10-1009-0009'
WHERE j.title LIKE '%인천%타일%';

-- Pham Van D → 인천 일반노무 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '열심히 일하겠습니다.',
    '{"fullName":"Pham Van D","birthDate":"1998-03-20","nationality":"VN","visaType":"E9","healthCheckStatus":"NOT_DONE","certifications":[],"desiredPayMin":130000,"desiredPayMax":170000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '3 hours'
FROM jobs j JOIN users u ON u.phone = '+82-10-1011-0011'
WHERE j.title LIKE '%인천%일반노무%';

-- 윤재원 → 서초 거푸집 (UNDER_REVIEW)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'UNDER_REVIEW',
    '거푸집기능사 보유, 경력 14년입니다.',
    '{"fullName":"윤재원","birthDate":"1986-04-22","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"FORM_CRAFTSMAN","name":"거푸집기능사"}],"desiredPayMin":210000,"desiredPayMax":290000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '3 days'
FROM jobs j JOIN users u ON u.phone = '+82-10-1014-0014'
WHERE j.title LIKE '%서초%거푸집%';

-- 윤재원 → 동탄 철근 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '철근/거푸집 모두 가능합니다.',
    '{"fullName":"윤재원","birthDate":"1986-04-22","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"FORM_CRAFTSMAN","name":"거푸집기능사"}],"desiredPayMin":210000,"desiredPayMax":290000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '6 hours'
FROM jobs j JOIN users u ON u.phone = '+82-10-1014-0014'
WHERE j.title LIKE '%동탄%철근%';

-- Nguyen Thi E → 마포 미장 (INTERVIEW_PENDING)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'INTERVIEW_PENDING',
    '미장/도장 가능합니다. 꼼꼼하게 작업합니다.',
    '{"fullName":"Nguyen Thi E","birthDate":"1996-07-08","nationality":"VN","visaType":"H2","healthCheckStatus":"COMPLETED","certifications":[],"desiredPayMin":140000,"desiredPayMax":195000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '5 days'
FROM jobs j JOIN users u ON u.phone = '+82-10-1015-0015'
WHERE j.title LIKE '%마포%미장%';

-- 오재현 팀 → 수원 전기 (TEAM 지원, SHORTLISTED)
INSERT INTO applications (job_id, application_type, team_id, status, cover_letter, worker_snapshot, team_snapshot, status_updated_at)
SELECT j.id, 'TEAM', t.id, 'SHORTLISTED',
    '전기산업기사 보유 팀 지원. 즉시 투입 가능.',
    '{"fullName":"오재현","birthDate":"1980-12-01","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"COMPLETED","certifications":[{"code":"ELECTRICAL_ENGINEER","name":"전기산업기사"}],"desiredPayMin":300000,"desiredPayMax":420000,"desiredPayUnit":"DAILY"}'::jsonb,
    '{"name":"오재현 전기팀","type":"SQUAD","memberCount":1,"desiredPayMin":280000,"desiredPayMax":420000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '2 days'
FROM jobs j JOIN teams t ON t.name = '오재현 전기팀'
WHERE j.title LIKE '%수원%전기%';

-- 강병철 → 마포 전기 (APPLIED)
INSERT INTO applications (job_id, application_type, applicant_user_id, status, cover_letter, worker_snapshot, status_updated_at)
SELECT j.id, 'INDIVIDUAL', u.id, 'APPLIED',
    '배관/전기 보조 가능합니다.',
    '{"fullName":"강병철","birthDate":"1991-09-18","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"SCHEDULED","certifications":[{"code":"PLUMBING_CRAFTSMAN","name":"배관기능사"}],"desiredPayMin":180000,"desiredPayMax":260000,"desiredPayUnit":"DAILY"}'::jsonb,
    NOW() - INTERVAL '12 hours'
FROM jobs j JOIN users u ON u.phone = '+82-10-1012-0012'
WHERE j.title LIKE '%마포%전기%';

-- Update application_count
UPDATE jobs SET application_count = (
    SELECT COUNT(*) FROM applications a WHERE a.job_id = jobs.id AND a.deleted_at IS NULL
);

-- ── I. Additional Application Status History ─────────────────────

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'UNDER_REVIEW',
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '타워크레인 자격증 확인 중.', NOW() - INTERVAL '3 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1010-0010' AND j.title LIKE '%용인%크레인%';

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'INTERVIEW_PENDING',
    (SELECT id FROM users WHERE phone = '+82-10-2002-0002'),
    '현장 인터뷰 요청.', NOW() - INTERVAL '4 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1015-0015' AND j.title LIKE '%마포%미장%';

INSERT INTO application_status_history (application_id, from_status, to_status, changed_by, note, created_at)
SELECT a.id, 'APPLIED', 'SHORTLISTED',
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    '전기산업기사 자격 확인. 서류 통과.', NOW() - INTERVAL '1 day'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN teams t ON t.id = a.team_id
WHERE t.name = '오재현 전기팀' AND j.title LIKE '%수원%전기%';

-- ── J. Additional Contracts ──────────────────────────────────────

INSERT INTO contracts (application_id, job_id, employer_user_id, worker_user_id, status, start_date, end_date, pay_amount, pay_unit, terms, sent_at, employer_signed_at, worker_signed_at)
SELECT a.id, j.id,
    (SELECT id FROM users WHERE phone = '+82-10-2002-0002'),
    (SELECT id FROM users WHERE phone = '+82-10-1015-0015'),
    'SIGNED',
    CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '65 days',
    175000, 'DAILY',
    '1. 작업: 미장 및 마감 작업
2. 근무시간: 오전 7시 30분 ~ 오후 5시
3. 급여: 일당 17만 5천원
4. 안전장비: 갑 제공
5. 무단이탈 시 패널티 적용.',
    NOW() - INTERVAL '6 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1015-0015' AND j.title LIKE '%마포%미장%';

INSERT INTO contracts (application_id, job_id, employer_user_id, worker_user_id, status, start_date, pay_amount, pay_unit, terms, sent_at)
SELECT a.id, j.id,
    (SELECT id FROM users WHERE phone = '+82-10-2002-0002'),
    (SELECT id FROM users WHERE phone = '+82-10-1010-0010'),
    'SENT',
    CURRENT_DATE + INTERVAL '3 days',
    420000, 'DAILY',
    '1. 작업: 타워크레인 운전
2. 근무시간: 오전 7시 ~ 오후 6시
3. 급여: 일당 42만원
4. 숙식 제공 (식비 포함)
5. 자격증 갱신 지원.',
    NOW() - INTERVAL '2 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1010-0010' AND j.title LIKE '%용인%크레인%';

INSERT INTO contracts (application_id, job_id, employer_user_id, worker_user_id, status, start_date, end_date, pay_amount, pay_unit, terms, sent_at, employer_signed_at, worker_signed_at)
SELECT a.id, j.id,
    (SELECT id FROM users WHERE phone = '+82-10-2001-0001'),
    (SELECT id FROM users WHERE phone = '+82-10-1014-0014'),
    'SIGNED',
    CURRENT_DATE + INTERVAL '8 days', CURRENT_DATE + INTERVAL '98 days',
    240000, 'DAILY',
    '1. 작업: 거푸집 설치/해체
2. 근무시간: 오전 7시 ~ 오후 5시 30분
3. 급여: 일당 24만원
4. 점심·교통비 제공.',
    NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days'
FROM applications a
JOIN jobs j ON j.id = a.job_id
JOIN users u ON u.id = a.applicant_user_id
WHERE u.phone = '+82-10-1014-0014' AND j.title LIKE '%서초%거푸집%';

-- ── K. Additional Notifications ──────────────────────────────────

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '지원서가 검토 중입니다',
    '용인 물류센터 크레인 기사 지원서가 검토 중입니다.',
    '{"jobTitle":"용인 물류센터 크레인 기사 모집","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
FROM users u WHERE u.phone = '+82-10-1010-0010';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '계약서가 발송되었습니다',
    '용인 물류센터 크레인 기사 계약서를 확인하고 서명해주세요.',
    '{"action":"VIEW_CONTRACT"}'::jsonb,
    FALSE, NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'
FROM users u WHERE u.phone = '+82-10-1010-0010';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', 'GADA에 오신 것을 환영합니다!', '지금 바로 건설 현장 공고를 확인해보세요.',
    '{"action":"BROWSE_JOBS"}'::jsonb,
    TRUE, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'
FROM users u WHERE u.phone = '+82-10-1009-0009';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '지원이 완료되었습니다',
    '인천 검단 타일공 공고에 지원이 접수되었습니다.',
    '{"jobTitle":"인천 검단 타일공 모집","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'
FROM users u WHERE u.phone = '+82-10-1009-0009';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'APPLICATION', '면접 일정이 잡혔습니다',
    '마포 복합문화공간 미장공 현장 면접이 예정되었습니다.',
    '{"jobTitle":"마포 복합문화공간 미장공 구인","action":"VIEW_APPLICATION"}'::jsonb,
    FALSE, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'
FROM users u WHERE u.phone = '+82-10-1015-0015';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', '계약서가 서명 완료되었습니다',
    '마포 복합문화공간 계약서 쌍방 서명이 완료되었습니다.',
    '{"action":"VIEW_CONTRACT"}'::jsonb,
    TRUE, NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'
FROM users u WHERE u.phone = '+82-10-1015-0015';

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'MARKETING', '새 공고 알림 - 맞춤 추천',
    '회원님의 관심 직종에 새 공고가 등록되었습니다. 지금 확인하세요!',
    '{"action":"BROWSE_JOBS"}'::jsonb,
    TRUE, NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
FROM users u WHERE u.phone IN ('+82-10-1008-0008', '+82-10-1011-0011', '+82-10-1012-0012', '+82-10-1014-0014');

INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at, updated_at)
SELECT u.id, 'SYSTEM', '건강검진 완료 요청',
    '지원하신 공고에서 건강검진 결과를 요구합니다. 조속히 완료해주세요.',
    '{"action":"HEALTH_CHECK"}'::jsonb,
    FALSE, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
FROM users u WHERE u.phone = '+82-10-1011-0011';

-- ── L. Additional SMS Templates ──────────────────────────────────

INSERT INTO sms_templates (code, name, locale, content, variables, is_active) VALUES
('CONTRACT_SENT',       '계약서 발송',       'ko', '{name}님, {companyName}에서 {jobTitle} 계약서를 발송했습니다. GADA 앱에서 확인 후 서명해주세요.', '["name","companyName","jobTitle"]'::jsonb, TRUE),
('CONTRACT_SIGNED',     '계약 체결 완료',    'ko', '{name}님, {jobTitle} 계약이 완료되었습니다. {startDate} 출근 예정입니다.', '["name","jobTitle","startDate"]'::jsonb, TRUE),
('INTERVIEW_SCHEDULED', '면접 일정 안내',    'ko', '{name}님, {companyName} 면접이 {date} {time}에 예정되어 있습니다. {siteAddress}에서 진행됩니다.', '["name","companyName","date","time","siteAddress"]'::jsonb, TRUE),
('JOB_PUBLISHED',       '공고 게시 알림',    'ko', '[GADA] {companyName}에서 새 공고 "{jobTitle}"를 게시했습니다. 지금 확인하세요!', '["companyName","jobTitle"]'::jsonb, TRUE),
('TEAM_INVITE',         '팀 초대 알림',      'ko', '{leaderName}님이 {teamName} 팀에 초대했습니다. GADA 앱에서 수락 여부를 결정해주세요.', '["leaderName","teamName"]'::jsonb, TRUE),
('HEALTH_CHECK_REMIND', '건강검진 독촉',     'ko', '{name}님, 건강검진 완료가 확인되지 않습니다. 빠른 완료를 부탁드립니다.', '["name"]'::jsonb, TRUE),
('WELCOME_EN',          'Welcome message',   'en', 'Hello {name}! Welcome to GADA. Find construction jobs near you now!', '["name"]'::jsonb, TRUE),
('ONBOARD_VN',          'Chào mừng (VN)',    'vi', 'Xin chào {name}! Chào mừng bạn đến với GADA. Hãy tìm việc làm xây dựng ngay hôm nay!', '["name"]'::jsonb, TRUE),
('APPLICATION_HIRED',   '최종 합격 알림',    'ko', '축하드립니다! {name}님, {jobTitle}에 최종 합격되었습니다. 곧 계약서가 발송될 예정입니다.', '["name","jobTitle"]'::jsonb, TRUE),
('APPLICATION_REJECTED','불합격 안내',       'ko', '{name}님, {jobTitle} 지원이 아쉽게 불합격 처리되었습니다. 다른 공고에 도전해 보세요!', '["name","jobTitle"]'::jsonb, TRUE)
ON CONFLICT (code, locale) DO UPDATE SET
    name = EXCLUDED.name, content = EXCLUDED.content,
    variables = EXCLUDED.variables, is_active = EXCLUDED.is_active;

-- ── M. Additional FAQs ───────────────────────────────────────────

INSERT INTO faqs (category, locale, question, answer, sort_order, is_published) VALUES
('GENERAL',   'ko', '회원가입은 어떻게 하나요?', '휴대폰 번호로 간편하게 가입할 수 있습니다. 앱 또는 웹사이트에서 전화번호 입력 후 인증코드를 받아 가입을 완료하세요.', 6, TRUE),
('GENERAL',   'ko', '급여는 어떻게 지급되나요?', '계약서에 명시된 방식(일당/주급/월급)에 따라 지급됩니다. 일당의 경우 보통 매일 또는 주 1회 정산됩니다.', 7, TRUE),
('GENERAL',   'ko', '현장 안전사고 발생 시 어떻게 하나요?', '즉시 119에 신고하고 현장 안전관리자에게 보고하세요. GADA 고객센터(1588-XXXX)에도 연락주시면 지원해 드립니다.', 8, TRUE),
('EMPLOYER',  'ko', '기업 등록은 어떻게 하나요?', '사업자등록증과 대표자 신분증을 준비하여 기업 인증 신청을 해주세요. 보통 1~3 영업일 이내에 승인됩니다.', 1, TRUE),
('EMPLOYER',  'ko', '외국인 근로자를 고용할 때 주의할 점은?', '비자 종류에 따라 취업 가능 업종이 다릅니다. E9 비자 근로자는 제조/건설/농축산업에 취업 가능하나, 사업장 변경 시 신고가 필요합니다.', 2, TRUE),
('EMPLOYER',  'ko', '스카우트 기능은 무엇인가요?', '고용주가 플랫폼에 등록된 근로자에게 직접 입사 제안을 보내는 기능입니다. 프리미엄 회원에게 제공됩니다.', 3, TRUE),
('CONCRETE',  'ko', '콘크리트 타설 작업 시 안전 주의사항은?', '반드시 안전화, 안전모, 안전벨트를 착용하세요. 펌프카 반경 내 작업 시 신호수를 배치해야 합니다. 야간 타설 시 충분한 조명을 확보하세요.', 2, TRUE),
('ELECTRICAL','ko', '전기 작업 시 필요한 자격증은?', '전기기능사(기본), 전기산업기사(중급), 전기기사(고급)가 있습니다. 현장에 따라 요구 등급이 다르니 공고 확인이 필요합니다.', 1, TRUE)
;

