"use client";

import { fmtDatetime, fmtDate } from "@/lib/format";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  Building2,
  Phone,
  Mail,
  Globe,
  User,
  MapPin,
  Briefcase,
  Eye,
  FileText,
  ChevronRight,
  AlertCircle,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  getAdminCompanyDetail,
  patchCompanyStatus,
  AdminCompanyDetail,
  AdminSiteItem,
  AdminJobItem,
} from "@/lib/api";

// ─── Pay formatting ───────────────────────────────────────────

const PAY_UNIT: Record<string, string> = {
  HOURLY: "시급",
  DAILY: "일급",
  WEEKLY: "주급",
  MONTHLY: "월급",
  LUMP_SUM: "일시불",
};

function formatPay(min?: number, max?: number, unit?: string) {
  if (!min && !max) return "협의";
  const u = PAY_UNIT[unit as string] ?? "";
  const fmt = (n: number) => n.toLocaleString("ko-KR");
  if (min && max) return `${u} ${fmt(min)}~${fmt(max)}`;
  return `${u} ${fmt(min ?? max!)}~`;
}

// ─── Sub-components ──────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-64 bg-neutral-200 rounded-lg" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4">
        <div className="h-6 w-48 bg-neutral-200 rounded" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-16 bg-neutral-100 rounded" />
              <div className="h-5 w-28 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
            <div className="h-5 w-32 bg-neutral-200 rounded" />
            <div className="h-16 bg-neutral-100 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <AlertCircle className="h-10 w-10 text-neutral-300" />
      <p className="text-neutral-500 font-medium">기업 담당자를 찾을 수 없습니다</p>
      <Link
        href="/companies"
        className="text-sm text-brand-blue hover:underline"
      >
        목록으로 돌아가기
      </Link>
    </div>
  );
}

