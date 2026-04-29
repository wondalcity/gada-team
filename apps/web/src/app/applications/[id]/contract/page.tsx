"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardSignature,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ExternalLink,
  CalendarDays,
  Banknote,
  FileText,
  AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { contractsApi, type ContractDetail, type ContractStatus } from "@/lib/contracts-api";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// ─── Status badge ─────────────────────────────────────────────────────────────

function ContractStatusBadge({ status }: { status: ContractStatus }) {
  const t = useT();
  const map: Record<ContractStatus, string> = {
    DRAFT: "bg-neutral-100 text-neutral-500",
    SENT: "bg-primary-50 text-primary-700 border border-primary-200",
    SIGNED: "bg-success-50 text-success-700 border border-success-200",
    EXPIRED: "bg-neutral-100 text-neutral-400",
    CANCELLED: "bg-danger-50 text-danger-600",
  };
  const icons: Record<ContractStatus, React.ReactNode> = {
    DRAFT: <Clock className="h-3 w-3" />,
    SENT: <Clock className="h-3 w-3" />,
    SIGNED: <CheckCircle2 className="h-3 w-3" />,
    EXPIRED: <XCircle className="h-3 w-3" />,
    CANCELLED: <XCircle className="h-3 w-3" />,
  };

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", map[status])}>
      {icons[status]}
      {t(`app.contractStatus.${status}` as any) || status}
    </span>
  );
}

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function SignConfirmDialog({
  open,
  onConfirm,
  onCancel,
  isPending,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
            <ClipboardSignature className="h-6 w-6 text-primary-500" />
          </div>
          <h3 className="text-base font-bold text-neutral-950">{t("app.contractSignBtn")}</h3>
          <p className="mt-2 text-sm text-neutral-500 leading-relaxed">
            {t("app.contractSignConfirm")}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex-1 rounded-lg border border-neutral-200 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              disabled={isPending}
              className="flex-1 rounded-lg bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
            >
              {isPending ? "처리 중..." : t("app.contractSignBtn")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Contract detail content ──────────────────────────────────────────────────

function ContractDetailContent({ applicationPublicId }: { applicationPublicId: string }) {
  const t = useT();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [signed, setSigned] = React.useState(false);

  const { data: contract, isLoading, isError } = useQuery({
    queryKey: ["contract-by-app", applicationPublicId],
    queryFn: () => contractsApi.getByApplication(applicationPublicId),
    retry: false,
  });

  const signMutation = useMutation({
    mutationFn: () => contractsApi.sign(contract!.publicId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["contract-by-app", applicationPublicId], updated);
      setSigned(true);
      setConfirmOpen(false);
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4 animate-pulse">
        <div className="h-7 w-1/3 rounded bg-neutral-200" />
        <div className="rounded-xl border border-neutral-100 bg-white p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-4 rounded bg-neutral-100" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-neutral-300" />
        <p className="font-semibold text-neutral-700">아직 발송된 계약서가 없어요.</p>
        <p className="mt-1 text-sm text-neutral-500">
          업체에서 계약서를 발송하면 여기서 확인하고 서명할 수 있어요.
        </p>
        <Link
          href="/applications"
          className="mt-5 inline-block rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          지원 현황으로
        </Link>
      </div>
    );
  }

  const canSign = contract.status === "SENT";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/applications"
          className="mb-3 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          내 지원 현황
        </Link>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-xl font-extrabold text-neutral-950">{t("app.contractTitle")}</h1>
          <ContractStatusBadge status={contract.status as ContractStatus} />
        </div>
        {contract.jobTitle && (
          <p className="mt-1 text-sm text-neutral-500">{contract.jobTitle}</p>
        )}
      </div>

      {/* Sign success banner */}
      {signed && (
        <div className="flex items-center gap-2 rounded-xl bg-success-50 border border-success-200 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-success-600 flex-shrink-0" />
          <p className="text-sm font-medium text-success-700">{t("app.contractSignSuccess")}</p>
        </div>
      )}

      {/* Contract info card */}
      <div className="rounded-xl border border-neutral-100 bg-white shadow-card-md overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-800">계약 정보</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Dates */}
          {(contract.startDate || contract.endDate) && (
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">
                  {t("app.contractStartDate")} ~ {t("app.contractEndDate")}
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {contract.startDate
                    ? new Date(contract.startDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
                    : "—"}
                  {" ~ "}
                  {contract.endDate
                    ? new Date(contract.endDate).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
                    : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Pay */}
          {contract.payAmount && (
            <div className="flex items-start gap-3">
              <Banknote className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
              <div>
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">
                  {t("app.contractPay")}
                </p>
                <p className="text-sm font-medium text-neutral-800">
                  {contract.payAmount.toLocaleString("ko-KR")}원
                  {contract.payUnit ? ` / ${contract.payUnit}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Terms */}
          {contract.terms && (
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-neutral-400" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-0.5">
                  {t("app.contractTerms")}
                </p>
                <p className="text-sm text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {contract.terms}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Document link */}
        {contract.documentUrl && (
          <div className="border-t border-neutral-100 px-5 py-3">
            <a
              href={contract.documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("app.contractDocument")} 열기
            </a>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="rounded-xl border border-neutral-100 bg-white shadow-card-md overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-bold text-neutral-800">서명 현황</h2>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
              contract.sentAt ? "bg-success-500 text-white" : "bg-neutral-200 text-neutral-400"
            )}>
              {contract.sentAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : "1"}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">업체 발송</p>
              {contract.sentAt && (
                <p className="text-xs text-neutral-400">
                  {new Date(contract.sentAt).toLocaleDateString("ko-KR")}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn("flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
              contract.workerSignedAt ? "bg-success-500 text-white" : "bg-neutral-200 text-neutral-400"
            )}>
              {contract.workerSignedAt ? <CheckCircle2 className="h-3.5 w-3.5" /> : "2"}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-800">근로자 서명</p>
              {contract.workerSignedAt ? (
                <p className="text-xs text-neutral-400">
                  {new Date(contract.workerSignedAt).toLocaleDateString("ko-KR")}
                </p>
              ) : (
                <p className="text-xs text-neutral-400">대기 중</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sign button */}
      {canSign && (
        <div className="sticky bottom-4">
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 py-4 text-sm font-bold text-white shadow-lg hover:bg-primary-600 transition-colors"
          >
            <ClipboardSignature className="h-5 w-5" />
            {t("app.contractSignBtn")}
          </button>
        </div>
      )}

      <SignConfirmDialog
        open={confirmOpen}
        onConfirm={() => signMutation.mutate()}
        onCancel={() => setConfirmOpen(false)}
        isPending={signMutation.isPending}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContractPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <AppLayout>
      <ContractDetailContent applicationPublicId={id ?? ""} />
    </AppLayout>
  );
}
