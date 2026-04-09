"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle, ClipboardList } from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ApplicationDetailPanel } from "@/components/ApplicationDetailPanel";
import { getAdminApplicationDetail, ApplicationDetail } from "@/lib/api";

// ─── Skeleton ──────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex gap-4">
        <div className="h-14 w-14 rounded-full bg-neutral-200 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 rounded bg-neutral-200" />
          <div className="h-3 w-52 rounded bg-neutral-100" />
          <div className="h-3 w-44 rounded bg-neutral-100" />
        </div>
      </div>
      <div className="h-28 rounded-xl bg-neutral-100" />
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-4">
        <div className="h-4 w-24 rounded bg-neutral-200" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 rounded bg-neutral-100" />
              <div className="h-5 w-28 rounded bg-neutral-200" />
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3">
        <div className="h-4 w-20 rounded bg-neutral-200" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="h-3.5 w-3.5 rounded-full bg-neutral-200 mt-0.5 flex-shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="h-3 w-32 rounded bg-neutral-100" />
              <div className="h-3 w-24 rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <ClipboardList className="h-10 w-10 text-neutral-200" />
      <p className="text-neutral-500 font-medium">지원서를 찾을 수 없습니다</p>
      <Link href="/applications" className="text-sm text-brand-blue hover:underline">
        목록으로 돌아가기
      </Link>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <AlertCircle className="h-10 w-10 text-red-300" />
      <p className="text-sm text-red-500 text-center max-w-xs">{message}</p>
      <button
        onClick={onRetry}
        className="px-4 py-2 rounded-lg border border-neutral-200 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
      >
        다시 시도
      </button>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────

export default function ApplicationDetailPage() {
  const params = useParams();
  const publicId = params.publicId as string;
  const queryClient = useQueryClient();

  const { data, isLoading, isError, error, refetch } = useQuery<ApplicationDetail>({
    queryKey: ["admin", "application", publicId],
    queryFn: () => getAdminApplicationDetail(publicId),
    retry: 1,
  });

  const breadcrumbs = [
    { label: "지원 관리", href: "/applications" },
    { label: data?.workerSnapshot?.fullName ?? "상세" },
  ];

  function handleUpdated(updated: ApplicationDetail) {
    queryClient.setQueryData(["admin", "application", publicId], updated);
    queryClient.invalidateQueries({ queryKey: ["admin", "applications"] });
  }

  return (
    <AdminLayout breadcrumbs={breadcrumbs}>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Back button */}
        <Link
          href="/applications"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          지원 관리로 돌아가기
        </Link>

        {/* Content */}
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-card">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h1 className="text-base font-bold text-neutral-900">지원서 상세</h1>
          </div>

          <div className="p-6">
            {isLoading ? (
              <DetailSkeleton />
            ) : isError ? (
              <ErrorState
                message={(error as Error)?.message ?? "데이터를 불러오지 못했습니다"}
                onRetry={() => refetch()}
              />
            ) : !data ? (
              <NotFound />
            ) : (
              <ApplicationDetailPanel data={data} onUpdated={handleUpdated} />
            )}
          </div>
        </div>

        {/* Metadata footer */}
        {data && (
          <p className="text-xs text-neutral-400 pb-4">
            publicId: {data.publicId} · 지원일:{" "}
            {new Date(data.appliedAt).toLocaleString("ko-KR")}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
