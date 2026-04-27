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
-- Admin password: Gada2024!  (BCrypt hash below)
INSERT INTO users (phone, firebase_uid, role, status, admin_role, password_hash) VALUES
-- Workers
    ('+82-10-1001-0001', 'dev-worker-1',       'WORKER',      'ACTIVE', NULL, NULL),
    ('+82-10-1002-0002', 'dev-worker-2',       'WORKER',      'ACTIVE', NULL, NULL),
    ('+82-10-1004-0004', 'dev-worker-4',       'WORKER',      'ACTIVE', NULL, NULL),
    ('+82-10-1005-0005', 'dev-worker-5',       'WORKER',      'ACTIVE', NULL, NULL),
    ('+82-10-1006-0006', 'dev-worker-6',       'WORKER',      'ACTIVE', NULL, NULL),
-- Team Leaders
    ('+82-10-1003-0003', 'dev-leader-3',       'TEAM_LEADER', 'ACTIVE', NULL, NULL),
    ('+82-10-1007-0007', 'dev-leader-7',       'TEAM_LEADER', 'ACTIVE', NULL, NULL),
-- Employers
    ('+82-10-2001-0001', 'dev-employer-1',     'EMPLOYER',    'ACTIVE', NULL, NULL),
    ('+82-10-2002-0002', 'dev-employer-2',     'EMPLOYER',    'ACTIVE', NULL, NULL),
    ('+82-10-2003-0003', 'dev-employer-3',     'EMPLOYER',    'ACTIVE', NULL, NULL),
-- Admin (password: Gada2024!)
    ('+82-10-9001-0001', 'dev-admin-1',        'ADMIN',       'ACTIVE', 'SUPER_ADMIN',
     '$2a$10$Dsk.rKicYH1TjiKYeI3Sde6F0/b2Q/GZd1REp1cHH8VOuGDrWTvsS')
ON CONFLICT (phone) DO UPDATE SET
    firebase_uid  = EXCLUDED.firebase_uid,
    role          = EXCLUDED.role,
    status        = EXCLUDED.status,
    admin_role    = EXCLUDED.admin_role,
    password_hash = EXCLUDED.password_hash;

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

-- Job 9: 안전관리자 (MONTHLY — PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'GENERAL'),
    '강남 현장 안전관리자 월급 채용',
    'PUBLISHED',
    '강남 신축 아파트 현장 안전관리 전담 인원 채용. 산업안전기사 자격증 우대. 주 5일 근무, 월 급여 300~400만원.',
    3000000, 4000000, 'MONTHLY', 1,
    CURRENT_DATE + INTERVAL '5 days',
    '["CITIZEN","F4","F5"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    FALSE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '(주)GADA건설' AND s.name LIKE '%강남%';

-- Job 10: 현장소장 (MONTHLY — PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required,
    accommodation_provided, meal_provided)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'GENERAL'),
    '마포 복합문화공간 현장소장 (월급)',
    'PUBLISHED',
    '마포 현장 전체 관리 책임자 채용. 건설 경력 10년 이상 필수. 월 500~700만원, 숙식 제공.',
    5000000, 7000000, 'MONTHLY', 1,
    CURRENT_DATE + INTERVAL '14 days',
    '["CITIZEN","F5"]'::jsonb,
    '["INDIVIDUAL"]'::jsonb,
    FALSE, TRUE, TRUE
FROM sites s JOIN companies c ON c.id = s.company_id
WHERE c.name = '신흥건설(주)' AND s.name LIKE '%마포%';

-- Job 11: 용인 배관공 (WEEKLY — PUBLISHED)
INSERT INTO jobs (site_id, company_id, job_category_id, title, status, description,
    pay_min, pay_max, pay_unit, required_count, start_date,
    visa_requirements, application_types, health_check_required)
SELECT s.id, c.id,
    (SELECT id FROM job_categories WHERE code = 'PLUMBING'),
    '용인 물류센터 배관공 주급 채용',
    'PUBLISHED',
    '용인 물류센터 신축 배관 작업. 주급 90~120만원. 주말 포함 6일 근무 가능자 우대.',
    900000, 1200000, 'WEEKLY', 4,
    CURRENT_DATE + INTERVAL '7 days',
    '["CITIZEN","H2","E9","F4","F5"]'::jsonb,
    '["INDIVIDUAL","TEAM"]'::jsonb,
    TRUE
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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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
ON CONFLICT (category_id, locale) DO UPDATE SET title=EXCLUDED.title, subtitle=EXCLUDED.subtitle, body=EXCLUDED.body, work_characteristics=EXCLUDED.work_characteristics, related_skills=EXCLUDED.related_skills, pricing_notes=EXCLUDED.pricing_notes, is_published=EXCLUDED.is_published, reading_time_min=EXCLUDED.reading_time_min;

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

