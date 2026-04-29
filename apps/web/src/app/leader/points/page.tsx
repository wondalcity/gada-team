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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { workerPointsApi, TlPointBalanceResponse } from "@/lib/chat-api";
import { api } from "@/lib/api";
import { AppLayout } from "@/components/layout/AppLayout";

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
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });
}

interface TlChargeItem {
  publicId: string;
  amountKrw: number;
  pointsToAdd: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}

function ChargeBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    PENDING: { label: "검토 중", cls: "bg-yellow-50 text-yellow-700 border-yellow-200", icon: <Clock className="h-3 w-3" /> },
    APPROVED: { label: "승인됨", cls: "bg-green-50 text-green-700 border-green-200", icon: <CheckCircle2 className="h-3 w-3" /> },
    REJECTED: { label: "거절됨", cls: "bg-red-50 text-red-700 border-red-200", icon: <XCircle className="h-3 w-3" /> },
  };
  const cfg = map[status] ?? { label: status, cls: "bg-neutral-50 text-neutral-700 border-neutral-200", icon: null };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", cfg.cls)}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Charge Form ───────────────────────────────────────────────

function ChargeForm({ onSuccess }: { onSuccess: () => void }) {
  const [selectedAmount, setSelectedAmount] = React.useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = React.useState<"CASH" | "CARD">("CASH");
  const [toast, setToast] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [tossLoading, setTossLoading] = React.useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedAmount) throw new Error("금액을 선택해주세요.");
      return api.post("/worker/points/charges", { amountKrw: selectedAmount, paymentMethod });
    },
    onSuccess: () => {
      setToast("충전 요청이 접수되었습니다. 관리자 승인 후 포인트가 지급됩니다.");
      setSelectedAmount(null);
      setTimeout(() => setToast(null), 6000);
      onSuccess();
    },
    onError: (err: any) => {
      setError(err?.message ?? "충전 요청에 실패했습니다.");
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
      const customerKey = crypto.randomUUID();
      const payment = tossPayments.payment({ customerKey });
      const orderId = crypto.randomUUID();
      const opts = CHARGE_AMOUNTS.find((a) => a.value === selectedAmount)!;
      await payment.requestPayment({
        method: "CARD",
        amount: { currency: "KRW", value: selectedAmount },
        orderId,
        orderName: `가다 팀장 포인트 ${opts.points}P 충전`,
        successUrl: `${window.location.origin}/leader/points/payment/success`,
        failUrl: `${window.location.origin}/leader/points/payment/fail`,
      });
    } catch (err: any) {
      if (err?.code !== "USER_CANCEL") {
        setError(err?.message ?? "결제 중 오류가 발생했습니다.");
      }
    } finally {
      setTossLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-neutral-900 mb-1">포인트 충전</h2>
      <p className="text-sm text-neutral-500 mb-6">1만원 = 1P · 충전 포인트로 팀원 채팅을 시작할 수 있어요</p>

      {/* Amount selector */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">충전 금액</p>
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
                <span className={cn("text-sm font-bold", selected ? "text-primary-700" : "text-neutral-900")}>{opt.label}</span>
                <span className={cn("text-xs mt-0.5", selected ? "text-primary-500" : "text-neutral-500")}>{opt.points}P</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment method */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-neutral-700 uppercase tracking-wide mb-3">결제 수단</p>
        <div className="flex gap-3">
          {(["CASH", "CARD"] as const).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={cn(
                "flex flex-1 items-center gap-2.5 rounded-xl border p-3 transition-all",
                paymentMethod === method
                  ? "border-primary-500 bg-primary-50 ring-2 ring-primary-200"
                  : "border-neutral-200 bg-white hover:border-primary-300"
              )}
            >
              {method === "CASH"
                ? <Banknote className={cn("h-5 w-5 flex-shrink-0", paymentMethod === "CASH" ? "text-primary-600" : "text-neutral-400")} />
                : <CreditCard className={cn("h-5 w-5 flex-shrink-0", paymentMethod === "CARD" ? "text-primary-600" : "text-neutral-400")} />
              }
              <div className="text-left">
                <p className={cn("text-sm font-semibold", paymentMethod === method ? "text-primary-700" : "text-neutral-800")}>
                  {method === "CASH" ? "무통장 입금" : "카드 결제"}
                </p>
                <p className="text-xs text-neutral-500">{method === "CASH" ? "계좌이체" : "신용/체크카드"}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      {selectedAmount && (
        <div className="mb-5 rounded-xl border border-primary-200 bg-primary-50/60 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-600">충전 금액</span>
            <span className="font-semibold text-neutral-900">{fmtKrw(selectedAmount)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1.5">
            <span className="text-neutral-600">지급 포인트</span>
            <span className="font-bold text-primary-600">+{CHARGE_AMOUNTS.find((a) => a.value === selectedAmount)?.points}P</span>
          </div>
        </div>
      )}

      {toast && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />{toast}
        </div>
      )}
      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
        </div>
      )}

      <button
        type="button"
        disabled={!selectedAmount || mutation.isPending || tossLoading}
        onClick={() => paymentMethod === "CARD" ? handleCardPayment() : mutation.mutate()}
        className={cn(
          "w-full rounded-xl py-3 text-sm font-semibold transition-all",
          selectedAmount && !mutation.isPending && !tossLoading
            ? "bg-primary-500 text-white hover:bg-primary-600 shadow-sm"
            : "bg-neutral-100 text-neutral-400 cursor-not-allowed"
        )}
      >
        {mutation.isPending || tossLoading ? "처리 중..." : paymentMethod === "CARD" ? "카드 결제하기" : "충전 요청하기"}
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function LeaderPointsPage() {
  const queryClient = useQueryClient();

  const { data: balance, isLoading: balanceLoading } = useQuery<TlPointBalanceResponse>({
    queryKey: ["tl-point-balance"],
    queryFn: () => workerPointsApi.getBalance(),
  });

  const { data: history, isLoading: historyLoading } = useQuery<{ content: TlChargeItem[] }>({
    queryKey: ["tl-point-charges"],
    queryFn: () => api.get("/worker/points/charges?page=0&size=5"),
  });

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <Link
          href="/teams/mine"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          내 팀으로 돌아가기
        </Link>

        {/* Balance card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="h-5 w-5 text-primary-500" />
            <h1 className="text-base font-semibold text-neutral-700">팀장 포인트 잔액</h1>
          </div>
          <p className="text-4xl font-extrabold text-neutral-950 tracking-tight">
            {balanceLoading ? (
              <span className="inline-block h-10 w-20 rounded-md bg-neutral-100 animate-pulse" />
            ) : (
              <>{balance?.balance ?? 0}<span className="text-2xl font-bold text-primary-500 ml-1">P</span></>
            )}
          </p>
          <p className="text-sm text-neutral-500 mt-1">팀원 채팅 시작 시 1P가 차감됩니다</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500 mb-1">총 충전량</p>
              <p className="text-lg font-bold text-neutral-800">{balance?.totalCharged ?? 0}P</p>
            </div>
            <div className="rounded-xl border border-neutral-100 bg-neutral-50 p-3">
              <p className="text-xs text-neutral-500 mb-1">총 사용량</p>
              <p className="text-lg font-bold text-neutral-800">{balance?.totalUsed ?? 0}P</p>
            </div>
          </div>
        </div>

        <ChargeForm onSuccess={() => queryClient.invalidateQueries({ queryKey: ["tl-point-balance", "tl-point-charges"] })} />

        {/* Recent charge history */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-800">충전 내역</h2>
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
              <p className="text-sm text-neutral-400">충전 내역이 없습니다</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {history.content.map((item) => (
                <div key={item.publicId} className="px-5 py-3.5 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900">{fmtKrw(item.amountKrw)}</span>
                      <span className="text-sm text-primary-600 font-medium">+{item.pointsToAdd}P</span>
                      <span className="text-xs text-neutral-400">{item.paymentMethod === "CASH" ? "무통장" : "카드"}</span>
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">{fmtDatetime(item.createdAt)}</p>
                  </div>
                  <ChargeBadge status={item.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
