"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { useT } from "@/lib/i18n";

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const t = useT();

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
          {isUserCancel ? t("payment.canceled") : t("payment.failed")}
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          {isUserCancel
            ? t("payment.canceledDesc")
            : message ?? t("payment.failedDesc")}
        </p>
        <button
          onClick={() => router.replace("/employer/points")}
          className="w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          {t("payment.tryAgain")}
        </button>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense>
      <PaymentFailContent />
    </Suspense>
  );
}
