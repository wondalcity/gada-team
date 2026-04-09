"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppLayout } from "@/components/layout/AppLayout";
import { isMockMode, MOCK_EMPLOYER_USER } from "@/lib/employer-mock";

export default function EmployerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const [mockActive, setMockActive] = useState(false);

  // Inject mock EMPLOYER user when demo mode is enabled and no real user exists
  useEffect(() => {
    if (isMockMode()) {
      setMockActive(true);
      if (!user || user.role !== "EMPLOYER") {
        setUser(MOCK_EMPLOYER_USER);
      }
      return;
    }
    if (user && user.role !== "EMPLOYER") {
      router.replace("/");
    } else if (!user) {
      router.replace("/login");
    }
  }, [user, router, setUser]);

  const isReady = mockActive
    ? !!user && user.role === "EMPLOYER"
    : user?.role === "EMPLOYER";

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppLayout>
      {mockActive && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center">
          <p className="text-xs text-amber-700 font-medium">
            데모 모드 — 더미 데이터가 표시됩니다.{" "}
            <button
              onClick={() => {
                localStorage.removeItem("gada_mock_employer");
                useAuthStore.getState().clear();
                location.reload();
              }}
              className="underline hover:no-underline ml-1"
            >
              해제
            </button>
          </p>
        </div>
      )}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </div>
    </AppLayout>
  );
}
