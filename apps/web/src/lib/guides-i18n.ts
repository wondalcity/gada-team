import type { Locale } from "@/store/localeStore";

export const LOCALE_LABELS: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
  vi: "Tiếng Việt",
};

type GuideStrings = {
  backToGuides: string;
  guideListPath: string;
  guideAvailable: string;
  comingSoon: string;
  readGuide: string;
  preparing: string;
  preparingDesc: (name: string) => string;
  otherGuides: string;
  characteristics: string;
  skills: string;
  pricing: string;
  pricingNote: string;
  faq: string;
  toc: string;
  tocItems: Record<string, string>;
  readingTime: (min: number) => string;
  loadError: string;
  loadErrorSub: string;
  backToList: string;
  relatedJobs: string;
  viewMore: string;
  noJobs: string;
  countLabel: (total: number, available: number) => string;
  heroTitle: string;
  heroSub: string;
  typeGuide: string;
  noContent: string;
};

export const GUIDE_STRINGS: Record<Locale, GuideStrings> = {
  ko: {
    backToGuides: "가이드 목록",
    guideListPath: "가이드 목록",
    guideAvailable: "가이드 있음",
    comingSoon: "준비중",
    readGuide: "가이드 보기",
    preparing: "준비 중",
    preparingDesc: (name) => `곧 ${name} 직종 가이드를 제공할 예정입니다.`,
    otherGuides: "다른 가이드 보기",
    characteristics: "작업 특성",
    skills: "관련 기술",
    pricing: "일당/임금 참고",
    pricingNote: "참고 금액이며 실제와 다를 수 있습니다",
    faq: "자주 묻는 질문",
    toc: "목차",
    tocItems: {
      intro: "직종 소개",
      characteristics: "작업 특성",
      skills: "관련 기술",
      pricing: "임금 참고",
      faq: "자주 묻는 질문",
    },
    readingTime: (min) => `${min}분 읽기`,
    loadError: "가이드를 불러올 수 없어요",
    loadErrorSub: "잠시 후 다시 시도해 주세요.",
    backToList: "가이드 목록으로",
    relatedJobs: "이 직종 채용공고",
    viewMore: "더 보기",
    noJobs: "현재 모집 중인 공고가 없습니다",
    countLabel: (total, available) =>
      `${total}개 직종 · ${available}개 가이드 제공 중`,
    heroTitle: "건설 직종 가이드",
    heroSub: "GADA가 정리한 직종별 완벽 가이드. 작업 특성, 필요 기술, 임금 정보까지 한번에.",
    typeGuide: "직종 가이드",
    noContent: "가이드를 준비 중이에요",
  },
  en: {
    backToGuides: "Guide List",
    guideListPath: "Guide List",
    guideAvailable: "Guide Available",
    comingSoon: "Coming Soon",
    readGuide: "View Guide",
    preparing: "Preparing",
    preparingDesc: (name) => `A guide for ${name} will be available soon.`,
    otherGuides: "Browse Other Guides",
    characteristics: "Work Characteristics",
    skills: "Related Skills",
    pricing: "Wage Reference",
    pricingNote: "These are reference figures and may differ from actual wages",
    faq: "FAQ",
    toc: "Contents",
    tocItems: {
      intro: "Introduction",
      characteristics: "Work Characteristics",
      skills: "Related Skills",
      pricing: "Wage Reference",
      faq: "FAQ",
    },
    readingTime: (min) => `${min} min read`,
    loadError: "Unable to load guide",
    loadErrorSub: "Please try again later.",
    backToList: "Back to Guide List",
    relatedJobs: "Jobs in This Trade",
    viewMore: "View More",
    noJobs: "No open positions at the moment",
    countLabel: (total, available) =>
      `${total} trades · ${available} guides available`,
    heroTitle: "Construction Trade Guides",
    heroSub: "Complete guides for each trade by GADA — work characteristics, required skills, and wage info all in one place.",
    typeGuide: "Trade Guides",
    noContent: "Guide in preparation",
  },
  vi: {
    backToGuides: "Danh sách hướng dẫn",
    guideListPath: "Danh sách hướng dẫn",
    guideAvailable: "Có hướng dẫn",
    comingSoon: "Sắp ra mắt",
    readGuide: "Xem hướng dẫn",
    preparing: "Đang chuẩn bị",
    preparingDesc: (name) => `Hướng dẫn cho ngành ${name} sẽ sớm được cung cấp.`,
    otherGuides: "Xem hướng dẫn khác",
    characteristics: "Đặc điểm công việc",
    skills: "Kỹ năng liên quan",
    pricing: "Tham khảo lương",
    pricingNote: "Đây là mức tham khảo, có thể khác thực tế",
    faq: "Câu hỏi thường gặp",
    toc: "Mục lục",
    tocItems: {
      intro: "Giới thiệu",
      characteristics: "Đặc điểm công việc",
      skills: "Kỹ năng liên quan",
      pricing: "Tham khảo lương",
      faq: "Câu hỏi thường gặp",
    },
    readingTime: (min) => `${min} phút đọc`,
    loadError: "Không thể tải hướng dẫn",
    loadErrorSub: "Vui lòng thử lại sau.",
    backToList: "Quay lại danh sách",
    relatedJobs: "Việc làm ngành này",
    viewMore: "Xem thêm",
    noJobs: "Hiện không có vị trí tuyển dụng",
    countLabel: (total, available) =>
      `${total} ngành nghề · ${available} hướng dẫn có sẵn`,
    heroTitle: "Hướng dẫn ngành xây dựng",
    heroSub: "Hướng dẫn đầy đủ cho từng ngành nghề bởi GADA — đặc điểm công việc, kỹ năng cần thiết, và thông tin lương tất cả trong một.",
    typeGuide: "Hướng dẫn ngành nghề",
    noContent: "Đang chuẩn bị hướng dẫn",
  },
};

export function getCategoryName(
  cat: { nameKo: string; nameEn?: string | null; nameVi?: string | null },
  locale: Locale
): string {
  if (locale === "en" && cat.nameEn) return cat.nameEn;
  if (locale === "vi" && cat.nameVi) return cat.nameVi;
  return cat.nameKo;
}
