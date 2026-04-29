"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const code = searchParams.get("code");
  const message = searchParams.get("message");

  const isUserCancel = code === "PAY_PROCESS_CANCELED";

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-neutral-200 shadow-sm p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>
        <h1 className="text-lg font-bold text-neutral-900 mb-2">
          {isUserCancel ? "결제 취소됨" : "결제 실패"}
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          {isUserCancel
            ? "결제가 취소되었습니다."
            : message ?? "결제 처리 중 문제가 발생했습니다."}
        </p>
        <button
          onClick={() => router.replace("/employer/points")}
          className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          다시 시도하기
        </button>
      </div>
    </div>
  );
}
