"use client";

import * as React from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft,
  User,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Star,
  AlertCircle,
  Phone,
  Lock,
} from "lucide-react";
import { employerApi, ApplicationSummary, ApplicationDetail, ApplicationStatus } from "@/lib/employer-api";
import { contractsApi, type ContractDetail, type ContractTemplateResponse } from "@/lib/contracts-api";
import { ClipboardSignature, ExternalLink, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DateInput } from "@/components/ui/DateInput";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { className: string; icon?: React.ReactNode }> = {
  APPLIED:           { className: "bg-primary-50 text-primary-700",     icon: <Clock className="h-3 w-3" /> },
  UNDER_REVIEW:      { className: "bg-warning-50 text-warning-700",     icon: <Eye className="h-3 w-3" /> },
  SHORTLISTED:       { className: "bg-secondary-50 text-secondary-600", icon: <Star className="h-3 w-3" /> },
  INTERVIEW_PENDING: { className: "bg-secondary-50 text-secondary-600", icon: <Clock className="h-3 w-3" /> },
  ON_HOLD:           { className: "bg-neutral-100 text-neutral-500" },
  REJECTED:          { className: "bg-danger-50 text-danger-700",       icon: <XCircle className="h-3 w-3" /> },
  HIRED:             { className: "bg-success-50 text-success-700",     icon: <CheckCircle2 className="h-3 w-3" /> },
  WITHDRAWN:         { className: "bg-neutral-100 text-neutral-400" },
};

// Actions available per status
const NEXT_ACTIONS: Record<string, { status: string; labelKey: string; variant: "primary" | "danger" | "secondary" }[]> = {
  APPLIED: [
    { status: "UNDER_REVIEW", labelKey: "applicants.statusStartReview", variant: "primary" },
    { status: "REJECTED",     labelKey: "applicants.statusRejected",    variant: "danger" },
  ],
  UNDER_REVIEW: [
    { status: "SHORTLISTED", labelKey: "applicants.statusPassed",    variant: "primary" },
    { status: "REJECTED",    labelKey: "applicants.statusRejected",  variant: "danger" },
    { status: "ON_HOLD",     labelKey: "applicants.statusHold",      variant: "secondary" },
  ],
  SHORTLISTED: [
    { status: "HIRED",    labelKey: "applicants.statusHired",    variant: "primary" },
    { status: "REJECTED", labelKey: "applicants.statusRejected", variant: "danger" },
  ],
  ON_HOLD: [
    { status: "UNDER_REVIEW", labelKey: "applicants.statusReviewing", variant: "primary" },
    { status: "REJECTED",     labelKey: "applicants.statusRejected",  variant: "danger" },
  ],
};

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABEL_KEYS: Record<string, string> = {
  APPLIED:           "applicants.statusPending",
  UNDER_REVIEW:      "applicants.statusReviewing",
  SHORTLISTED:       "applicants.statusPassed",
  INTERVIEW_PENDING: "applicants.statusInterview",
  ON_HOLD:           "applicants.statusHold",
  REJECTED:          "applicants.statusRejected",
  HIRED:             "applicants.statusHired",
  WITHDRAWN:         "applicants.statusCanceled",
};

function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const c = STATUS_CONFIG[status] ?? { className: "bg-neutral-100 text-neutral-500" };
  const label = STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status] as Parameters<typeof t>[0]) : status;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", c.className)}>
      {c.icon}
      {label}
    </span>
  );
}

// ─── Nationality / visa ────────────────────────────────────────────────────────

function natLabel(code: string) {
  const map: Record<string, string> = { KR: "한국", VN: "베트남", CN: "중국", PH: "필리핀", ID: "인도네시아" };
  return map[code] ?? code;
}

function visaLabel(code: string) {
  const map: Record<string, string> = {
    CITIZEN: "내국인", F4: "재외동포(F-4)", F5: "영주(F-5)", F6: "결혼이민(F-6)",
    H2: "방문취업(H-2)", E9: "비전문취업(E-9)", E7: "특정활동(E-7)",
  };
  return map[code] ?? code;
}

