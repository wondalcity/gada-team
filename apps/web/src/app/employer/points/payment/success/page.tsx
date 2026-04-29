"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, AlertCircle, Loader2, Coins } from "lucide-react";
import { employerApi } from "@/lib/employer-api";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const paymentKey = searchParams.get("paymentKey") ?? "";
  const orderId = searchParams.get("orderId") ?? "";
  const amount = Number(searchParams.get("amount") ?? "0");

  const mutation = useMutation({
    mutationFn: () => employerApi.confirmCardPayment(paymentKey, orderId, amount),
  });

  // 페이지 로드 시 자동으로 결제 확인
  React.useEffect(() => {
    if (paymentKey && orderId && amount > 0) {
      mutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center">
        {mutation.isPending && (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-50">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 mb-2">결제 확인 중...</h1>
            <p className="text-sm text-neutral-500">잠시만 기다려 주세요.</p>
          </>
        )}

        {mutation.isSuccess && (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 mb-2">결제 완료!</h1>
            <p className="text-sm text-neutral-500 mb-1">
              {amount.toLocaleString("ko-KR")}원 결제가 완료되었습니다.
            </p>
            <div className="flex items-center justify-center gap-1.5 mb-6">
              <Coins className="h-4 w-4 text-primary-500" />
              <span className="text-base font-bold text-primary-600">
                +{mutation.data?.pointsToAdd}P 충전 완료
              </span>
            </div>
            <button
              onClick={() => router.replace("/employer/points")}
              className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              포인트 페이지로 이동
            </button>
          </>
        )}

        {mutation.isError && (
          <>
            <div className="flex justify-center mb-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <h1 className="text-lg font-bold text-neutral-900 mb-2">결제 확인 실패</h1>
            <p className="text-sm text-red-600 mb-6">
              {(mutation.error as Error).message || "결제 확인 중 오류가 발생했습니다."}
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => mutation.mutate()}
                className="w-full rounded-xl border border-neutral-200 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                다시 시도
              </button>
              <button
                onClick={() => router.replace("/employer/points")}
                className="w-full rounded-xl bg-neutral-100 py-3 text-sm font-semibold text-neutral-600 hover:bg-neutral-200 transition-colors"
              >
                포인트 페이지로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
