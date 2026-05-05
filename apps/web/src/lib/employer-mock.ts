/**
 * employer-mock.ts
 *
 * In-memory mock for all employer API calls.
 * Enabled when:
 *   - NEXT_PUBLIC_USE_EMPLOYER_MOCK=true  (build-time .env)
 *   - OR localStorage.gada_mock_employer === "1"  (runtime toggle)
 *
 * Enable from browser console:
 *   localStorage.setItem("gada_mock_employer", "1"); location.reload();
 *
 * Disable:
 *   localStorage.removeItem("gada_mock_employer"); location.reload();
 */

import type {
  CompanyResponse,
  SiteResponse,
  JobSummary,
  JobDetail,
  CategoryItem,
  ApplicationSummary,
  ApplicationDetail,
  ApplicationStatus,
  JobListResponse,
  ApplicationListResponse,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CreateSitePayload,
  UpdateSitePayload,
  CreateJobPayload,
} from "./employer-api";

// ─── Mock mode detection ─────────────────────────────────────────────────────

export function isMockMode(): boolean {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_USE_EMPLOYER_MOCK === "true";
  }
  return (
    localStorage.getItem("gada_mock_employer") === "1" ||
    process.env.NEXT_PUBLIC_USE_EMPLOYER_MOCK === "true"
  );
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_COMPANY: CompanyResponse = {
  publicId: "co-demo-001",
  name: "가다건설 주식회사",
  businessRegistrationNumber: "123-45-67890",
  ceoName: "이건설",
  address: "서울특별시 강남구 영동대로 714",
  phone: "02-555-8888",
  email: "hr@gadaconstruction.kr",
  websiteUrl: "https://gadaconstruction.kr",
  description:
    "가다건설은 베트남 건설 인력 전문 기업입니다. 철근, 형틀, 콘크리트 등 다양한 분야의 숙련공을 보유하고 있으며, 체계적인 현장 관리와 근로자 복지를 최우선으로 합니다.",
  logoUrl: undefined,
  status: "ACTIVE",
  isVerified: true,
  siteCount: 3,
  activeJobCount: 3,
  createdAt: "2024-01-15T09:00:00Z",
};

const SEED_SITES: SiteResponse[] = [
  {
    publicId: "site-demo-001",
    companyPublicId: "co-demo-001",
    companyName: "가다건설 주식회사",
    name: "강남 센트럴파크 주상복합 신축공사",
    address: "서울특별시 강남구 삼성동 158-27",
    addressDetail: "GS건설 현장사무소",
    description:
      "지상 45층, 지하 5층 규모의 주상복합 신축 공사입니다. 철근, 형틀, 콘크리트 분야 인원 모집 중입니다.",
    status: "ACTIVE",
    sido: "서울특별시",
    sigungu: "강남구",
    activeJobCount: 2,
    startDate: "2024-03-01",
    endDate: "2025-12-31",
    createdAt: "2024-02-20T10:00:00Z",
  },
  {
    publicId: "site-demo-002",
    companyPublicId: "co-demo-001",
    companyName: "가다건설 주식회사",
    name: "부산 해운대 마린시티 리모델링",
    address: "부산광역시 해운대구 우동 1480",
    addressDetail: undefined,
    description:
      "마린시티 상업시설 전체 리모델링 공사. 콘크리트, 도장 분야 팀 모집.",
    status: "ACTIVE",
    sido: "부산광역시",
    sigungu: "해운대구",
    activeJobCount: 1,
    startDate: "2024-06-01",
    endDate: "2025-06-30",
    createdAt: "2024-05-10T09:00:00Z",
  },
  {
    publicId: "site-demo-003",
    companyPublicId: "co-demo-001",
    companyName: "가다건설 주식회사",
    name: "인천 송도 스마트물류센터 신축",
    address: "인천광역시 연수구 송도동 첨단대로 236",
    addressDetail: undefined,
    description:
      "연면적 85,000㎡ 규모의 첨단 물류센터 신축 공사. 전기, 철골 분야 인원 사전 모집.",
    status: "PLANNING",
    sido: "인천광역시",
    sigungu: "연수구",
    activeJobCount: 0,
    startDate: "2025-01-01",
    endDate: "2026-06-30",
    createdAt: "2024-11-01T09:00:00Z",
  },
];

