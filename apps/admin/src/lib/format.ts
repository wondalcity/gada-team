/** 날짜+시각 표시 (생성일, 수정일 등 타임스탬프용) */
export function fmtDatetime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 날짜만 표시 (계약기간 시작/종료일 등 date 필드용) */
export function fmtDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
