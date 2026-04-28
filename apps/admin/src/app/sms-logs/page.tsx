"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  RefreshCw,
  X,
  RotateCcw,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { DataTable, Column } from "@/components/ui/DataTable";
import { AdminBadge } from "@/components/ui/AdminBadge";
import { Pagination } from "@/components/ui/Pagination";
import {
  SmsLogItem,
  SmsLogListResponse,
  getSmsLogs,
  getSmsLogDetail,
  retrySmsLog,
  getAdminSmsTemplates,
  PagedResponse,
  AdminSmsTemplateItem,
} from "@/lib/api";

type BadgeVariant = "green" | "red" | "blue" | "amber" | "gray" | "indigo" | "purple" | "orange";

// ─── Constants ────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "전체 상태" },
  { value: "PENDING", label: "대기" },
  { value: "SENDING", label: "발송중" },
  { value: "SENT", label: "발송됨" },
  { value: "DELIVERED", label: "전달됨" },
  { value: "FAILED", label: "실패" },
  { value: "CANCELLED", label: "취소" },
];

// ─── Status Badge ─────────────────────────────────────────────

function StatusBadge({ status }: { status: SmsLogItem["status"] }) {
  const MAP: Record<SmsLogItem["status"], { label: string; variant: BadgeVariant }> = {
    PENDING: { label: "대기", variant: "gray" },
    SENDING: { label: "발송중", variant: "blue" },
    SENT: { label: "발송됨", variant: "indigo" },
    DELIVERED: { label: "전달됨", variant: "green" },
    FAILED: { label: "실패", variant: "red" },
    CANCELLED: { label: "취소", variant: "gray" },
  };
  const cfg = MAP[status];
  if (status === "CANCELLED") {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-400 line-through">
        취소
      </span>
    );
  }
  return <AdminBadge label={cfg.label} variant={cfg.variant} />;
}

// ─── Trigger Event Chip ───────────────────────────────────────