const SEED_JOBS: JobDetail[] = [
  {
    publicId: "job-demo-001",
    title: "철근 배근 반장 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-001",
    siteName: "강남 센트럴파크 주상복합 신축공사",
    sido: "서울특별시",
    sigungu: "강남구",
    categoryId: 1,
    categoryName: "철근공",
    payMin: 250000,
    payMax: 300000,
    payUnit: "DAY",
    requiredCount: 5,
    applicationTypes: ["INDIVIDUAL", "TEAM"],
    accommodationProvided: true,
    mealProvided: true,
    transportationProvided: false,
    status: "PUBLISHED",
    alwaysOpen: false,
    startDate: "2024-04-01",
    endDate: "2025-06-30",
    viewCount: 245,
    applicationCount: 6,
    createdAt: "2024-03-15T10:00:00Z",
    description:
      "강남 대형 주상복합 공사 현장에서 철근 배근 작업을 담당할 반장급 기술자를 모집합니다. E-9, H-2 비자 가능. 숙식 제공.",
    visaRequirements: ["E-9", "H-2"],
    certificationRequirements: [],
    healthCheckRequired: true,
  },
  {
    publicId: "job-demo-002",
    title: "형틀목공 경력 3년 이상 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-001",
    siteName: "강남 센트럴파크 주상복합 신축공사",
    sido: "서울특별시",
    sigungu: "강남구",
    categoryId: 2,
    categoryName: "형틀목공",
    payMin: 230000,
    payMax: 280000,
    payUnit: "DAY",
    requiredCount: 3,
    applicationTypes: ["INDIVIDUAL"],
    accommodationProvided: false,
    mealProvided: true,
    transportationProvided: false,
    status: "PUBLISHED",
    alwaysOpen: false,
    startDate: "2024-04-15",
    endDate: "2025-03-31",
    viewCount: 183,
    applicationCount: 2,
    createdAt: "2024-03-20T11:00:00Z",
    description:
      "형틀목공 경력 3년 이상인 분을 모집합니다. 한식 중식 제공. 주 5일 근무 기준.",
    visaRequirements: ["E-9", "H-2", "F-4"],
    certificationRequirements: [],
    healthCheckRequired: false,
  },
  {
    publicId: "job-demo-003",
    title: "콘크리트 타설 전문팀 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-002",
    siteName: "부산 해운대 마린시티 리모델링",
    sido: "부산광역시",
    sigungu: "해운대구",
    categoryId: 3,
    categoryName: "콘크리트공",
    payMin: undefined,
    payMax: undefined,
    payUnit: "NEGOTIATE",
    requiredCount: 8,
    applicationTypes: ["TEAM", "COMPANY"],
    accommodationProvided: true,
    mealProvided: true,
    transportationProvided: true,
    status: "PUBLISHED",
    alwaysOpen: true,
    startDate: undefined,
    endDate: undefined,
    viewCount: 98,
    applicationCount: 2,
    createdAt: "2024-06-15T09:00:00Z",
    description:
      "부산 해운대 대형 리모델링 공사. 콘크리트 타설 경험 있는 팀 또는 기업 담당자 전체 모집. 단가 협의 가능. 숙식·교통 지원.",
    visaRequirements: ["E-9", "H-2"],
    certificationRequirements: ["콘크리트기능사"],
    healthCheckRequired: true,
  },
  {
    publicId: "job-demo-004",
    title: "도장 작업 인부 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-002",
    siteName: "부산 해운대 마린시티 리모델링",
    sido: "부산광역시",
    sigungu: "해운대구",
    categoryId: 5,
    categoryName: "도장공",
    payMin: 200000,
    payMax: 220000,
    payUnit: "DAY",
    requiredCount: 2,
    applicationTypes: ["INDIVIDUAL"],
    accommodationProvided: false,
    mealProvided: false,
    transportationProvided: false,
    status: "PAUSED",
    alwaysOpen: false,
    startDate: "2024-08-01",
    endDate: "2024-12-31",
    viewCount: 54,
    applicationCount: 2,
    createdAt: "2024-07-01T09:00:00Z",
    description: "내·외부 도장 작업 인부 모집. 경력자 우대.",
    visaRequirements: ["E-9"],
    certificationRequirements: [],
    healthCheckRequired: false,
  },
  {
    publicId: "job-demo-005",
    title: "전기 배선 전문가 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-003",
    siteName: "인천 송도 스마트물류센터 신축",
    sido: "인천광역시",
    sigungu: "연수구",
    categoryId: 6,
    categoryName: "전기공",
    payMin: 280000,
    payMax: 320000,
    payUnit: "DAY",
    requiredCount: 4,
    applicationTypes: ["INDIVIDUAL", "TEAM"],
    accommodationProvided: false,
    mealProvided: false,
    transportationProvided: false,
    status: "DRAFT",
    alwaysOpen: false,
    startDate: "2025-02-01",
    endDate: "2026-03-31",
    viewCount: 0,
    applicationCount: 0,
    createdAt: "2024-12-01T09:00:00Z",
    description: "(임시저장) 전기 배선 및 설비 전문가 사전 모집. 전기기능사 자격 우대.",
    visaRequirements: ["E-9", "H-2"],
    certificationRequirements: ["전기기능사"],
    healthCheckRequired: false,
  },
  {
    publicId: "job-demo-006",
    title: "철골 용접 기술자 모집",
    companyName: "가다건설 주식회사",
    sitePublicId: "site-demo-001",
    siteName: "강남 센트럴파크 주상복합 신축공사",
    sido: "서울특별시",
    sigungu: "강남구",
    categoryId: 4,
    categoryName: "용접공",
    payMin: 270000,
    payMax: 310000,
    payUnit: "DAY",
    requiredCount: 2,
    applicationTypes: ["INDIVIDUAL"],
    accommodationProvided: true,
    mealProvided: true,
    transportationProvided: false,
    status: "CLOSED",
    alwaysOpen: false,
    startDate: "2024-01-01",
    endDate: "2024-06-30",
    viewCount: 312,
    applicationCount: 4,
    createdAt: "2023-12-15T09:00:00Z",
    description: "철골 구조물 용접 기술자 모집 (마감됨).",
    visaRequirements: ["E-9"],
    certificationRequirements: ["용접기능사"],
    healthCheckRequired: true,
  },
];