function healthLabel(code: string) {
  const map: Record<string, string> = { COMPLETED: "완료", NOT_DONE: "미완료", EXPIRED: "만료" };
  return map[code] ?? code;
}

// ─── Contract section ─────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "초안", SENT: "발송됨", SIGNED: "서명완료", EXPIRED: "만료됨", CANCELLED: "취소됨",
};

function ContractSection({ applicationPublicId }: { applicationPublicId: string }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = React.useState(false);
  const [sendError, setSendError] = React.useState<string | null>(null);
  // "template" = pre-fill from saved template, "manual" = blank form
  const [templateSource, setTemplateSource] = React.useState<"template" | "manual">("template");
  const [formData, setFormData] = React.useState({
    startDate: "",
    endDate: "",
    payAmount: "",
    payUnit: "DAILY",
    terms: "",
    documentUrl: "",
  });

  const { data: contract, isLoading } = useQuery({
    queryKey: ["employer-contract", applicationPublicId],
    queryFn: () => contractsApi.getByApplication(applicationPublicId),
    retry: false,
  });

  const { data: template } = useQuery({
    queryKey: ["employer-contract-template"],
    queryFn: () => contractsApi.getTemplate(),
    retry: false,
  });

  const hasTemplate = !!(template?.payAmount || template?.terms || template?.documentUrl);

  // Apply template fields when source switches to "template"
  React.useEffect(() => {
    if (templateSource === "template" && template) {
      setFormData((f) => ({
        ...f,
        payAmount: template.payAmount ? String(template.payAmount) : f.payAmount,
        payUnit: template.payUnit ?? f.payUnit,
        terms: template.terms ?? f.terms,
        documentUrl: template.documentUrl ?? f.documentUrl,
      }));
    }
    if (templateSource === "manual") {
      setFormData({ startDate: "", endDate: "", payAmount: "", payUnit: "DAILY", terms: "", documentUrl: "" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateSource]);

  // Auto-select template when form opens
  React.useEffect(() => {
    if (showForm && template && !contract) {
      setTemplateSource("template");
      setFormData((f) => ({
        ...f,
        payAmount: template.payAmount ? String(template.payAmount) : f.payAmount,
        payUnit: template.payUnit ?? f.payUnit,
        terms: template.terms ?? f.terms,
        documentUrl: template.documentUrl ?? f.documentUrl,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm, template]);

  const sendMutation = useMutation({
    mutationFn: () => contractsApi.sendForApplication(applicationPublicId, {
      startDate: formData.startDate || undefined,
      endDate: formData.endDate || undefined,
      payAmount: formData.payAmount ? Number(formData.payAmount) : undefined,
      payUnit: formData.payUnit || undefined,
      terms: formData.terms || undefined,
      documentUrl: formData.documentUrl || undefined,
    }),
    onSuccess: (data) => {
      queryClient.setQueryData(["employer-contract", applicationPublicId], data);
      setShowForm(false);
      setSendError(null);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? "계약서 발송에 실패했어요.";
      setSendError(msg);
    },
  });

  return (
    <div className="rounded-lg border border-neutral-100 bg-white p-4">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardSignature className="h-4 w-4 text-primary-500" />
          <p className="text-xs font-bold text-neutral-700 uppercase tracking-wider">계약서</p>
        </div>
        {/* 양식 관리 — always visible as a button */}
        <Link
          href="/employer/contracts"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-100 transition-colors"
        >
          <Settings2 className="h-3.5 w-3.5" />
          양식 관리
        </Link>
      </div>

      {isLoading ? (
        <div className="h-10 animate-pulse rounded bg-neutral-100" />
      ) : contract ? (
        /* ── Contract exists: show status ── */
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              contract.status === "SIGNED"
                ? "bg-success-50 text-success-700"
                : contract.status === "SENT"
                ? "bg-primary-50 text-primary-700"
                : "bg-neutral-100 text-neutral-500"
            )}>
              {STATUS_LABEL[contract.status] ?? contract.status}
            </span>
            {contract.documentUrl && (
              <a
                href={contract.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-500 hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                문서 열기
              </a>
            )}
          </div>
          <div className="text-xs text-neutral-500 space-y-0.5">
            {contract.sentAt && (
              <p>발송: {new Date(contract.sentAt).toLocaleDateString("ko-KR")}</p>
            )}
            {contract.workerSignedAt ? (
              <p className="text-success-600 font-medium">
                ✓ 근로자 서명: {new Date(contract.workerSignedAt).toLocaleDateString("ko-KR")}
              </p>
            ) : (
              <p className="text-neutral-400">근로자 서명 대기 중</p>
            )}
          </div>
          {(contract.payAmount || contract.startDate) && (
            <div className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600 space-y-0.5">
              {contract.payAmount && (
                <p>{contract.payAmount.toLocaleString("ko-KR")}원 / {contract.payUnit === "DAILY" ? "일" : contract.payUnit === "MONTHLY" ? "월" : contract.payUnit}</p>
              )}
              {contract.startDate && (
                <p>{contract.startDate} ~ {contract.endDate ?? "—"}</p>
              )}
            </div>
          )}
        </div>
      ) : showForm ? (
        /* ── Contract form ── */
        <div className="space-y-3">
          {sendError && (
            <div className="flex items-start gap-2 rounded-lg bg-danger-50 px-3 py-2 text-xs text-danger-700">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* Template selector dropdown */}
          <div>
            <label className="text-xs text-neutral-500 mb-1 block">계약서 양식 선택</label>
            <select
              value={templateSource}
              onChange={(e) => setTemplateSource(e.target.value as "template" | "manual")}
              className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
            >
              {hasTemplate && (
                <option value="template">
                  저장된 양식 사용
                  {template?.payAmount ? ` (${template.payAmount.toLocaleString("ko-KR")}원/${template.payUnit === "DAILY" ? "일" : template.payUnit === "MONTHLY" ? "월" : "시"})` : ""}
                </option>
              )}
              <option value="manual">직접 입력</option>
            </select>
          </div>

          {/* Date range — Gada DateInput component */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">시작일</label>
              <DateInput
                value={formData.startDate}
                onChange={(v) => setFormData((f) => ({ ...f, startDate: v }))}
                placeholder="시작일 선택"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">종료일</label>
              <DateInput
                value={formData.endDate}
                onChange={(v) => setFormData((f) => ({ ...f, endDate: v }))}
                placeholder="종료일 선택"
                min={formData.startDate || undefined}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-neutral-500 mb-1 block">급여 (원)</label>
              <input
                type="number"
                value={formData.payAmount}
                onChange={(e) => setFormData((f) => ({ ...f, payAmount: e.target.value }))}
                placeholder="예: 150000"
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500 mb-1 block">단위</label>
              <select
                value={formData.payUnit}
                onChange={(e) => setFormData((f) => ({ ...f, payUnit: e.target.value }))}
                className="h-[38px] rounded-lg border border-neutral-200 px-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-200"
              >
                <option value="DAILY">일급</option>
                <option value="MONTHLY">월급</option>
                <option value="HOURLY">시급</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-neutral-500 mb-1 block">계약 조건 (선택)</label>
            <textarea
              value={formData.terms}
              onChange={(e) => setFormData((f) => ({ ...f, terms: e.target.value }))}
              rows={3}
              placeholder="계약 조건을 입력하세요"
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-200 resize-none"
            />
          </div>

          {formData.documentUrl && (
            <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-primary-500" />
              <a
                href={formData.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate text-xs font-medium text-primary-600 hover:underline"
              >
                첨부 문서 확인
              </a>
              <button
                type="button"
                onClick={() => setFormData((f) => ({ ...f, documentUrl: "" }))}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowForm(false); setSendError(null); }}
              className="flex-1 rounded-lg border border-neutral-200 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="flex-1 rounded-lg bg-primary-500 py-2 text-xs font-semibold text-white hover:bg-primary-600 disabled:opacity-60 transition-colors"
            >
              {sendMutation.isPending ? "발송 중..." : "계약서 발송"}
            </button>
          </div>
        </div>
      ) : (
        /* ── No contract yet: show create button ── */
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-500 py-2.5 text-xs font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          <ClipboardSignature className="h-4 w-4" />
          계약서 작성 및 발송
        </button>
      )}
    </div>
  );
}

// ─── Applicant drawer ─────────────────────────────────────────────────────────

function ApplicantDrawer({
  appPublicId,
  onClose,
  onStatusChange,
}: {
  appPublicId: string;
  onClose: () => void;
  onStatusChange: (status: string) => void;
}) {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["employer-app-detail", appPublicId],
    queryFn: () => employerApi.getApplicationDetail(appPublicId),
  });

  const actions = data ? NEXT_ACTIONS[data.status] ?? [] : [];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-white overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
          <h2 className="font-bold text-neutral-900 text-base">지원자 상세</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700 text-xl leading-none">✕</button>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center text-sm text-neutral-500">불러오기 실패</div>
        ) : (
          <div className="flex-1 p-5 space-y-5">
            {/* Worker info */}
            <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-4">
              <div className="flex items-center gap-3 mb-3">
                {data.workerSnapshot.profileImageUrl ? (
                  <img src={data.workerSnapshot.profileImageUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-lg">
                    {data.workerSnapshot.fullName?.charAt(0) ?? "?"}
                  </div>
                )}
                <div>
                  <p className="font-bold text-neutral-900">{data.workerSnapshot.fullName || "이름 없음"}</p>
                  <StatusBadge status={data.status} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-neutral-400 text-xs">국적</span>
                  <p className="font-medium text-neutral-800">{natLabel(data.workerSnapshot.nationality ?? "KR")}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">비자</span>
                  <p className="font-medium text-neutral-800">{visaLabel(data.workerSnapshot.visaType ?? "CITIZEN")}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">건강검진</span>
                  <p className="font-medium text-neutral-800">{healthLabel(data.workerSnapshot.healthCheckStatus ?? "NOT_DONE")}</p>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">지원 방식</span>
                  <p className="font-medium text-neutral-800">
                    {data.applicationType === "INDIVIDUAL" ? "개인" : data.applicationType === "TEAM" ? "팀" : "기업"}
                  </p>
                </div>
              </div>
              {data.workerSnapshot.desiredPayMin && (
                <div className="mt-2 pt-2 border-t border-neutral-200 text-sm">
                  <span className="text-neutral-400 text-xs">희망 급여</span>
                  <p className="font-medium text-neutral-800">
                    {data.workerSnapshot.desiredPayMin.toLocaleString()}
                    {data.workerSnapshot.desiredPayMax ? `~${data.workerSnapshot.desiredPayMax.toLocaleString()}` : ""}원/
                    {data.workerSnapshot.desiredPayUnit === "DAILY" ? "일" : "월"}
                  </p>
                </div>
              )}
            </div>

            {/* ─ Contact info: only visible when HIRED ─ */}
            {data.status === "HIRED" ? (
              <div className="rounded-lg border border-success-200 bg-success-50 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-4 w-4 text-success-700" />
                  <p className="text-xs font-bold text-success-700 uppercase tracking-wider">채용 확정 · 연락처 공개</p>
                </div>
                {data.workerSnapshot.phone ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-success-700 mb-0.5">전화번호</p>
                      <p className="font-bold text-neutral-900 text-base tracking-wide">
                        {data.workerSnapshot.phone}
                      </p>
                    </div>
                    <a
                      href={`tel:${data.workerSnapshot.phone}`}
                      className="flex items-center gap-1.5 rounded-lg bg-success-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-success-700 transition-colors"
                    >
                      <Phone className="h-4 w-4" />
                      전화하기
                    </a>
                  </div>
                ) : (
                  <p className="text-sm text-success-700">전화번호를 불러오는 중...</p>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 flex items-center gap-3">
                <Lock className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-neutral-600">연락처 비공개</p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    채용 확정 후 전화번호가 공개됩니다
                  </p>
                </div>
              </div>
            )}

            {/* Contract section — visible after HIRED */}
            {data.status === "HIRED" && (
              <ContractSection applicationPublicId={appPublicId} />
            )}

            {/* Team info */}
            {data.teamSnapshot && (
              <div className="rounded-lg border border-neutral-100 bg-white p-4">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">팀 정보</p>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary-500" />
                  <span className="font-semibold text-neutral-900">{data.teamSnapshot.name}</span>
                  <span className="text-xs text-neutral-400">{data.teamSnapshot.memberCount}명</span>
                </div>
                {data.teamSnapshot.description && (
                  <p className="text-sm text-neutral-600 mt-1">{data.teamSnapshot.description}</p>
                )}
              </div>
            )}

            {/* Cover letter */}
            {data.coverLetter && (
              <div className="rounded-lg border border-neutral-100 bg-white p-4">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">자기소개 / 지원 메시지</p>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">{data.coverLetter}</p>
              </div>
            )}

            {/* Status history */}
            {data.statusHistory && data.statusHistory.length > 0 && (
              <div className="rounded-lg border border-neutral-100 bg-white p-4">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">상태 이력</p>
                <div className="space-y-2">
                  {data.statusHistory.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-neutral-600">
                      {h.fromStatus && <><StatusBadge status={h.fromStatus} /><span>→</span></>}
                      <StatusBadge status={h.toStatus} />
                      {h.note && <span className="text-neutral-400">({h.note})</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <div className="p-4 border-t border-neutral-100 space-y-2">
            {actions.map((action) => (
              <button
                key={action.status}
                onClick={() => onStatusChange(action.status)}
                className={cn(
                  "w-full py-2.5 rounded-lg text-sm font-semibold transition-colors",
                  action.variant === "primary" && "bg-primary-500 text-white hover:bg-primary-600",
                  action.variant === "danger" && "bg-danger-500 text-white hover:bg-danger-700",
                  action.variant === "secondary" && "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
                )}
              >
                {t(action.labelKey as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: undefined, label: "전체" },
  { value: "APPLIED", label: "신규" },
  { value: "UNDER_REVIEW", label: "검토 중" },
  { value: "SHORTLISTED", label: "선발" },
  { value: "HIRED", label: "채용 확정" },
  { value: "REJECTED", label: "불합격" },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobApplicantsPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = React.use(params);
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = React.useState<string | undefined>(undefined);
  const [selectedAppId, setSelectedAppId] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(0);

  // Job detail
  const { data: job } = useQuery({
    queryKey: ["employer-job-detail", jobId],
    queryFn: () => employerApi.getJobDetail(jobId),
  });

  // Applicants list
  const { data: appList, isLoading } = useQuery({
    queryKey: ["employer-job-applications", jobId, statusFilter, page],
    queryFn: () => employerApi.getJobApplications(jobId, statusFilter, page),
  });

  // Status update mutation
  const updateStatus = useMutation({
    mutationFn: ({ appId, status }: { appId: string; status: string }) =>
      employerApi.updateApplicationStatus(appId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employer-job-applications", jobId] });
      queryClient.invalidateQueries({ queryKey: ["employer-app-detail", selectedAppId] });
    },
  });

  const applicants = appList?.content ?? [];
  const total = appList?.totalElements ?? 0;
  const totalPages = appList?.totalPages ?? 1;

  function handleStatusChange(status: string) {
    if (!selectedAppId) return;
    updateStatus.mutate({ appId: selectedAppId, status });
  }

  return (
    <div>
      {/* Back */}
      <Link
        href="/employer/applicants"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 mb-5"
      >
        <ChevronLeft className="h-4 w-4" />
        공고 목록
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900">{job?.title ?? "공고"}</h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          총 {total}명 지원 · 모집 {job?.requiredCount ?? "-"}명
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => { setStatusFilter(tab.value); setPage(0); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
              statusFilter === tab.value
                ? "bg-primary-500 text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applicants list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : applicants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-28 text-center">
          <Users className="h-12 w-12 text-neutral-200 mb-4" />
          <p className="text-base font-bold text-neutral-600">
            {statusFilter ? "해당 상태의 지원자가 없어요" : "아직 지원자가 없어요"}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block rounded-lg border border-neutral-100 bg-white overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-neutral-500">지원자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">국적 / 비자</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">지원 방식</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">상태</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">지원일</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {applicants.map((app) => (
                  <ApplicantRow
                    key={app.publicId}
                    app={app}
                    onOpen={() => setSelectedAppId(app.publicId)}
                    onStatusChange={(status) => updateStatus.mutate({ appId: app.publicId, status })}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-2">
            {applicants.map((app) => (
              <ApplicantCard
                key={app.publicId}
                app={app}
                onOpen={() => setSelectedAppId(app.publicId)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 transition-colors">
                이전
              </button>
              <span className="text-sm text-neutral-500">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-medium text-neutral-600 disabled:opacity-40 hover:bg-neutral-50 transition-colors">
                다음
              </button>
            </div>
          )}
        </>
      )}

      {/* Drawer */}
      {selectedAppId && (
        <ApplicantDrawer
          appPublicId={selectedAppId}
          onClose={() => setSelectedAppId(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

// ─── Row (desktop) ────────────────────────────────────────────────────────────

function ApplicantRow({
  app,
  onOpen,
  onStatusChange,
}: {
  app: ApplicationSummary;
  onOpen: () => void;
  onStatusChange: (status: string) => void;
}) {
  const t = useT();
  const actions = NEXT_ACTIONS[app.status] ?? [];
  const primaryAction = actions.find((a) => a.variant === "primary");

  return (
    <tr className="hover:bg-neutral-50/50 transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
            {app.applicationType === "TEAM" ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
          </div>
          <div>
            <p className="font-medium text-neutral-900 text-sm">{app.applicationType === "INDIVIDUAL" ? "개인 지원" : app.applicationType === "TEAM" ? "팀 지원" : "기업 지원"}</p>
            <p className="text-xs text-neutral-400">{new Date(app.appliedAt).toLocaleDateString("ko-KR")}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5 text-sm text-neutral-600">—</td>
      <td className="px-4 py-3.5">
        <span className="text-xs text-neutral-600">
          {app.applicationType === "INDIVIDUAL" ? "개인" : app.applicationType === "TEAM" ? "팀" : "기업"}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={app.status} />
      </td>
      <td className="px-4 py-3.5 text-xs text-neutral-400">
        {new Date(app.appliedAt).toLocaleDateString("ko-KR")}
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 justify-end">
          {primaryAction && (
            <button
              onClick={() => onStatusChange(primaryAction.status)}
              className="px-2.5 py-1 rounded-lg bg-primary-500 text-white text-xs font-semibold hover:bg-primary-600 transition-colors"
            >
              {t(primaryAction.labelKey as Parameters<typeof t>[0])}
            </button>
          )}
          <button
            onClick={onOpen}
            className="px-2.5 py-1 rounded-lg border border-neutral-200 text-neutral-600 text-xs font-semibold hover:bg-neutral-50 transition-colors"
          >
            상세
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Card (mobile) ────────────────────────────────────────────────────────────

function ApplicantCard({ app, onOpen }: { app: ApplicationSummary; onOpen: () => void }) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-neutral-100 bg-white p-4 cursor-pointer hover:border-primary-500/20 transition-all"
      onClick={onOpen}
    >
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary-500/10">
        {app.applicationType === "TEAM" ? (
          <Users className="h-5 w-5 text-primary-500" />
        ) : (
          <User className="h-5 w-5 text-primary-500" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-neutral-900">
            {app.applicationType === "INDIVIDUAL" ? "개인 지원" : app.applicationType === "TEAM" ? "팀 지원" : "기업 지원"}
          </span>
          <StatusBadge status={app.status} />
        </div>
        <p className="text-xs text-neutral-400 mt-0.5">
          {new Date(app.appliedAt).toLocaleDateString("ko-KR")} 지원
        </p>
      </div>
      <ChevronLeft className="h-4 w-4 rotate-180 text-neutral-300" />
    </div>
  );
}
