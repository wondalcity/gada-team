-- =============================================================
-- V21: Comprehensive dev seed data
-- Users, worker profiles, companies, sites, jobs, teams,
-- team_members, employer_profiles, applications
-- =============================================================

-- ─── 1. USERS ────────────────────────────────────────────────

INSERT INTO users (id, phone, firebase_uid, full_name, role, status) VALUES
-- Workers
(1,  '010-1001-0001', 'dev-worker-1',  '응우옌 반 안',   'WORKER', 'ACTIVE'),
(2,  '010-1001-0002', 'dev-worker-2',  '쩐 민 호앙',     'WORKER', 'ACTIVE'),
(3,  '010-1001-0003', 'dev-worker-3',  '레 티 마이',     'WORKER', 'ACTIVE'),
(4,  '010-1001-0004', 'dev-worker-4',  '팜 반 득',       'WORKER', 'ACTIVE'),
(5,  '010-1001-0005', 'dev-worker-5',  '도 티 흐엉',     'WORKER', 'ACTIVE'),
(6,  '010-1001-0006', 'dev-worker-6',  '장민준',         'WORKER', 'ACTIVE'),
(7,  '010-1001-0007', 'dev-worker-7',  '황진수',         'WORKER', 'SUSPENDED'),
-- Team leader
(8,  '010-1001-0008', 'dev-worker-8',  '김철수',         'TEAM_LEADER', 'ACTIVE'),
-- Employers
(9,  '010-2001-0001', 'dev-employer-1','박건설',         'EMPLOYER', 'ACTIVE'),
(10, '010-2001-0002', 'dev-employer-2','이현우',         'EMPLOYER', 'ACTIVE'),
(11, '010-2001-0003', 'dev-employer-3','최미영',         'EMPLOYER', 'ACTIVE'),
-- Admin
(12, '010-9001-0001', 'dev-admin-1',   '관리자',         'ADMIN', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- Sync sequence
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- ─── 2. WORKER PROFILES ──────────────────────────────────────

INSERT INTO worker_profiles (
    user_id, full_name, birth_date, nationality, visa_type,
    languages, desired_job_categories, equipment, certifications, portfolio,
    desired_pay_min, desired_pay_max, desired_pay_unit,
    health_check_status, bio, is_public, preferred_regions
) VALUES
(1, '응우옌 반 안', '1992-03-15', 'VN', 'E9',
 '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}]',
 '[1,2]', '["굴삭기","지게차"]',
 '[{"name":"굴삭기운전기능사","issueDate":"2020-05-10"}]', '[]',
 180000, 250000, 'DAILY', 'COMPLETED',
 '건설 현장 5년 경험. 굴삭기·지게차 운전 가능합니다.', true, '[]'),

(2, '쩐 민 호앙', '1990-07-22', 'VN', 'H2',
 '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}]',
 '[2,3]', '[]',
 '[{"name":"비계기능사","issueDate":"2021-08-20"}]', '[]',
 160000, 220000, 'DAILY', 'NOT_DONE',
 '철근·비계 작업 전문. 성실하게 일합니다.', true, '[]'),

(3, '레 티 마이', '1995-11-05', 'VN', 'E9',
 '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"FLUENT"}]',
 '[4,5]', '[]',
 '[]', '[]',
 150000, 200000, 'DAILY', 'NOT_DONE',
 '타일·미장 작업 경험 3년 이상.', true, '[]'),

(4, '팜 반 득', '1988-02-28', 'VN', 'H2',
 '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"INTERMEDIATE"}]',
 '[1,6]', '["크레인"]',
 '[{"name":"크레인운전기능사","issueDate":"2019-03-14"},{"name":"건설안전기사","issueDate":"2022-01-05"}]', '[]',
 200000, 280000, 'DAILY', 'COMPLETED',
 '크레인 운전 8년 경력. 대형 현장 경험 다수.', true, '[]'),

(5, '도 티 흐엉', '1998-06-18', 'VN', 'E9',
 '[{"code":"vi","level":"NATIVE"},{"code":"ko","level":"BASIC"}]',
 '[7,8]', '[]',
 '[]', '[]',
 140000, 190000, 'DAILY', 'NOT_DONE',
 '도장·방수 작업 희망.', true, '[]'),

(6, '장민준', '1993-06-12', 'KR', 'CITIZEN',
 '[{"code":"ko","level":"NATIVE"}]',
 '[1,2]', '[]',
 '[{"name":"콘크리트기능사","issueDate":"2018-09-30"}]', '[]',
 190000, 260000, 'DAILY', 'NOT_DONE',
 '콘크리트·철근 현장 경험 7년.', true, '[]'),

(7, '황진수', '1989-09-25', 'KR', 'CITIZEN',
 '[{"code":"ko","level":"NATIVE"}]',
 '[3,4]', '[]',
 '[{"name":"비계기능사","issueDate":"2017-04-11"}]', '[]',
 170000, 240000, 'DAILY', 'NOT_DONE',
 '거푸집·조적 전문.', false, '[]'),

(8, '김철수', '1985-04-10', 'KR', 'CITIZEN',
 '[{"code":"ko","level":"NATIVE"},{"code":"vi","level":"INTERMEDIATE"}]',
 '[1,2,3]', '["굴삭기","지게차"]',
 '[{"name":"굴삭기운전기능사","issueDate":"2015-06-20"},{"name":"지게차운전기능사","issueDate":"2016-03-08"}]', '[]',
 220000, 300000, 'DAILY', 'COMPLETED',
 '10년 이상 건설 현장 경력. 베트남 근로자 팀 운영 경험 있음.', true, '[]')
ON CONFLICT (user_id) DO NOTHING;

-- ─── 3. COMPANIES ────────────────────────────────────────────

INSERT INTO companies (id, public_id, name, business_registration_number, ceo_name, address, phone, email, description, status) VALUES
(1, uuid_generate_v4(), '(주)한국건설',    '123-45-67890', '박건설', '서울시 강남구 테헤란로 123', '02-1234-5678', 'info@hankook.kr',
 '서울·수도권 주요 건설 현장을 담당하는 중견 건설사입니다.', 'ACTIVE'),
(2, uuid_generate_v4(), '대성종합건설(주)', '234-56-78901', '이현우', '경기도 수원시 팔달구 중부대로 456', '031-234-5678', 'hr@daesung.kr',
 '수도권 아파트·상업시설 시공 전문 건설사.', 'ACTIVE'),
(3, uuid_generate_v4(), '미래건설산업(주)', '345-67-89012', '최미영', '인천시 남동구 논현로 789', '032-345-6789', 'jobs@mirae.kr',
 '인천·경기 지역 토목·건축 종합 시공사.', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('companies_id_seq', (SELECT MAX(id) FROM companies));

-- ─── 4. EMPLOYER PROFILES ────────────────────────────────────

INSERT INTO employer_profiles (user_id, company_id, full_name, position, role) VALUES
(9,  1, '박건설', '대표이사', 'OWNER'),
(10, 2, '이현우', '인사팀장', 'MANAGER'),
(11, 3, '최미영', '채용담당자', 'STAFF')
ON CONFLICT (user_id, company_id) DO NOTHING;

-- ─── 5. SITES ─────────────────────────────────────────────────

INSERT INTO sites (id, public_id, company_id, name, address, latitude, longitude, status, start_date, end_date) VALUES
(1, uuid_generate_v4(), 1, '강남 오피스텔 신축공사', '서울시 강남구 역삼동 123-4',    37.5012, 127.0396, 'ACTIVE',    '2025-03-01', '2026-06-30'),
(2, uuid_generate_v4(), 1, '마포 주상복합 공사',     '서울시 마포구 상암동 456-7',    37.5643, 126.8979, 'ACTIVE',    '2025-05-01', '2026-09-30'),
(3, uuid_generate_v4(), 2, '수원 아파트 건설현장',   '경기도 수원시 영통구 망포동 78', 37.2636, 127.0286, 'ACTIVE',    '2025-04-01', '2027-03-31'),
(4, uuid_generate_v4(), 2, '성남 물류센터 신축',     '경기도 성남시 중원구 도촌동 12', 37.4449, 127.1388, 'PLANNING',  '2026-01-01', '2026-12-31'),
(5, uuid_generate_v4(), 3, '인천 복합단지 토목공사', '인천시 서구 검단신도시 34-5',   37.5637, 126.7219, 'ACTIVE',    '2025-06-01', '2027-06-30')
ON CONFLICT (id) DO NOTHING;

SELECT setval('sites_id_seq', (SELECT MAX(id) FROM sites));

-- ─── 6. JOBS ──────────────────────────────────────────────────

INSERT INTO jobs (
    id, public_id, site_id, company_id, job_category_id,
    title, description,
    required_count, pay_min, pay_max, pay_unit,
    visa_requirements, health_check_required,
    accommodation_provided, meal_provided,
    start_date, end_date, status, published_at, poster_user_id
) VALUES
(1, uuid_generate_v4(), 1, 1, 1,
 '[강남] 콘크리트 타설 인부 모집',
 '강남 오피스텔 신축 현장에서 콘크리트 타설 작업자를 모집합니다.\n- 작업 내용: 콘크리트 타설, 양생 관리\n- 근무 형태: 주 5일 (월~금)\n- 숙소 및 식사 제공',
 5, 180000, 220000, 'DAILY',
 '["E9","H2","F4","F5","CITIZEN"]', false,
 true, true,
 '2025-08-01', '2025-12-31', 'PUBLISHED', NOW() - INTERVAL '10 days', 9),

(2, uuid_generate_v4(), 1, 1, 2,
 '[강남] 철근 조립 기능공 (경력자 우대)',
 '강남 오피스텔 신축 현장 철근 작업자 모집합니다.\n- 철근 배근·조립 경험자 우대\n- 일급 협의 가능',
 3, 200000, 260000, 'DAILY',
 '["E9","H2","F4","F5","CITIZEN"]', false,
 true, true,
 '2025-08-01', '2025-12-31', 'PUBLISHED', NOW() - INTERVAL '7 days', 9),

(3, uuid_generate_v4(), 2, 1, 3,
 '[마포] 거푸집 설치 작업자 모집',
 '마포 주상복합 공사 현장 거푸집(폼) 작업자를 모집합니다.\n- 경력 1년 이상 우대\n- 안전화·안전모 지급',
 4, 170000, 230000, 'DAILY',
 '["E9","H2","CITIZEN"]', false,
 false, true,
 '2025-09-01', '2026-02-28', 'PUBLISHED', NOW() - INTERVAL '5 days', 9),

(4, uuid_generate_v4(), 3, 2, 1,
 '[수원] 아파트 현장 콘크리트 작업자 (장기)',
 '수원 아파트 건설 현장 장기 근무 인원을 모집합니다.\n- 계약 기간: 1년 이상\n- 주거 지원 있음',
 8, 175000, 240000, 'DAILY',
 '["E9","H2","F4","F5","CITIZEN"]', true,
 true, true,
 '2025-09-15', '2027-03-31', 'PUBLISHED', NOW() - INTERVAL '3 days', 10),

(5, uuid_generate_v4(), 3, 2, 9,
 '[수원] 비계 설치·해체 작업자',
 '수원 아파트 현장에서 비계 설치 및 해체 작업자를 모집합니다.\n- 비계기능사 소지자 우대\n- 일급 280,000원 협의 가능',
 3, 200000, 280000, 'DAILY',
 '["E9","H2","F4","CITIZEN"]', false,
 true, true,
 '2025-09-01', '2026-06-30', 'PUBLISHED', NOW() - INTERVAL '2 days', 10),

(6, uuid_generate_v4(), 5, 3, 6,
 '[인천] 배관 설비 기능공 모집',
 '인천 복합단지 토목공사 현장 배관 작업자를 모집합니다.\n- 배관기능사 우대\n- 경력 2년 이상',
 2, 190000, 260000, 'DAILY',
 '["E9","H2","F4","F5","CITIZEN"]', false,
 false, false,
 '2025-10-01', '2026-12-31', 'PUBLISHED', NOW() - INTERVAL '1 day', 11),

(7, uuid_generate_v4(), 5, 3, 1,
 '[인천] 굴삭기 운전 기능사 모집',
 '인천 검단신도시 복합단지 현장 굴삭기 운전원을 모집합니다.\n- 굴삭기운전기능사 필수\n- 시급제 운영',
 2, 25000, 32000, 'HOURLY',
 '["E9","H2","F4","F5","CITIZEN"]', false,
 true, true,
 '2025-10-15', '2027-06-30', 'PUBLISHED', NOW(), 11),

(8, uuid_generate_v4(), 4, 2, 8,
 '[성남] 용접 기능공 (내년 1월 시작)',
 '성남 물류센터 신축 공사 용접 작업자를 선발 모집합니다.\n- 특수용접기능사 우대\n- 사전 접수 가능',
 2, 210000, 290000, 'DAILY',
 '["E9","H2","CITIZEN"]', false,
 false, false,
 '2026-01-15', '2026-10-31', 'PUBLISHED', NOW(), 10)
ON CONFLICT (id) DO NOTHING;

SELECT setval('jobs_id_seq', (SELECT MAX(id) FROM jobs));

-- ─── 7. TEAMS ─────────────────────────────────────────────────

INSERT INTO teams (
    id, public_id, name, leader_id, team_type,
    intro_short, intro_long, intro_multilingual,
    is_nationwide, regions, equipment,
    desired_pay_min, desired_pay_max, desired_pay_unit,
    member_count, status
) VALUES
(1, uuid_generate_v4(), '김철수 건설팀', 8, 'SQUAD',
 '베트남 출신 숙련 인력 5인팀. 콘크리트·철근 전문.',
 '팀장 김철수를 중심으로 베트남 출신 숙련 건설 인력 5명이 뭉친 팀입니다. 콘크리트 타설, 철근 조립, 거푸집 작업을 전문으로 합니다. 팀원 모두 건강검진 완료 및 비자 유효.',
 '{"vi":{"short":"Đội xây dựng Kim Cheol-su 5 người chuyên nghiệp","long":"Đội gồm 5 thành viên người Việt Nam có tay nghề cao"},"en":{"short":"Kim Chul-su Construction Team – 5 skilled workers","long":"A team of 5 skilled Vietnamese construction workers"}}',
 false,
 '[{"sido":"서울","sigungu":"강남구"},{"sido":"서울","sigungu":"마포구"},{"sido":"경기","sigungu":"수원시"}]',
 '["굴삭기","지게차"]',
 900000, 1200000, 'DAILY',
 5, 'ACTIVE'),

(2, uuid_generate_v4(), '베트남 토목팀', 8, 'SQUAD',
 '토목·배관 전문 4인팀. 장기 현장 계약 가능.',
 '토목 및 배관 작업 전문 4인 팀입니다. 장기 현장 계약을 선호하며 숙박·식사 제공 조건 우대합니다.',
 '{"vi":{"short":"Đội xây dựng dân dụng 4 người","long":"Đội gồm 4 thành viên chuyên về công trình dân dụng và đường ống"},"en":{"short":"Vietnamese Civil Works Team","long":"A 4-member team specializing in civil works and plumbing"}}',
 false,
 '[{"sido":"경기","sigungu":"수원시"},{"sido":"인천","sigungu":"서구"}]',
 '[]',
 700000, 1000000, 'DAILY',
 3, 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

SELECT setval('teams_id_seq', (SELECT MAX(id) FROM teams));

-- ─── 8. TEAM MEMBERS ──────────────────────────────────────────

INSERT INTO team_members (
    team_id, user_id, role,
    full_name, nationality, visa_type, health_check_status,
    invitation_status, invited_by, invited_at, joined_at
) VALUES
-- 팀 1: 김철수 건설팀
(1, 8, 'LEADER',  '김철수',      'KR', 'CITIZEN', 'COMPLETED', 'ACCEPTED', NULL, NULL,       NOW() - INTERVAL '90 days'),
(1, 1, 'MEMBER',  '응우옌 반 안', 'VN', 'E9',     'COMPLETED', 'ACCEPTED', 8,    NOW() - INTERVAL '85 days', NOW() - INTERVAL '80 days'),
(1, 2, 'MEMBER',  '쩐 민 호앙',   'VN', 'H2',     'NOT_DONE',  'ACCEPTED', 8,    NOW() - INTERVAL '80 days', NOW() - INTERVAL '75 days'),
(1, 6, 'MEMBER',  '장민준',       'KR', 'CITIZEN', 'NOT_DONE',  'ACCEPTED', 8,    NOW() - INTERVAL '60 days', NOW() - INTERVAL '55 days'),
(1, 4, 'MEMBER',  '팜 반 득',     'VN', 'H2',     'COMPLETED', 'ACCEPTED', 8,    NOW() - INTERVAL '50 days', NOW() - INTERVAL '45 days'),
-- 팀 2: 베트남 토목팀 (team_id=2, leader는 team_id=1과 동일한 user_id=8이지만 별도 팀으로)
(2, 8, 'LEADER',  '김철수',      'KR', 'CITIZEN', 'COMPLETED', 'ACCEPTED', NULL, NULL,       NOW() - INTERVAL '30 days'),
(2, 3, 'MEMBER',  '레 티 마이',   'VN', 'E9',     'NOT_DONE',  'ACCEPTED', 8,    NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days'),
(2, 5, 'MEMBER',  '도 티 흐엉',   'VN', 'E9',     'NOT_DONE',  'PENDING',  8,    NOW() - INTERVAL '3 days',  NOW() - INTERVAL '3 days')
ON CONFLICT (team_id, user_id) DO NOTHING;

-- ─── 9. APPLICATIONS ─────────────────────────────────────────

INSERT INTO applications (
    public_id, job_id, application_type, applicant_user_id, team_id,
    status, cover_letter, worker_snapshot, team_snapshot
) VALUES
-- 개인 지원
(uuid_generate_v4(), 1, 'INDIVIDUAL', 1, NULL,
 'APPLIED',
 '안녕하세요. 굴삭기 경력 5년 보유, 콘크리트 작업 경험도 있습니다. 열심히 하겠습니다.',
 '{"fullName":"응우옌 반 안","nationality":"VN","visaType":"E9","healthCheckStatus":"COMPLETED"}',
 NULL),

(uuid_generate_v4(), 2, 'INDIVIDUAL', 6, NULL,
 'UNDER_REVIEW',
 '콘크리트·철근 현장 7년 경력입니다. 꼼꼼하고 안전을 최우선으로 생각합니다.',
 '{"fullName":"장민준","nationality":"KR","visaType":"CITIZEN","healthCheckStatus":"NOT_DONE"}',
 NULL),

(uuid_generate_v4(), 4, 'INDIVIDUAL', 2, NULL,
 'APPLIED',
 '철근·비계 경력 5년입니다. 장기 근무 희망합니다.',
 '{"fullName":"쩐 민 호앙","nationality":"VN","visaType":"H2","healthCheckStatus":"NOT_DONE"}',
 NULL),

(uuid_generate_v4(), 5, 'INDIVIDUAL', 4, NULL,
 'SHORTLISTED',
 '크레인·건설안전기사 보유. 비계 작업도 가능합니다.',
 '{"fullName":"팜 반 득","nationality":"VN","visaType":"H2","healthCheckStatus":"COMPLETED"}',
 NULL),

-- 팀 지원
(uuid_generate_v4(), 4, 'TEAM', NULL, 1,
 'APPLIED',
 '5인 숙련 팀입니다. 콘크리트·철근 전문으로 즉시 투입 가능합니다.',
 '{}',
 '{"teamName":"김철수 건설팀","memberCount":5,"leaderName":"김철수"}')
;

-- ─── 10. EMPLOYER POINT ACCOUNTS ─────────────────────────────

INSERT INTO employer_point_accounts (user_id, balance, total_charged, total_used)
VALUES
(9,  5000, 10000, 5000),
(10, 3000,  5000, 2000),
(11, 1000,  1000,    0)
ON CONFLICT (user_id) DO NOTHING;
