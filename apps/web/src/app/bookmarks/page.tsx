"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart, Briefcase, MapPin, ChevronLeft, Trash2, AlertCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  getMyBookmarks,
  removeJobBookmark,
  JobBookmarkItem,
  PagedResponse,
} from "@/lib/api";
import { formatPay } from "@/components/jobs/JobCard";

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  PUBLISHED: "모집 중",
  PAUSED: "일시 중지",
  CLOSED: "마감",
  ARCHIVED: "종료",
  DRAFT: "임시저장",
};

export default function BookmarksPage() {
  const [page, setPage] = React.useState(0);
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery<PagedResponse<JobBookmarkItem>>({
    queryKey: ["bookmarks", page],
    queryFn: () => getMyBookmarks({ page, size: PAGE_SIZE }),
  });

  const removeMutation = useMutation({
    mutationFn: (jobPublicId: string) => removeJobBookmark(jobPublicId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookmarks"] }),
  });

  const content = data?.content ?? [];
  const totalElements = data?.totalElements ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/jobs"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-neutral-600" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 fill-pink-500 text-pink-500" />
              <h1 className="text-xl font-bold text-neutral-900">찜한 공고</h1>
            </div>
            {!isLoading && (
              <p className="text-sm text-neutral-500">총 {totalElements.toLocaleString("ko-KR")}건</p>
            )}
          </div>
        </div>

        {/* Error */}
        {isError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>불러오지 못했습니다.</span>
            <button onClick={() => refetch()} className="ml-auto text-red-600 underline">재시도</button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4">
                <div className="mb-2 h-4 w-3/4 rounded bg-neutral-100" />
                <div className="h-3 w-1/2 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!isLoading && content.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Heart className="mb-4 h-12 w-12 text-neutral-200" />
            <p className="text-base font-medium text-neutral-500">찜한 공고가 없습니다</p>
            <p className="mt-1 text-sm text-neutral-400">마음에 드는 공고를 찜해보세요</p>
            <Link
              href="/jobs"
              className="mt-4 rounded-lg bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
            >
              공고 보러 가기
            </Link>
          </div>
        )}

        {/* List */}
        {!isLoading && content.length > 0 && (
          <div className="space-y-3">
            {content.map((item) => (
              <div
                key={item.bookmarkId}
                className="group rounded-xl border border-neutral-200 bg-white hover:border-primary-200 hover:shadow-card-md transition-all"
              >
                <Link href={`/jobs/${item.publicId}`} className="block p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                            item.status === "PUBLISHED"
                              ? "bg-success-50 text-success-700 border border-success-200"
                              : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                          }`}
                        >
                          {STATUS_LABELS[item.status] ?? item.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-neutral-900 line-clamp-2">{item.title}</h3>
                      <p className="mt-0.5 text-sm text-neutral-500">{item.companyName}</p>
                      {(item.sido || item.sigungu) && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                          <MapPin className="h-3 w-3" />
                          {[item.sido, item.sigungu].filter(Boolean).join(" ")}
                        </div>
                      )}
                      <p className="mt-1.5 text-sm font-semibold text-primary-500">
                        {formatPay(item.payMin, item.payMax, item.payUnit)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <Briefcase className="h-8 w-8 rounded-lg bg-primary-50 p-1.5 text-primary-400" />
                    </div>
                  </div>
                </Link>

                <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2">
                  <span className="text-xs text-neutral-400">
                    찜한 날짜: {new Date(item.bookmarkedAt).toLocaleDateString("ko-KR")}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("찜을 취소하시겠습니까?")) {
                        removeMutation.mutate(item.publicId);
                      }
                    }}
                    disabled={removeMutation.isPending}
                    className="flex items-center gap-1 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1 text-xs font-medium text-pink-600 hover:bg-pink-100 transition-colors disabled:opacity-40"
                  >
                    <Trash2 className="h-3 w-3" />
                    찜 취소
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              이전
            </button>
            <span className="text-sm text-neutral-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50 disabled:opacity-40"
            >
              다음
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