// Applications — per job
const SEED_APPLICATIONS: Record<string, ApplicationDetail[]> = {
  "job-demo-001": [
    {
      publicId: "app-demo-001",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "HIRED",
      statusUpdatedAt: "2024-04-20T14:30:00Z",
      isScouted: false,
      isVerified: true,
      appliedAt: "2024-04-01T09:00:00Z",
      coverLetter:
        "철근 배근 경력 8년입니다. 한국 현장 경험 다수 있으며 반장 업무도 수행한 바 있습니다. 성실히 일하겠습니다.",
      employerNote: "기술 우수. 즉시 채용 결정.",
      workerSnapshot: {
        fullName: "Nguyễn Văn An",
        birthDate: "1988-05-12",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        profileImageUrl: undefined,
        languages: [
          { code: "vi", level: "NATIVE" },
          { code: "ko", level: "INTERMEDIATE" },
        ],
        desiredPayMin: 250000,
        desiredPayMax: 300000,
        desiredPayUnit: "DAY",
        phone: "010-1234-5678",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-01T09:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-03T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "SHORTLISTED", createdAt: "2024-04-08T11:00:00Z" },
        { fromStatus: "SHORTLISTED", toStatus: "HIRED", note: "즉시 채용", createdAt: "2024-04-20T14:30:00Z" },
      ],
    },
    {
      publicId: "app-demo-002",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "SHORTLISTED",
      statusUpdatedAt: "2024-04-10T09:00:00Z",
      isScouted: true,
      isVerified: true,
      appliedAt: "2024-04-02T14:00:00Z",
      coverLetter: "철근 배근 경력 6년. 현장 안전관리사 자격 보유.",
      employerNote: "2순위 후보",
      workerSnapshot: {
        fullName: "Phạm Văn Đức",
        birthDate: "1991-09-23",
        nationality: "VN",
        visaType: "H-2",
        healthCheckStatus: "VALID",
        profileImageUrl: undefined,
        languages: [{ code: "vi", level: "NATIVE" }, { code: "ko", level: "BASIC" }],
        desiredPayMin: 240000,
        desiredPayMax: 280000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-02T14:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-05T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "SHORTLISTED", createdAt: "2024-04-10T09:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-003",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "TEAM",
      status: "UNDER_REVIEW",
      statusUpdatedAt: "2024-04-06T11:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-04-03T08:30:00Z",
      coverLetter: "VN철근팀은 총 7명으로 구성된 전문 철근팀입니다. 팀 단위 투입 가능합니다.",
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Trần Đình Minh",
        birthDate: "1985-03-07",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: {
        name: "VN철근팀",
        type: "SQUAD",
        description: "베트남 출신 철근 전문팀. 반장 포함 7명.",
        memberCount: 7,
      },
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-03T08:30:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-06T11:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-004",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "APPLIED",
      statusUpdatedAt: "2024-04-12T16:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-04-12T16:00:00Z",
      coverLetter: undefined,
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Lê Văn Hùng",
        birthDate: "1993-11-15",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "EXPIRED",
        languages: [{ code: "vi", level: "NATIVE" }],
        desiredPayMin: 230000,
        desiredPayMax: 260000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-12T16:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-005",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "REJECTED",
      statusUpdatedAt: "2024-04-09T15:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-04-04T10:00:00Z",
      coverLetter: "경력 2년 철근공입니다.",
      employerNote: "경력 부족",
      workerSnapshot: {
        fullName: "Bùi Thị Thu",
        birthDate: "1998-07-20",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-04T10:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-06T09:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "REJECTED", note: "경력 부족으로 불합격", createdAt: "2024-04-09T15:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-006",
      jobTitle: "철근 배근 반장 모집",
      jobPublicId: "job-demo-001",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "INTERVIEW_PENDING",
      statusUpdatedAt: "2024-04-15T10:00:00Z",
      isScouted: false,
      isVerified: true,
      appliedAt: "2024-04-07T09:00:00Z",
      coverLetter: "반장 경력 4년. 안전관리 교육 이수.",
      employerNote: "면접 예정 4/20",
      workerSnapshot: {
        fullName: "Nguyễn Văn Bình",
        birthDate: "1987-02-14",
        nationality: "VN",
        visaType: "H-2",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }, { code: "ko", level: "INTERMEDIATE" }],
        desiredPayMin: 260000,
        desiredPayMax: 300000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-07T09:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-09T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "SHORTLISTED", createdAt: "2024-04-12T14:00:00Z" },
        { fromStatus: "SHORTLISTED", toStatus: "INTERVIEW_PENDING", note: "4월 20일 면접 예정", createdAt: "2024-04-15T10:00:00Z" },
      ],
    },
  ],
  "job-demo-002": [
    {
      publicId: "app-demo-007",
      jobTitle: "형틀목공 경력 3년 이상 모집",
      jobPublicId: "job-demo-002",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "APPLIED",
      statusUpdatedAt: "2024-04-25T13:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-04-25T13:00:00Z",
      coverLetter: "형틀목공 경력 5년입니다. 고층 건물 작업 경험 있습니다.",
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Vũ Văn Tài",
        birthDate: "1990-06-18",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }, { code: "ko", level: "BASIC" }],
        desiredPayMin: 240000,
        desiredPayMax: 270000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-25T13:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-008",
      jobTitle: "형틀목공 경력 3년 이상 모집",
      jobPublicId: "job-demo-002",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "UNDER_REVIEW",
      statusUpdatedAt: "2024-04-28T11:00:00Z",
      isScouted: false,
      isVerified: true,
      appliedAt: "2024-04-23T09:00:00Z",
      coverLetter: undefined,
      employerNote: "서류 검토 중",
      workerSnapshot: {
        fullName: "Đặng Văn Long",
        birthDate: "1986-12-03",
        nationality: "VN",
        visaType: "H-2",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }, { code: "ko", level: "BASIC" }],
        desiredPayMin: 250000,
        desiredPayMax: 280000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-04-23T09:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-04-28T11:00:00Z" },
      ],
    },
  ],
  "job-demo-003": [
    {
      publicId: "app-demo-009",
      jobTitle: "콘크리트 타설 전문팀 모집",
      jobPublicId: "job-demo-003",
      companyName: "가다건설 주식회사",
      applicationType: "TEAM",
      status: "APPLIED",
      statusUpdatedAt: "2024-07-10T10:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-07-10T10:00:00Z",
      coverLetter: "콘크리트전문팀입니다. 타설 경험 10년 이상 팀원 구성. 단가 협의 가능합니다.",
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Hoàng Văn Quang",
        birthDate: "1982-04-22",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: {
        name: "콘크리트전문팀",
        type: "SQUAD",
        description: "콘크리트 타설·양생 전문팀. 콘크리트기능사 2명 포함.",
        memberCount: 9,
      },
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-07-10T10:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-010",
      jobTitle: "콘크리트 타설 전문팀 모집",
      jobPublicId: "job-demo-003",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "ON_HOLD",
      statusUpdatedAt: "2024-07-20T14:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-07-08T11:00:00Z",
      coverLetter: undefined,
      employerNote: "비자 만료 확인 필요. 보류.",
      workerSnapshot: {
        fullName: "Lý Văn Phúc",
        birthDate: "1994-08-30",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
        desiredPayMin: 220000,
        desiredPayMax: 250000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-07-08T11:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-07-12T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "ON_HOLD", note: "비자 만료 여부 확인 중", createdAt: "2024-07-20T14:00:00Z" },
      ],
    },
  ],
  "job-demo-004": [
    {
      publicId: "app-demo-011",
      jobTitle: "도장 작업 인부 모집",
      jobPublicId: "job-demo-004",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "APPLIED",
      statusUpdatedAt: "2024-08-05T09:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-08-05T09:00:00Z",
      coverLetter: "도장 경력 4년. 내·외부 도장 가능.",
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Phan Văn Tùng",
        birthDate: "1992-01-10",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
        desiredPayMin: 200000,
        desiredPayMax: 220000,
        desiredPayUnit: "DAY",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-08-05T09:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-012",
      jobTitle: "도장 작업 인부 모집",
      jobPublicId: "job-demo-004",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "APPLIED",
      statusUpdatedAt: "2024-08-06T14:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-08-06T14:00:00Z",
      coverLetter: undefined,
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Trương Văn Lộc",
        birthDate: "1995-03-25",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-08-06T14:00:00Z" },
      ],
    },
  ],
  "job-demo-006": [
    {
      publicId: "app-demo-013",
      jobTitle: "철골 용접 기술자 모집",
      jobPublicId: "job-demo-006",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "HIRED",
      statusUpdatedAt: "2024-02-01T10:00:00Z",
      isScouted: false,
      isVerified: true,
      appliedAt: "2024-01-05T09:00:00Z",
      coverLetter: "용접기능사 자격 보유, 철골 용접 7년 경력입니다.",
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Đinh Văn Sơn",
        birthDate: "1984-10-15",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }, { code: "ko", level: "INTERMEDIATE" }],
        phone: "010-9876-5432",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-01-05T09:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-01-10T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "SHORTLISTED", createdAt: "2024-01-20T14:00:00Z" },
        { fromStatus: "SHORTLISTED", toStatus: "HIRED", createdAt: "2024-02-01T10:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-014",
      jobTitle: "철골 용접 기술자 모집",
      jobPublicId: "job-demo-006",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "HIRED",
      statusUpdatedAt: "2024-02-01T10:00:00Z",
      isScouted: false,
      isVerified: true,
      appliedAt: "2024-01-06T09:00:00Z",
      coverLetter: undefined,
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Ngô Văn Thắng",
        birthDate: "1988-07-22",
        nationality: "VN",
        visaType: "H-2",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
        phone: "010-1111-2222",
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-01-06T09:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "SHORTLISTED", createdAt: "2024-01-18T09:00:00Z" },
        { fromStatus: "SHORTLISTED", toStatus: "HIRED", createdAt: "2024-02-01T10:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-015",
      jobTitle: "철골 용접 기술자 모집",
      jobPublicId: "job-demo-006",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "REJECTED",
      statusUpdatedAt: "2024-01-25T11:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-01-10T11:00:00Z",
      coverLetter: "용접 경력 3년.",
      employerNote: "용접기능사 미보유",
      workerSnapshot: {
        fullName: "Cao Văn Hải",
        birthDate: "1996-05-08",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-01-10T11:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "UNDER_REVIEW", createdAt: "2024-01-18T10:00:00Z" },
        { fromStatus: "UNDER_REVIEW", toStatus: "REJECTED", note: "자격증 미보유", createdAt: "2024-01-25T11:00:00Z" },
      ],
    },
    {
      publicId: "app-demo-016",
      jobTitle: "철골 용접 기술자 모집",
      jobPublicId: "job-demo-006",
      companyName: "가다건설 주식회사",
      applicationType: "INDIVIDUAL",
      status: "WITHDRAWN",
      statusUpdatedAt: "2024-01-22T14:00:00Z",
      isScouted: false,
      isVerified: false,
      appliedAt: "2024-01-08T14:00:00Z",
      coverLetter: undefined,
      employerNote: undefined,
      workerSnapshot: {
        fullName: "Trinh Văn Nam",
        birthDate: "1991-09-17",
        nationality: "VN",
        visaType: "E-9",
        healthCheckStatus: "VALID",
        languages: [{ code: "vi", level: "NATIVE" }],
      },
      teamSnapshot: undefined,
      statusHistory: [
        { fromStatus: undefined, toStatus: "APPLIED", createdAt: "2024-01-08T14:00:00Z" },
        { fromStatus: "APPLIED", toStatus: "WITHDRAWN", createdAt: "2024-01-22T14:00:00Z" },
      ],
    },
  ],
};