function SiteCard({ site }: { site: AdminSiteItem }) {
  return (
    <div className="bg-neutral-50 rounded-xl border border-neutral-200 p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-neutral-900 text-sm leading-snug">{site.name}</p>
        <StatusBadge status={site.status} />
      </div>
      {site.address && (
        <p className="text-xs text-neutral-500 truncate" title={site.address}>
          {site.address}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        {site.sido && (
          <span className="inline-flex items-center rounded-md bg-blue-50 border border-blue-100 px-2 py-0.5 text-xs text-brand-blue">
            {site.sido}
          </span>
        )}
        {site.sigungu && (
          <span className="inline-flex items-center rounded-md bg-neutral-100 border border-neutral-200 px-2 py-0.5 text-xs text-neutral-600">
            {site.sigungu}
          </span>
        )}
        <span className="ml-auto text-xs text-neutral-500 font-medium">
          활성 공고 {site.activeJobCount}건
        </span>
      </div>
    </div>
  );
}

// ─── Action Button Panel ──────────────────────────────────────

interface ActionPanelProps {
  status: string;
  isMutating: boolean;
  note: string;
  showNote: boolean;
  onAction: (status: string) => void;
  onToggleNote: (show: boolean) => void;
  onNoteChange: (val: string) => void;
}

function ActionPanel({
  status,
  isMutating,
  note,
  showNote,
  onAction,
  onToggleNote,
  onNoteChange,
}: ActionPanelProps) {
  function renderButtons() {
    if (status === "PENDING") {
      return (
        <>
          <button
            disabled={isMutating}
            onClick={() => onToggleNote(true)}
            className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {isMutating ? "처리 중..." : "승인하기"}
          </button>
          <button
            disabled={isMutating}
            onClick={() => onToggleNote(true)}
            className="px-4 py-2 rounded-lg border border-red-300 text-red-600 bg-white text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            반려하기
          </button>
        </>
      );
    }
    if (status === "ACTIVE") {
      return (
        <button
          disabled={isMutating}
          onClick={() => onToggleNote(true)}
          className="px-4 py-2 rounded-lg border border-orange-300 text-orange-700 bg-white text-sm font-semibold hover:bg-orange-50 disabled:opacity-50 transition-colors"
        >
          {isMutating ? "처리 중..." : "정지하기"}
        </button>
      );
    }
    if (status === "SUSPENDED") {
      return (
        <button
          disabled={isMutating}
          onClick={() => onAction("ACTIVE")}
          className="px-4 py-2 rounded-lg border border-green-300 text-green-700 bg-white text-sm font-semibold hover:bg-green-50 disabled:opacity-50 transition-colors"
        >
          {isMutating ? "처리 중..." : "재활성화"}
        </button>
      );
    }
    return null;
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2 flex-wrap justify-end">{renderButtons()}</div>
      {showNote && status !== "SUSPENDED" && (
        <div className="w-full sm:w-80 space-y-2">
          <textarea
            value={note}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="관리자 메모 (선택사항)"
            rows={3}
            className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          />
          <div className="flex gap-2 justify-end">
            {status === "PENDING" && (
              <>
                <button
                  onClick={() => onAction("ACTIVE")}
                  disabled={isMutating}
                  className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  승인 확정
                </button>
                <button
                  onClick={() => onAction("SUSPENDED")}
                  disabled={isMutating}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  반려 확정
                </button>
              </>
            )}
            {status === "ACTIVE" && (
              <button
                onClick={() => onAction("SUSPENDED")}
                disabled={isMutating}
                className="px-3 py-1.5 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                정지 확정
              </button>
            )}
            <button
              onClick={() => { onToggleNote(false); onNoteChange(""); }}
              className="px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-600 text-xs hover:bg-neutral-50 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function CompanyDetailPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();
  const [actionNote, setActionNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);

  const { data, isLoading } = useQuery<AdminCompanyDetail>({
    queryKey: ["admin", "company", publicId],
    queryFn: () => getAdminCompanyDetail(publicId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, note }: { status: string; note?: string }) =>
      patchCompanyStatus(publicId, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "company", publicId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "companies"] });
      setShowNoteInput(false);
      setActionNote("");
    },
  });

  function handleAction(newStatus: string) {
    statusMutation.mutate({ status: newStatus, note: actionNote || undefined });
  }

  const breadcrumbs = [
    { label: "대시보드", href: "/dashboard" },
    { label: "기업 관리", href: "/companies" },
    { label: data?.name ?? "기업 담당자 상세" },
  ];

  if (isLoading) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <LoadingSkeleton />
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout breadcrumbs={breadcrumbs}>
        <NotFound />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="space-y-6">

        {/* Page header */}
        <div>
          <Link
            href="/companies"
            className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-800 transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            기업 목록
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              {data.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.logoUrl}
                  alt={data.name}
                  className="h-14 w-14 rounded-xl object-cover border border-neutral-200 flex-shrink-0"
                />
              ) : (
                <div className="h-14 w-14 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-7 w-7 text-brand-blue" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-extrabold text-neutral-950">{data.name}</h1>
                  <StatusBadge status={data.status} />
                  {data.isVerified && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-50 border border-green-200 px-2 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle className="h-3 w-3" />
                      인증됨
                    </span>
                  )}
                </div>
                {data.businessRegistrationNumber && (
                  <p className="mt-0.5 text-sm text-neutral-500 font-mono">
                    사업자번호: {data.businessRegistrationNumber}
                  </p>
                )}
                {data.verifiedAt && (
                  <p className="text-xs text-green-600 mt-0.5">
                    인증일: {fmtDatetime(data.verifiedAt)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1 items-end">
              {statusMutation.isError && (
                <p className="text-xs text-red-600">
                  오류: {(statusMutation.error as Error).message}
                </p>
              )}
              <ActionPanel
                status={data.status}
                isMutating={statusMutation.isPending}
                note={actionNote}
                showNote={showNoteInput}
                onAction={handleAction}
                onToggleNote={setShowNoteInput}
                onNoteChange={setActionNote}
              />
            </div>
          </div>
        </div>

        {/* Info grid */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-6">
          <h2 className="text-sm font-semibold text-neutral-700 mb-4">기업 정보</h2>
          <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <User className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">대표자명</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.ceoName ?? "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Phone className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">전화번호</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.phone ?? "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Mail className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">이메일</p>
              </div>
              <p className="text-sm font-medium text-neutral-900">{data.email ?? "—"}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <Globe className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">웹사이트</p>
              </div>
              {data.websiteUrl ? (
                <a
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-brand-blue hover:underline truncate block"
                >
                  {data.websiteUrl}
                </a>
              ) : (
                <p className="text-sm font-medium text-neutral-900">—</p>
              )}
            </div>
          </div>

          {data.address && (
            <div className="mt-5 pt-4 border-t border-neutral-100">
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="h-3.5 w-3.5 text-neutral-400" />
                <p className="text-xs text-neutral-500">주소</p>
              </div>
              <p className="text-sm text-neutral-700">{data.address}</p>
            </div>
          )}

          {data.description && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">기업 담당자 소개</p>
              <p className="text-sm text-neutral-700 whitespace-pre-wrap leading-relaxed">
                {data.description}
              </p>
            </div>
          )}

          {data.adminNote && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-neutral-500 mb-1">관리자 메모</p>
              <p className="text-sm text-neutral-600 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2">
                {data.adminNote}
              </p>
            </div>
          )}

          {data.rejectionReason && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <p className="text-xs text-red-500 mb-1">반려 사유</p>
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {data.rejectionReason}
              </p>
            </div>
          )}
        </div>

        {/* Sites section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-700">
            등록 현장 ({data.sites.length}개)
          </h2>
          {data.sites.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-8 text-center">
              <MapPin className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">등록된 현장이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.sites.map((site) => (
                <SiteCard key={site.publicId} site={site} />
              ))}
            </div>
          )}
        </div>

        {/* Recent jobs section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">
              최근 공고 (최대 5건)
            </h2>
            <Link
              href={`/jobs?companyId=${publicId}`}
              className="inline-flex items-center gap-1 text-xs text-brand-blue hover:underline"
            >
              전체 공고 보기
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {data.recentJobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-card p-8 text-center">
              <Briefcase className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
              <p className="text-sm text-neutral-400">등록된 공고가 없습니다</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 bg-neutral-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      공고명
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden sm:table-cell">
                      현장
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden md:table-cell">
                      급여
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                      조회/지원
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider hidden lg:table-cell">
                      등록일
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-50">
                  {data.recentJobs.map((job: AdminJobItem) => (
                    <tr key={job.publicId} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-neutral-900 max-w-[160px] truncate" title={job.title}>
                          {job.title}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-neutral-600 max-w-[120px] truncate block" title={job.siteName}>
                          {job.siteName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={job.status} />
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span className="text-xs text-neutral-700 font-medium whitespace-nowrap">
                          {formatPay(job.payMin, job.payMax, job.payUnit)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <div className="flex items-center gap-2 text-xs text-neutral-500">
                          <Eye className="h-3.5 w-3.5" />
                          {job.viewCount}
                          <FileText className="h-3.5 w-3.5 ml-1" />
                          {job.applicationCount}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-xs text-neutral-500">
                          {fmtDatetime(job.createdAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/jobs/${job.publicId}`}
                          className="inline-flex items-center rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Metadata footer */}
        <div className="text-xs text-neutral-400 pt-2 pb-6">
          등록일: {fmtDatetime(data.createdAt)}
        </div>
      </div>
    </AdminLayout>
  );
}
