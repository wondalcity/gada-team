"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { HardHat } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 px-4 text-center">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-500">
          <HardHat className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-lg text-neutral-900">
          GADA<span className="text-primary-500">.</span>
        </span>
      </Link>

      <p className="text-7xl font-black text-neutral-200">404</p>
      <h1 className="mt-4 text-xl font-bold text-neutral-800">페이지를 찾을 수 없습니다</h1>
      <p className="mt-2 text-sm text-neutral-500 max-w-xs">
        요청하신 페이지가 존재하지 않거나 이동되었습니다.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-neutral-200 bg-white px-5 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          이전 페이지
        </button>
        <Link
          href="/"
          className="rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
        >
          홈으로
        </Link>
      </div>
    </div>
  );
}
