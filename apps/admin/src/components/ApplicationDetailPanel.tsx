"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  CheckCircle,
  User,
  Heart,
  Clock,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import {
  ApplicationDetail,
  ApplicationStatus,
  updateApplicationStatus,
  scoutApplicant,
  verifyApplication,
} from "@/lib/api";

// ─── Constants ─────────────────────────────────────────────────

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  APPLIED: "지원완료",
  UNDER_REVIEW: "검토중",
  SHORTLISTED: "서류통과",
  INTERVIEW_PENDING: "면접예정",
  ON_HOLD: "보류",
  REJECTED: "불합격",
  HIRED: "합격",
  WITHDRAWN: "취소",
};

export const STATUS_BADGE_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-slate-100 text-slate-700 border border-slate-200",
  UNDER_REVIEW: "bg-blue-50 text-blue-700 border border-blue-200",
  SHORTLISTED: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  INTERVIEW_PENDING: "bg-purple-50 text-purple-700 border border-purple-200",
  ON_HOLD: "bg-amber-50 text-amber-700 border border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border border-red-200",
  HIRED: "bg-green-50 text-green-700 border border-green-200",
  WITHDRAWN: "bg-gray-100 text-gray-500 border border-gray-200",
};

export const STATUS_DOT_CLASS: Record<ApplicationStatus, string> = {
  APPLIED: "bg-slate-400",
  UNDER_REVIEW: "bg-blue-500",
  SHORTLISTED: "bg-indigo-500",
  INTERVIEW_PENDING: "bg-purple-500",
  ON_HOLD: "bg-amber-500",
  REJECTED: "bg-red-500",
  HIRED: "bg-green-500",
  WITHDRAWN: "bg-gray-400",
};

const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["SHORTLISTED", "ON_HOLD", "REJECTED"],
  SHORTLISTED: ["INTERVIEW_PENDING", "ON_HOLD", "REJECTED"],
  INTERVIEW_PENDING: ["HIRED", "ON_HOLD", "REJECTED"],
  ON_HOLD: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"],
  REJECTED: [],
  HIRED: [],
  WITHDRAWN: [],
};

const TERMINAL_STATUSES: ApplicationStatus[] = ["REJECTED", "HIRED", "WITHDRAWN"];

// ─── Helpers ───────────────────────────────────────────────────

const PAY_UNIT_KO: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
  LUMP_SUM: "일시불",
};