const SEED_CATEGORIES: CategoryItem[] = [
  { id: 1, code: "REBAR", nameKo: "철근공", nameVi: "Thợ sắt" },
  { id: 2, code: "FORMWORK", nameKo: "형틀목공", nameVi: "Thợ ván khuôn" },
  { id: 3, code: "CONCRETE", nameKo: "콘크리트공", nameVi: "Thợ bê tông" },
  { id: 4, code: "WELDING", nameKo: "용접공", nameVi: "Thợ hàn" },
  { id: 5, code: "PAINTING", nameKo: "도장공", nameVi: "Thợ sơn" },
  { id: 6, code: "ELECTRICAL", nameKo: "전기공", nameVi: "Thợ điện" },
  { id: 7, code: "PLUMBING", nameKo: "배관공", nameVi: "Thợ ống nước" },
  { id: 8, code: "TILE", nameKo: "타일공", nameVi: "Thợ gạch" },
  { id: 9, code: "MASONRY", nameKo: "미장공", nameVi: "Thợ trát" },
  { id: 10, code: "WATERPROOF", nameKo: "방수공", nameVi: "Thợ chống thấm" },
];

// ─── Mutable in-memory store ──────────────────────────────────────────────────

type Store = {
  company: CompanyResponse | null;
  sites: SiteResponse[];
  jobs: JobDetail[];
  applications: Record<string, ApplicationDetail[]>;
  initialized: boolean;
};

