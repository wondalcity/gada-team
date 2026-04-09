"use client";

import { cn } from "@gada/ui";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface PaginationProps {
  page: number; // 0-indexed
  totalPages: number;
  totalElements: number;
  size: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  totalElements,
  size,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 0) return null;

  const from = totalElements === 0 ? 0 : page * size + 1;
  const to = Math.min((page + 1) * size, totalElements);

  // Build page number array: max 5 around current
  const pages: number[] = [];
  const half = 2;
  let start = Math.max(0, page - half);
  let end = Math.min(totalPages - 1, page + half);
  if (end - start < 4) {
    if (start === 0) end = Math.min(totalPages - 1, 4);
    else start = Math.max(0, end - 4);
  }
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-100">
      <p className="text-xs text-neutral-500">
        {from}–{to} / 총 {totalElements.toLocaleString("ko-KR")}개
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors",
            page === 0
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-neutral-100 hover:border-neutral-300"
          )}
          aria-label="이전 페이지"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {start > 0 && (
          <>
            <button
              onClick={() => onPageChange(0)}
              className="flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-neutral-200 px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
            >
              1
            </button>
            {start > 1 && (
              <span className="px-1 text-neutral-400 text-xs">…</span>
            )}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              "flex h-8 min-w-[32px] items-center justify-center rounded-lg border px-2 text-xs font-medium transition-colors",
              p === page
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300"
            )}
          >
            {p + 1}
          </button>
        ))}

        {end < totalPages - 1 && (
          <>
            {end < totalPages - 2 && (
              <span className="px-1 text-neutral-400 text-xs">…</span>
            )}
            <button
              onClick={() => onPageChange(totalPages - 1)}
              className="flex h-8 min-w-[32px] items-center justify-center rounded-lg border border-neutral-200 px-2 text-xs text-neutral-600 hover:bg-neutral-100 hover:border-neutral-300 transition-colors"
            >
              {totalPages}
            </button>
          </>
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 transition-colors",
            page >= totalPages - 1
              ? "opacity-40 cursor-not-allowed"
              : "hover:bg-neutral-100 hover:border-neutral-300"
          )}
          aria-label="다음 페이지"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
