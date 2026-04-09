import * as React from "react";
import { cn } from "../lib/utils";

// ─── Base skeleton ────────────────────────────────────────────

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-200", className)}
      {...props}
    />
  );
}

// ─── Text line skeletons ──────────────────────────────────────

export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  const widths = ["100%", "85%", "70%", "90%", "60%"];
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: widths[i % widths.length] }}
        />
      ))}
    </div>
  );
}

// ─── Avatar skeleton ──────────────────────────────────────────

export function SkeletonAvatar({
  size = "default",
  className,
}: {
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const sizes = { sm: "h-8 w-8", default: "h-10 w-10", lg: "h-14 w-14" };
  return (
    <Skeleton className={cn("rounded-full shrink-0", sizes[size], className)} />
  );
}

// ─── Card skeleton ────────────────────────────────────────────

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-100 bg-white p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <SkeletonAvatar />
        <div className="flex-1 flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <SkeletonText lines={2} />
      <div className="flex gap-2 mt-4">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  );
}

// ─── Table row skeleton ───────────────────────────────────────

export function SkeletonTableRow({
  cols = 5,
  className,
}: {
  cols?: number;
  className?: string;
}) {
  const colWidths = ["w-8", "w-40", "w-24", "w-20", "w-16", "w-28", "w-12"];
  return (
    <tr className={cn("border-b border-neutral-50", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className={cn("h-4", colWidths[i % colWidths.length])} />
        </td>
      ))}
    </tr>
  );
}

// ─── Job card skeleton ────────────────────────────────────────

export function SkeletonJobCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-100 bg-white p-5 shadow-card",
        className
      )}
    >
      <div className="flex items-start gap-3 mb-3">
        <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}