const store: Store = {
  company: null,
  sites: [],
  jobs: [],
  applications: {},
  initialized: false,
};

function ensureInit() {
  if (store.initialized) return;
  store.company = { ...SEED_COMPANY };
  store.sites = SEED_SITES.map((s) => ({ ...s }));
  store.jobs = SEED_JOBS.map((j) => ({ ...j }));
  // Deep copy applications
  for (const [jobId, apps] of Object.entries(SEED_APPLICATIONS)) {
    store.applications[jobId] = apps.map((a) => ({
      ...a,
      workerSnapshot: { ...a.workerSnapshot },
      statusHistory: a.statusHistory.map((h) => ({ ...h })),
      teamSnapshot: a.teamSnapshot ? { ...a.teamSnapshot } : undefined,
    }));
  }
  store.initialized = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay<T>(data: T, ms = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function notFound(msg = "Not found"): never {
  const err = new Error(msg);
  (err as any).status = 404;
  throw err;
}

function toSummary(detail: ApplicationDetail): ApplicationSummary {
  return {
    publicId: detail.publicId,
    jobTitle: detail.jobTitle,
    jobPublicId: detail.jobPublicId,
    companyName: detail.companyName,
    applicationType: detail.applicationType,
    status: detail.status,
    statusUpdatedAt: detail.statusUpdatedAt,
    isScouted: detail.isScouted,
    isVerified: detail.isVerified,
    appliedAt: detail.appliedAt,
  };
}

function extractSido(address: string): string | undefined {
  const REGIONS = [
    "서울특별시", "부산광역시", "대구광역시", "인천광역시",
    "광주광역시", "대전광역시", "울산광역시", "세종특별자치시",
    "경기도", "강원도", "충청북도", "충청남도", "전라북도",
    "전라남도", "경상북도", "경상남도", "제주특별자치도",
  ];
  return REGIONS.find((r) => address.includes(r));
}

function recalcCompanyStats() {
  if (!store.company) return;
  store.company.siteCount = store.sites.length;
  store.company.activeJobCount = store.jobs.filter(
    (j) => j.status === "PUBLISHED"
  ).length;
}

function recalcSiteJobCount() {
  for (const site of store.sites) {
    site.activeJobCount = store.jobs.filter(
      (j) => j.sitePublicId === site.publicId && j.status === "PUBLISHED"
    ).length;
  }
}

// ─── Mock API ─────────────────────────────────────────────────────────────────

export const mockEmployerApi = {
  // ── Company ────────────────────────────────────────────────────────────────

  getMyCompany: (): Promise<CompanyResponse> => {
    ensureInit();
    if (!store.company) notFound("Company not found");
    return delay({ ...store.company });
  },

  createCompany: (payload: CreateCompanyPayload): Promise<CompanyResponse> => {
    ensureInit();
    store.company = {
      publicId: `co-${Date.now()}`,
      name: payload.name,
      businessRegistrationNumber: payload.businessRegistrationNumber,
      ceoName: payload.ceoName,
      address: payload.address,
      phone: payload.phone,
      email: payload.email,
      websiteUrl: payload.websiteUrl,
      description: payload.description,
      logoUrl: undefined,
      status: "ACTIVE",
      isVerified: false,
      siteCount: 0,
      activeJobCount: 0,
      createdAt: new Date().toISOString(),
    };
    return delay({ ...store.company });
  },

  updateMyCompany: (
    _publicId: string,
    payload: UpdateCompanyPayload
  ): Promise<CompanyResponse> => {
    ensureInit();
    if (!store.company) notFound("Company not found");
    Object.assign(store.company, payload);
    return delay({ ...store.company });
  },

  // ── Sites ──────────────────────────────────────────────────────────────────

  getMySites: (_companyPublicId: string): Promise<SiteResponse[]> => {
    ensureInit();
    return delay(store.sites.map((s) => ({ ...s })));
  },

  getSite: (
    _companyPublicId: string,
    sitePublicId: string
  ): Promise<SiteResponse> => {
    ensureInit();
    const site = store.sites.find((s) => s.publicId === sitePublicId);
    if (!site) notFound("Site not found");
    return delay({ ...site });
  },

  createSite: (
    companyPublicId: string,
    payload: CreateSitePayload
  ): Promise<SiteResponse> => {
    ensureInit();
    const newSite: SiteResponse = {
      publicId: `site-${Date.now()}`,
      companyPublicId,
      companyName: store.company?.name ?? "",
      name: payload.name,
      address: payload.address,
      addressDetail: payload.addressDetail,
      description: payload.description,
      status: "PLANNING",
      sido: extractSido(payload.address),
      sigungu: undefined,
      activeJobCount: 0,
      startDate: payload.startDate,
      endDate: payload.endDate,
      createdAt: new Date().toISOString(),
    };
    store.sites.push(newSite);
    recalcCompanyStats();
    return delay({ ...newSite });
  },

  updateSite: (
    _companyPublicId: string,
    sitePublicId: string,
    payload: UpdateSitePayload
  ): Promise<SiteResponse> => {
    ensureInit();
    const site = store.sites.find((s) => s.publicId === sitePublicId);
    if (!site) notFound("Site not found");
    Object.assign(site, payload);
    if (payload.address) site.sido = extractSido(payload.address);
    return delay({ ...site });
  },

  deleteSite: (_companyPublicId: string, sitePublicId: string): Promise<void> => {
    ensureInit();
    const idx = store.sites.findIndex((s) => s.publicId === sitePublicId);
    if (idx === -1) return notFound("Site not found");
    store.sites.splice(idx, 1);
    recalcCompanyStats();
    return new Promise<void>((resolve) => setTimeout(resolve, 150));
  },

  // ── Jobs ───────────────────────────────────────────────────────────────────

  getMyJobs: (page = 0, size = 20): Promise<JobListResponse> => {
    ensureInit();
    const total = store.jobs.length;
    const content = store.jobs.slice(page * size, (page + 1) * size);
    return delay({
      content: content.map((j) => ({ ...j })),
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      isFirst: page === 0,
      isLast: (page + 1) * size >= total,
    });
  },

  getJobDetail: (publicId: string): Promise<JobDetail> => {
    ensureInit();
    const job = store.jobs.find((j) => j.publicId === publicId);
    if (!job) notFound("Job not found");
    return delay({ ...job });
  },

  createJob: (payload: CreateJobPayload): Promise<JobDetail> => {
    ensureInit();
    const site = store.sites.find((s) => s.publicId === payload.sitePublicId);
    const newJob: JobDetail = {
      publicId: `job-${Date.now()}`,
      title: payload.title,
      companyName: store.company?.name ?? "",
      sitePublicId: payload.sitePublicId,
      siteName: site?.name ?? "",
      sido: site?.sido,
      sigungu: site?.sigungu,
      categoryId: payload.jobCategoryId,
      categoryName: SEED_CATEGORIES.find((c) => c.id === payload.jobCategoryId)?.nameKo,
      payMin: payload.payMin,
      payMax: payload.payMax,
      payUnit: payload.payUnit ?? "DAY",
      requiredCount: payload.requiredCount ?? 1,
      applicationTypes: payload.applicationTypes ?? ["INDIVIDUAL"],
      accommodationProvided: payload.accommodationProvided ?? false,
      mealProvided: payload.mealProvided ?? false,
      transportationProvided: payload.transportationProvided ?? false,
      status: "DRAFT",
      alwaysOpen: payload.alwaysOpen ?? false,
      startDate: payload.startDate,
      endDate: payload.endDate,
      viewCount: 0,
      applicationCount: 0,
      createdAt: new Date().toISOString(),
      description: payload.description,
      visaRequirements: payload.visaRequirements ?? [],
      certificationRequirements: payload.certificationRequirements ?? [],
      healthCheckRequired: payload.healthCheckRequired ?? false,
    };
    store.jobs.unshift(newJob);
    recalcSiteJobCount();
    recalcCompanyStats();
    return delay({ ...newJob });
  },

  updateJob: (
    publicId: string,
    payload: Partial<CreateJobPayload>
  ): Promise<JobDetail> => {
    ensureInit();
    const job = store.jobs.find((j) => j.publicId === publicId);
    if (!job) notFound("Job not found");
    if (payload.title !== undefined) job.title = payload.title;
    if (payload.description !== undefined) job.description = payload.description;
    if (payload.jobCategoryId !== undefined) {
      job.categoryId = payload.jobCategoryId;
      job.categoryName = SEED_CATEGORIES.find((c) => c.id === payload.jobCategoryId)?.nameKo;
    }
    if (payload.sitePublicId !== undefined) {
      const site = store.sites.find((s) => s.publicId === payload.sitePublicId);
      job.sitePublicId = payload.sitePublicId;
      job.siteName = site?.name ?? "";
      job.sido = site?.sido;
      job.sigungu = site?.sigungu;
    }
    if (payload.requiredCount !== undefined) job.requiredCount = payload.requiredCount;
    if (payload.applicationTypes !== undefined) job.applicationTypes = payload.applicationTypes;
    if (payload.payMin !== undefined) job.payMin = payload.payMin;
    if (payload.payMax !== undefined) job.payMax = payload.payMax;
    if (payload.payUnit !== undefined) job.payUnit = payload.payUnit;
    if (payload.accommodationProvided !== undefined) job.accommodationProvided = payload.accommodationProvided;
    if (payload.mealProvided !== undefined) job.mealProvided = payload.mealProvided;
    if (payload.transportationProvided !== undefined) job.transportationProvided = payload.transportationProvided;
    if (payload.alwaysOpen !== undefined) job.alwaysOpen = payload.alwaysOpen;
    if (payload.startDate !== undefined) job.startDate = payload.startDate;
    if (payload.endDate !== undefined) job.endDate = payload.endDate;
    if (payload.visaRequirements !== undefined) job.visaRequirements = payload.visaRequirements;
    if (payload.certificationRequirements !== undefined) job.certificationRequirements = payload.certificationRequirements;
    if (payload.healthCheckRequired !== undefined) job.healthCheckRequired = payload.healthCheckRequired;
    recalcSiteJobCount();
    recalcCompanyStats();
    return delay({ ...job });
  },

  patchJobStatus: (publicId: string, status: string): Promise<JobDetail> => {
    ensureInit();
    const job = store.jobs.find((j) => j.publicId === publicId);
    if (!job) notFound("Job not found");
    job.status = status;
    recalcSiteJobCount();
    recalcCompanyStats();
    return delay({ ...job });
  },

  deleteJob: (publicId: string): Promise<void> => {
    ensureInit();
    const idx = store.jobs.findIndex((j) => j.publicId === publicId);
    if (idx === -1) return notFound("Job not found");
    store.jobs.splice(idx, 1);
    recalcSiteJobCount();
    recalcCompanyStats();
    return new Promise<void>((resolve) => setTimeout(resolve, 150));
  },

  // ── Categories ─────────────────────────────────────────────────────────────

  getCategories: (): Promise<CategoryItem[]> => {
    return delay([...SEED_CATEGORIES]);
  },

  // ── Applications ───────────────────────────────────────────────────────────

  getJobApplications: (
    jobPublicId: string,
    status?: string,
    page = 0,
    size = 20
  ): Promise<ApplicationListResponse> => {
    ensureInit();
    const allApps = store.applications[jobPublicId] ?? [];
    const filtered = status
      ? allApps.filter((a) => a.status === status)
      : allApps;
    const total = filtered.length;
    const content = filtered
      .slice(page * size, (page + 1) * size)
      .map(toSummary);
    return delay({
      content,
      page,
      size,
      totalElements: total,
      totalPages: Math.ceil(total / size),
    });
  },

  getApplicationDetail: (appPublicId: string): Promise<ApplicationDetail> => {
    ensureInit();
    for (const apps of Object.values(store.applications)) {
      const found = apps.find((a) => a.publicId === appPublicId);
      if (found) return delay({ ...found, workerSnapshot: { ...found.workerSnapshot } });
    }
    return notFound("Application not found");
  },

  updateApplicationStatus: (
    appPublicId: string,
    newStatus: string,
    note?: string
  ): Promise<ApplicationDetail> => {
    ensureInit();
    for (const apps of Object.values(store.applications)) {
      const app = apps.find((a) => a.publicId === appPublicId);
      if (app) {
        const prevStatus = app.status;
        app.status = newStatus as ApplicationStatus;
        app.statusUpdatedAt = new Date().toISOString();
        app.statusHistory.push({
          fromStatus: prevStatus,
          toStatus: newStatus,
          note,
          createdAt: new Date().toISOString(),
        });
        // Update applicationCount on job
        const job = store.jobs.find((j) => j.publicId === app.jobPublicId);
        if (job) {
          const jobApps = store.applications[job.publicId] ?? [];
          job.applicationCount = jobApps.filter(
            (a) => !["WITHDRAWN", "REJECTED"].includes(a.status)
          ).length;
        }
        return delay({ ...app, workerSnapshot: { ...app.workerSnapshot } });
      }
    }
    return notFound("Application not found");
  },

  scoutApplicant: (appPublicId: string): Promise<ApplicationDetail> => {
    ensureInit();
    for (const apps of Object.values(store.applications)) {
      const app = apps.find((a) => a.publicId === appPublicId);
      if (app) {
        app.isScouted = true;
        return delay({ ...app, workerSnapshot: { ...app.workerSnapshot } });
      }
    }
    return notFound("Application not found");
  },
};

// ─── Mock EMPLOYER user (for demo mode auth bypass) ───────────────────────────

export const MOCK_EMPLOYER_USER = {
  userId: 9001,
  phone: "010-0000-0000",
  role: "EMPLOYER" as const,
  status: "ACTIVE" as const,
  isNewUser: false,
};
