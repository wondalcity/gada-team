"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  Coins,
  CreditCard,
  Banknote,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  ChevronRight,
  Receipt,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { employerApi, PointBalanceData, PointChargeItem, PagedResponse } from "@/lib/employer-api";
import { useT } from "@/lib/i18n";

// ─── Constants ────────────────────────────────────────────────

const CHARGE_AMOUNTS = [
  { label: "30만원", value: 300_000, points: 30 },
  { label: "50만원", value: 500_000, points: 50 },
  { label: "100만원", value: 1_000_000, points: 100 },
  { label: "300만원", value: 3_000_000, points: 300 },
  { label: "500만원", value: 5_000_000, points: 500 },
];

// ─── Helpers ──────────────────────────────────────────────────

function fmtKrw(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function fmtDatetime(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Status badge ──────────────────────────────────────────────

function ChargeBadge({ status }: { status: string }) {
  const t = useT();
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: {
      label: t("employer.chargeStatusPending"),
      cls: "bg-yellow-50 text-yellow-700 border-yellow-200",
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: t("employer.chargeStatusApproved"),
      cls: "bg-green-50 text-green-700 border-green-200",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    REJECTED: {
      label: t("employer.chargeStatusRejected"),
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: <XCircle className="h-3 w-3" />,
    },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-neutral-50 text-neutral-700 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Charge request form ───────────────────────────────────────

function ChargeForm({ onSuccess }: { onSuccess: () => void }) {
  const t = useT();
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD">("CASH");
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tossLoading, setTossLoading] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedAmount) throw new Error(t("employer.loadFailed"));
      return employerApi.requestCharge(selectedAmount, paymentMethod);
    },
    onSuccess: () => {
      setToast(t("employer.chargeSubmitted"));
      setSelectedAmount(null);
      setTimeout(() => setToast(null), 5000);
      onSuccess();
    },
    onError: (err: Error) => {
      setError(err.message);
      setTimeout(() => setError(null), 5000);
    },
  });

  async function handleCardPayment() {
    if (!selectedAmount) return;
    setTossLoading(true);
    setError(null);
    try {
      const { loadTossPayments } = await import("@tosspayments/tosspayments-sdk");
      const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
      if (!clientKey) throw new Error("토스페이먼츠 클라이언트 키가 설정되지 않았습니다.");
      const tossPayments = await loadTossPayments(clientKey);
      // payment() requires an "API 개별 연동 키" and a unique per-transaction customerKey.
      // ANONYMOUS is only supported for widgets(), not payment().
      const customerKey = crypto.randomUUID();
      const payment = tossPayments.payment({ customerKey });
      const orderId = crypto.randomUUID();
      const opts = CHARGE_AMOUNTS.find((a) => a.value === selectedAmount)!;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: selectedAmount },
        orderId,
        orderName: `가다 포인트 ${opts.points}P 충전`,
        successUrl: `${window.location.origin}/employer/points/payment/success`,
        failUrl: `${window.location.origin}/employer/points/payment/fail`,
      });
    } catch (err: any) {
      // 사용자가 취소하거나 실패한 경우
      if (err?.code !== "USER_CANCEL") {
        setError(err?.message ?? "결제 중 오류가 발생했습니다.");
      }
    } finally {
      setTossLoading(false);
    }
  }

  function handleSubmit() {
    if (paymentMethod === "CARD") {
      handleCardPayment();
    } else {
      mutation.mutate();
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900 mb-1">
        {t("employer.pointChargeTitle")}
      </h2>
      <p className="text-sm text-neutral-500 mb-6">{t("employer.pointChargeDesc")}</p>

      {/* Amount selector */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          {t("employer.chargeAmount")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:grid-cols-5">
          {CHARGE_AMOUNTS.map((opt) => {
            const selected = selectedAmount === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedAmount(opt.value)}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border p-3 transition-all",
                  selected
                    ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                    : "border-neutral-200 bg-white hover:border-primary-300 hover:bg-primary-50/50"
                )}
              >
                <span className={cn("text-sm font-bold", selected ? "text-primary-700" : "text-neutral-900")}>
                  {opt.label}
                </span>
                <span className={cn("text-xs mt-0.5", selected ? "text-primary-500" : "text-neutral-500")}>
                  {opt.points}P
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment method */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">
          {t("employer.paymentMethod")}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-xl border p-3 transition-all",
              paymentMethod === "CASH"
                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                : "border-neutral-200 bg-white hover:border-primary-300"
            )}
          >
            <Banknote
              className={cn("h-5 w-5 flex-shrink-0", paymentMethod === "CASH" ? "text-primary-600" : "text-neutral-400")}
            />
            <div className="text-left">
              <p className={cn("text-sm font-semibold", paymentMethod === "CASH" ? "text-primary-700" : "text-neutral-800")}>
                {t("employer.paymentCash")}
              </p>
              <p className="text-xs text-neutral-500">{t("employer.bankTransfer")}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("CARD")}
            className={cn(
              "flex flex-1 items-center gap-2.5 rounded-xl border p-3 transition-all",
              paymentMethod === "CARD"
                ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                : "border-neutral-200 bg-white hover:border-primary-300"
            )}
          >
            <CreditCard
              className={cn("h-5 w-5 flex-shrink-0", paymentMethod === "CARD" ? "text-primary-600" : "text-neutral-400")}
            />
            <div className="text-left">
              <p className={cn("text-sm font-semibold", paymentMethod === "CARD" ? "text-primary-700" : "text-neutral-800")}>
                {t("employer.paymentCard")}
              </p>
              <p className="text-xs text-neutral-500">{t("employer.creditCard")}</p>
            </div>
          </button>
        </div>
      </div>

      {/* Summary */}
      {selectedAmount && (
        <div className="mb-5 rounded-xl border border-primary-200 bg-primary-50/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">{t("employer.chargeAmountSummary")}</span>
            <span className="font-semibold text-neutral-900">{fmtKrw(selectedAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1.5">
            <span className="text-neutral-600">{t("employer.pointsGranted")}</span>
            <span className="font-bold text-primary-600">
              +{CHARGE_AMOUNTS.find((a) => a.value === selectedAmount)?.points}P
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1.5">
            <span className="text-neutral-600">{t("employer.paymentMethodSummary")}</span>
            <span className="font-medium text-neutral-700">
              {paymentMethod === "CASH" ? t("employer.paymentCash") : t("employer.paymentCard")}
            </span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {toast && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedAmount || mutation.isPending || tossLoading}
        onClick={handleSubmit}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold transition-all",
          selectedAmount && !mutation.isPending && !tossLoading
            ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
            : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
        )}
      >
        {mutation.isPending || tossLoading
          ? t("employer.processingBtn")
          : paymentMethod === "CARD"
          ? "카드 결제하기"
          : t("employer.pointChargeRequest")}
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function EmployerPointsPage() {
  const t = useT();
  const queryClient = useQueryClient();

  const { data: balance, isLoading: balanceLoading } = useQuery<PointBalanceData>({
    queryKey: ["employer", "points"],
    queryFn: () => employerApi.getPointBalance(),
  });

  const { data: history, isLoading: historyLoading } = useQuery<PagedResponse<PointChargeItem>>({
    queryKey: ["employer", "points", "charges"],
    queryFn: () => employerApi.listChargeRequests(0, 20),
  });

  const handleChargeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["employer", "points"] });
  };

  const pendingCount = history?.content.filter((c) => c.status === "PENDING").length ?? 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      {/* Back link */}
      <Link
        href="/employer/teams"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("employer.pointsBack")}
      </Link>

      {/* Balance card */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Coins className="h-5 w-5 text-primary-500" />
              <h1 className="text-base font-semibold text-neutral-700">{t("employer.pointBalance")}</h1>
            </div>
            <p className="text-4xl font-extrabold text-neutral-950 tracking-tight">
              {balanceLoading ? (
                <span className="inline-block h-10 w-20 rounded-md bg-neutral-100 animate-pulse" />
              ) : (
                <>{balance?.balance ?? 0}<span className="text-2xl font-bold text-primary-500 ml-1">P</span></>
              )}
            </p>
            <p className="text-sm text-neutral-500 mt-1">{t("employer.pointBalanceDesc")}</p>
          </div>
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-1.5 text-xs font-semibold text-yellow-700">
              <Clock className="h-3 w-3" />
              {t("employer.pendingCountLabel", pendingCount)}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500 mb-1">{t("employer.pointTotalCharged")}</p>
            <p className="text-lg font-bold text-neutral-800">
              {balanceLoading ? (
                <span className="inline-block h-5 w-12 rounded bg-neutral-200 animate-pulse" />
              ) : (
                <>{balance?.totalCharged ?? 0}P</>
              )}
            </p>
          </div>
          <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs text-neutral-500 mb-1">{t("employer.pointUsed")}</p>
            <p className="text-lg font-bold text-neutral-800">
              {balanceLoading ? (
                <span className="inline-block h-5 w-12 rounded bg-neutral-200 animate-pulse" />
              ) : (
                <>{balance?.totalUsed ?? 0}P</>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Charge form */}
      <ChargeForm onSuccess={handleChargeSuccess} />

      {/* Recent charge history (compact) */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
          <h2 className="text-sm font-semibold text-neutral-800">{t("employer.recentCharges")}</h2>
          <Link
            href="/employer/payments"
            className="text-xs text-primary-500 hover:text-primary-700 font-medium transition-colors"
          >
            {t("employer.viewAll")}
          </Link>
        </div>

        {historyLoading ? (
          <div className="divide-y divide-neutral-100">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="h-4 w-24 rounded bg-neutral-100 animate-pulse" />
                  <div className="h-3 w-32 rounded bg-neutral-100 animate-pulse" />
                </div>
                <div className="h-5 w-16 rounded-full bg-neutral-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : !history?.content.length ? (
          <div className="py-10 text-center">
            <Coins className="h-8 w-8 text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">{t("employer.noChargeHistory")}</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {history.content.slice(0, 3).map((item) => (
              <div key={item.publicId} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      {fmtKrw(item.amountKrw)}
                    </span>
                    <span className="text-sm text-primary-600 font-medium">
                      +{item.pointsToAdd}P
                    </span>
                    <span className="text-xs text-neutral-400">
                      {item.paymentMethod === "CASH" ? t("employer.paymentCashShort") : t("employer.paymentCardShort")}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5">{fmtDatetime(item.createdAt)}</p>
                </div>
                <ChargeBadge status={item.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/employer/payments"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 hover:bg-neutral-50 transition-colors shadow-sm group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 flex-shrink-0 group-hover:bg-primary-50 transition-colors">
            <Receipt className="h-4 w-4 text-neutral-500 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{t("employer.paymentMgmtLabel")}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("employer.chargeHistoryDesc")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 ml-auto transition-colors" />
        </Link>
        <Link
          href="/employer/proposals"
          className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-5 py-4 hover:bg-neutral-50 transition-colors shadow-sm group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-50 flex-shrink-0 group-hover:bg-primary-50 transition-colors">
            <Send className="h-4 w-4 text-neutral-500 group-hover:text-primary-500 transition-colors" />
          </div>
          <div>
            <p className="text-sm font-semibold text-neutral-800">{t("employer.proposalHistory")}</p>
            <p className="text-xs text-neutral-500 mt-0.5">{t("employer.proposalSentDesc")}</p>
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-300 group-hover:text-neutral-500 ml-auto transition-colors" />
        </Link>
      </div>
    </div>
  );
}
