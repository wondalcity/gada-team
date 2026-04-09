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