function formatPayRange(min?: number, max?: number, unit?: string): string {
  if (!min && !max) return "협의";
  const u = PAY_UNIT_KO[unit ?? ""] ?? "";
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  if (min && max) return `${u} ${fmt(min)} ~ ${fmt(max)}`;
  return `${u} ${fmt(min ?? max!)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const HEALTH_CHECK_CLASS: Record<string, string> = {
  COMPLETED: "text-green-700 bg-green-50 border-green-200",
  EXPIRED: "text-red-700 bg-red-50 border-red-200",
};

// ─── Sub-components ─────────────────────────────────────────────

function StatusBadgeApp({ status }: { status: ApplicationStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-neutral-900">{value || "—"}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

interface ApplicationDetailPanelProps {
  data: ApplicationDetail;
  onUpdated?: (updated: ApplicationDetail) => void;
  /** When true the panel renders in a compact side-panel style */
  compact?: boolean;
}

export function ApplicationDetailPanel({
  data,
  onUpdated,
  compact = false,
}: ApplicationDetailPanelProps) {
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState(data.employerNote ?? "");
  const [localData, setLocalData] = useState<ApplicationDetail>(data);

  // Keep local data in sync when the prop changes (e.g. parent refetch)
  const current = localData.publicId === data.publicId ? localData : data;

  const isTerminal = TERMINAL_STATUSES.includes(current.status);
  const nextStatuses = STATUS_TRANSITIONS[current.status];

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
    queryClient.invalidateQueries({ queryKey: ["admin", "application", data.publicId] });
  }

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      updateApplicationStatus(data.publicId, status, note),
    onSuccess: (updated) => {
      setLocalData(updated);
      setNoteText(updated.employerNote ?? "");
      invalidate();
      onUpdated?.(updated);
    },
  });

  const scoutMutation = useMutation({
    mutationFn: () => scoutApplicant(data.publicId),
    onSuccess: (updated) => {
      setLocalData(updated);
      invalidate();
      onUpdated?.(updated);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyApplication(data.publicId),
    onSuccess: (updated) => {
      setLocalData(updated);
      invalidate();
      onUpdated?.(updated);
    },
  });

  const isMutating =
    statusMutation.isPending || scoutMutation.isPending || verifyMutation.isPending;

  const ws = current.workerSnapshot;
  const ts = current.teamSnapshot;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        {ws.profileImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={ws.profileImageUrl}
            alt={ws.fullName}
            className="h-14 w-14 rounded-full object-cover border border-neutral-200 flex-shrink-0"
          />
        ) : (
          <div className="h-14 w-14 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
            <User className="h-7 w-7 text-brand-blue" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-950 truncate">{ws.fullName}</h2>
            <StatusBadgeApp status={current.status} />
            {current.isScouted && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                스카우트
              </span>
            )}
            {current.isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-xs font-medium text-blue-700">
                <CheckCircle className="h-3 w-3" />
                인증
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            지원일: {formatDate(current.appliedAt)}
          </p>
          <p className="text-xs text-neutral-500">
            {current.jobTitle} · {current.companyName}
          </p>
        </div>
      </div>

      {/* ── Error display ── */}
      {(statusMutation.isError || scoutMutation.isError || verifyMutation.isError) && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>
            {(
              (statusMutation.error ||
                scoutMutation.error ||
                verifyMutation.error) as Error
            )?.message ?? "오류가 발생했습니다"}
          </span>
        </div>
      )}

      {/* ── Action Buttons ── */}
      <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Status change */}
          <div className="flex items-center gap-2">
            <select
              disabled={isTerminal || isMutating}
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  statusMutation.mutate({ status: e.target.value, note: noteText || undefined });
                }
              }}
              className="rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">상태 변경...</option>
              {nextStatuses.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            {isTerminal && (
              <span className="text-xs text-neutral-400">최종 상태</span>
            )}
          </div>

          {/* Scout button */}
          <button
            disabled={current.isScouted || isMutating}
            onClick={() => scoutMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Star className="h-3.5 w-3.5" />
            {current.isScouted ? "스카우트됨" : "스카우트"}
          </button>

          {/* Verify button */}
          <button
            disabled={current.isVerified || isMutating}
            onClick={() => verifyMutation.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="h-3.5 w-3.5" />
            {current.isVerified ? "인증됨" : "인증"}
          </button>
        </div>

        {/* Note textarea */}
        <div className="space-y-1.5">
          <label className="text-xs text-neutral-500 font-medium">메모 (상태 변경 시 함께 저장)</label>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="업체 메모를 입력하세요..."
            rows={2}
            disabled={isMutating}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none placeholder-neutral-300 disabled:opacity-50"
          />
        </div>
      </div>

      {/* ── Worker Profile ── */}
      <div className="space-y-4">
        <SectionLabel>지원자 프로필</SectionLabel>
        <div className="grid grid-cols-2 gap-4">
          <InfoRow label="이름" value={ws.fullName} />
          <InfoRow label="생년월일" value={ws.birthDate} />
          <InfoRow label="국적" value={ws.nationality} />
          <InfoRow label="비자 유형" value={ws.visaType} />
        </div>

        {/* Health check */}
        <div>
          <p className="text-xs text-neutral-500 mb-1">건강 검진</p>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                HEALTH_CHECK_CLASS[ws.healthCheckStatus] ??
                "text-neutral-600 bg-neutral-100 border-neutral-200"
              }`}
            >
              <Heart className="h-3 w-3 mr-1" />
              {ws.healthCheckStatus === "COMPLETED"
                ? "완료"
                : ws.healthCheckStatus === "EXPIRED"
                ? "만료"
                : ws.healthCheckStatus}
            </span>
            {ws.healthCheckExpiry && (
              <span className="text-xs text-neutral-500">
                만료일: {ws.healthCheckExpiry}
              </span>
            )}
          </div>
        </div>

        {/* Languages */}
        {ws.languages.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">언어</p>
            <div className="flex flex-wrap gap-1.5">
              {ws.languages.map((lang, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                >
                  {lang.code}
                  <span className="text-blue-400">·</span>
                  {lang.level}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {ws.certifications.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-1.5">자격증</p>
            <div className="flex flex-wrap gap-1.5">
              {ws.certifications.map((cert, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-0.5 text-xs font-medium text-neutral-700"
                >
                  {cert.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {ws.portfolio.length > 0 && (
          <div>
            <p className="text-xs text-neutral-500 mb-2">포트폴리오</p>
            <div className="space-y-2">
              {ws.portfolio.map((item, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2"
                >
                  <p className="text-sm font-medium text-neutral-900">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Desired pay */}
        {(ws.desiredPayMin || ws.desiredPayMax) && (
          <InfoRow
            label="희망 급여"
            value={formatPayRange(ws.desiredPayMin, ws.desiredPayMax, ws.desiredPayUnit)}
          />
        )}
      </div>

      {/* ── Team Info ── */}
      {ts && (
        <div className="space-y-3">
          <SectionLabel>팀 정보</SectionLabel>
          <div className="bg-neutral-50 rounded-xl border border-neutral-100 p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoRow label="팀 이름" value={ts.name} />
              <InfoRow label="팀 유형" value={ts.type} />
              <InfoRow label="팀원 수" value={`${ts.memberCount}명`} />
              {(ts.desiredPayMin || ts.desiredPayMax) && (
                <InfoRow
                  label="팀 희망 급여"
                  value={formatPayRange(ts.desiredPayMin, ts.desiredPayMax, ts.desiredPayUnit)}
                />
              )}
            </div>
            {ts.description && (
              <p className="text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3">
                {ts.description}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Cover Letter ── */}
      {current.coverLetter && (
        <div className="space-y-2">
          <SectionLabel>자기소개 / 지원동기</SectionLabel>
          <blockquote className="border-l-4 border-brand-blue bg-blue-50/40 pl-4 pr-3 py-3 rounded-r-xl text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
            {current.coverLetter}
          </blockquote>
        </div>
      )}

      {/* ── Status History ── */}
      {current.statusHistory.length > 0 && (
        <div className="space-y-3">
          <SectionLabel>상태 이력</SectionLabel>
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-neutral-200" />
            <div className="space-y-4">
              {current.statusHistory.map((entry, i) => {
                const toStatus = entry.toStatus as ApplicationStatus;
                const dotClass = STATUS_DOT_CLASS[toStatus] ?? "bg-neutral-300";
                return (
                  <div key={i} className="relative flex gap-3 pl-6">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${dotClass}`}
                    />
                    <div className="flex-1 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {entry.fromStatus && (
                          <>
                            <span className="text-xs text-neutral-400">
                              {STATUS_LABEL[entry.fromStatus as ApplicationStatus] ?? entry.fromStatus}
                            </span>
                            <ChevronRight className="h-3 w-3 text-neutral-300" />
                          </>
                        )}
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASS[toStatus] ?? "bg-neutral-100 text-neutral-600"}`}
                        >
                          {STATUS_LABEL[toStatus] ?? entry.toStatus}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="mt-1 text-xs text-neutral-600 bg-neutral-50 rounded-md px-2 py-1">
                          {entry.note}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="h-2.5 w-2.5 text-neutral-300" />
                        <span className="text-[10px] text-neutral-400">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