function TriggerChip({ trigger }: { trigger: string | null }) {
  if (!trigger) return <span className="text-neutral-300 text-xs">—</span>;

  const MAP: Record<string, { label: string; cls: string }> = {
    ONBOARD: {
      label: "온보딩",
      cls: "bg-green-50 text-green-700 border border-green-100",
    },
    ADMIN_SEND: {
      label: "어드민",
      cls: "bg-blue-50 text-blue-700 border border-blue-100",
    },
    BROADCAST: {
      label: "브로드캐스트",
      cls: "bg-purple-50 text-purple-700 border border-purple-100",
    },
  };
  const cfg = MAP[trigger] ?? {
    label: trigger,
    cls: "bg-neutral-100 text-neutral-600 border border-neutral-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────

interface DetailPanelProps {
  publicId: string;
  onClose: () => void;
  onRetry: (id: string) => void;
  isRetrying: boolean;
}

function DetailPanel({ publicId, onClose, onRetry, isRetrying }: DetailPanelProps) {
  const { data, isLoading } = useQuery<SmsLogItem>({
    queryKey: ["admin", "sms-log-detail", publicId],
    queryFn: () => getSmsLogDetail(publicId),
  });

  const canRetry =
    data?.status === "FAILED" &&
    (data?.attemptCount ?? 0) < (data?.maxAttempts ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-950/30 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="relative w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-base font-bold text-neutral-900">SMS 발송 상세</h2>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-5 rounded-md bg-neutral-100 animate-pulse" />
              ))}
            </div>
          ) : data ? (
            <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  상태
                </span>
                <StatusBadge status={data.status} />
              </div>

              {/* Phone */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  수신 번호
                </span>
                <span className="font-mono text-sm text-neutral-800">{data.toPhone}</span>
              </div>

              {/* Template Code */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  템플릿 코드
                </span>
                {data.templateCode ? (
                  <span className="font-mono text-xs bg-neutral-100 rounded px-2 py-0.5 text-neutral-700">
                    {data.templateCode}
                  </span>
                ) : (
                  <span className="text-xs text-neutral-400">없음</span>
                )}
              </div>

              {/* Locale */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  언어
                </span>
                <span className="text-sm text-neutral-700">{data.locale}</span>
              </div>

              {/* Trigger */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  트리거
                </span>
                <TriggerChip trigger={data.triggerEvent} />
              </div>

              {/* Attempt */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                  발송 시도
                </span>
                <span className="text-sm text-neutral-700">
                  {data.attemptCount} / {data.maxAttempts}
                </span>
              </div>

              {/* Provider */}
              {data.provider && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                    프로바이더
                  </span>
                  <span className="text-sm text-neutral-700">{data.provider}</span>
                </div>
              )}

              {/* Message preview */}
              <div>
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  메시지 내용
                </p>
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 font-mono text-sm text-neutral-800 min-h-[80px] whitespace-pre-wrap break-words">
                  {data.content}
                </div>
                <p className="text-right text-xs text-neutral-400 mt-1">
                  {data.content.length}자
                </p>
              </div>

              {/* Error info */}
              {(data.errorCode || data.errorMessage) && (
                <div className="rounded-lg bg-red-50 border border-red-100 p-3">
                  <p className="text-xs font-bold text-red-700 mb-1">오류 정보</p>
                  {data.errorCode && (
                    <p className="text-xs text-red-600">
                      코드: <span className="font-mono">{data.errorCode}</span>
                    </p>
                  )}
                  {data.errorMessage && (
                    <p className="text-xs text-red-600 mt-0.5">{data.errorMessage}</p>
                  )}
                </div>
              )}

              {/* Timestamps */}
              <div className="space-y-2 pt-2 border-t border-neutral-100">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                  타임스탬프
                </p>
                <div className="flex justify-between text-xs">
                  <span className="text-neutral-500">생성일</span>
                  <span className="text-neutral-700">
                    {new Date(data.createdAt).toLocaleString("ko-KR")}
                  </span>
                </div>
                {data.sentAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">발송 시각</span>
                    <span className="text-neutral-700">
                      {new Date(data.sentAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                )}
                {data.nextRetryAt && (
                  <div className="flex justify-between text-xs">
                    <span className="text-neutral-500">다음 재시도</span>
                    <span className="text-neutral-700">
                      {new Date(data.nextRetryAt).toLocaleString("ko-KR")}
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        {canRetry && (
          <div className="flex-shrink-0 border-t border-neutral-100 p-4">
            <button
              onClick={() => onRetry(publicId)}
              disabled={isRetrying}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              {isRetrying ? "재시도 중..." : "재시도"}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────

export default function SmsLogsPage() {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [optimisticStatus, setOptimisticStatus] = useState<Record<string, SmsLogItem["status"]>>(
    {}
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  // Debounce phone input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPhoneFilter(phoneInput);
      setPage(0);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [phoneInput]);

  const { data, isLoading, refetch } = useQuery<SmsLogListResponse>({
    queryKey: ["admin", "sms-logs", page, statusFilter, templateFilter, phoneFilter],
    queryFn: () =>
      getSmsLogs({
        page,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
        templateCode: templateFilter || undefined,
        phone: phoneFilter || undefined,
      }),
  });

  const { data: templatesData } = useQuery<PagedResponse<AdminSmsTemplateItem>>({
    queryKey: ["admin", "sms-templates-all"],
    queryFn: () => getAdminSmsTemplates({ page: 0, size: 100 }),
  });

  const retryMutation = useMutation({
    mutationFn: (publicId: string) => retrySmsLog(publicId),
    onMutate: (publicId) => {
      setOptimisticStatus((prev) => ({ ...prev, [publicId]: "SENDING" }));
    },
    onSuccess: (updated) => {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[updated.publicId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "sms-logs"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "sms-log-detail", updated.publicId],
      });
    },
    onError: (_err, publicId) => {
      setOptimisticStatus((prev) => {
        const next = { ...prev };
        delete next[publicId];
        return next;
      });
    },
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Stats derived from current page (indicative)
  const sentCount = content.filter(
    (l) => l.status === "SENT" || l.status === "DELIVERED"
  ).length;
  const failedCount = content.filter((l) => l.status === "FAILED").length;
  const pendingCount = content.filter(
    (l) => l.status === "PENDING" || l.status === "SENDING"
  ).length;

  const templateOptions = templatesData?.content ?? [];

  const COLUMNS: Column<SmsLogItem>[] = [
    {
      key: "toPhone",
      header: "수신 번호",
      render: (row) => (
        <span className="font-mono text-sm text-neutral-700">{row.toPhone}</span>
      ),
    },
    {
      key: "templateCode",
      header: "템플릿 코드",
      render: (row) =>
        row.templateCode ? (
          <span className="font-mono text-xs bg-neutral-100 rounded px-1.5 py-0.5 text-neutral-700">
            {row.templateCode}
          </span>
        ) : (
          <span className="text-neutral-300 text-xs">—</span>
        ),
    },
    {
      key: "status",
      header: "상태",
      render: (row) => (
        <StatusBadge status={optimisticStatus[row.publicId] ?? row.status} />
      ),
    },
    {
      key: "attemptCount",
      header: "발송 시도",
      render: (row) => (
        <span className="text-sm text-neutral-600 font-mono">
          {row.attemptCount}/{row.maxAttempts}
        </span>
      ),
    },
    {
      key: "sentAt",
      header: "발송 시각",
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {row.sentAt
            ? new Date(row.sentAt).toLocaleString("ko-KR")
            : new Date(row.createdAt).toLocaleString("ko-KR")}
        </span>
      ),
    },
    {
      key: "triggerEvent",
      header: "트리거",
      render: (row) => <TriggerChip trigger={row.triggerEvent} />,
    },
    {
      key: "actions",
      header: "액션",
      render: (row) => {
        const effectiveStatus = optimisticStatus[row.publicId] ?? row.status;
        const canRetry =
          effectiveStatus === "FAILED" && row.attemptCount < row.maxAttempts;
        return (
          <div className="flex items-center gap-2">
            {canRetry && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  retryMutation.mutate(row.publicId);
                }}
                disabled={retryMutation.isPending}
                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                재시도
              </button>
            )}
            <button
              onClick={() => setSelectedId(row.publicId)}
              className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
            >
              상세
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <AdminLayout
      breadcrumbs={[{ label: "대시보드", href: "/dashboard" }, { label: "SMS 발송 내역" }]}
      actions={
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-950">SMS 발송 내역</h1>
          <p className="mt-1 text-sm text-neutral-500">
            SMS 발송 이력 및 상태를 확인하고 실패 건을 재시도합니다.
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-neutral-400" />
              <p className="text-xs text-neutral-500">전체 발송</p>
            </div>
            <p className="text-2xl font-bold text-neutral-900">
              {isLoading ? (
                <span className="inline-block h-7 w-16 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                totalElements.toLocaleString("ko-KR")
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <p className="text-xs text-neutral-500">발송 성공</p>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                sentCount
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <p className="text-xs text-neutral-500">실패</p>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                failedCount
              )}
            </p>
          </div>
          <div className="bg-white rounded-xl border border-neutral-200 p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <p className="text-xs text-neutral-500">재시도 대기</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">
              {isLoading ? (
                <span className="inline-block h-7 w-10 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                pendingCount
              )}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-neutral-200 px-4 py-3 shadow-card">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[120px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {/* Template filter */}
            <select
              value={templateFilter}
              onChange={(e) => {
                setTemplateFilter(e.target.value);
                setPage(0);
              }}
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[160px]"
            >
              <option value="">전체 템플릿</option>
              {templateOptions.map((t) => (
                <option key={t.publicId} value={t.code}>
                  {t.code}
                </option>
              ))}
            </select>

            {/* Phone filter */}
            <input
              type="text"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="전화번호 검색..."
              className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-700 focus:outline-none focus:ring-2 focus:ring-brand-blue min-w-[180px]"
            />

            <p className="text-xs text-neutral-400 ml-auto hidden sm:block">
              날짜 필터는 하단 목록에서 확인하세요
            </p>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-700">발송 목록</h2>
            <p className="text-xs text-neutral-400">
              총 {totalElements.toLocaleString("ko-KR")}건
            </p>
          </div>

          <DataTable<SmsLogItem>
            columns={COLUMNS}
            data={content}
            loading={isLoading}
            skeletonRows={8}
            keyField="publicId"
          />

          <Pagination
            page={page}
            totalPages={totalPages}
            totalElements={totalElements}
            size={PAGE_SIZE}
            onPageChange={setPage}
          />
        </div>
      </div>

      {/* Detail panel */}
      {selectedId && (
        <DetailPanel
          publicId={selectedId}
          onClose={() => setSelectedId(null)}
          onRetry={(id) => retryMutation.mutate(id)}
          isRetrying={retryMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}
