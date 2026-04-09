import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors",
  {
    variants: {
      variant: {
        blue: "bg-brand-blue-50 text-brand-blue border border-brand-blue/20",
        yellow: "bg-brand-yellow-50 text-yellow-700 border border-brand-yellow/30",
        green: "bg-green-50 text-green-700 border border-green-200",
        red: "bg-red-50 text-red-700 border border-red-200",
        orange: "bg-orange-50 text-orange-700 border border-orange-200",
        purple: "bg-purple-50 text-purple-700 border border-purple-200",
        gray: "bg-neutral-100 text-neutral-600 border border-neutral-200",
        dark: "bg-neutral-900 text-white border border-neutral-900",
      },
      size: {
        sm: "text-xs px-2 py-0.5",
        default: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1",
      },
    },
    defaultVariants: {
      variant: "gray",
      size: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  children?: React.ReactNode;
}

function Badge({ className, variant, size, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, className }))} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full flex-shrink-0",
            variant === "blue" && "bg-brand-blue",
            variant === "yellow" && "bg-brand-yellow",
            variant === "green" && "bg-green-500",
            variant === "red" && "bg-red-500",
            variant === "orange" && "bg-orange-500",
            variant === "purple" && "bg-purple-500",
            variant === "gray" && "bg-neutral-400",
            variant === "dark" && "bg-white"
          )}
        />
      )}
      {children}
    </span>
  );
}

// Semantic shorthand for common statuses
export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: BadgeProps["variant"] }> = {
    PENDING: { label: "검토 대기", variant: "yellow" },
    REVIEWING: { label: "검토 중", variant: "blue" },
    SHORTLISTED: { label: "서류 통과", variant: "purple" },
    ACCEPTED: { label: "합격", variant: "green" },
    REJECTED: { label: "불합격", variant: "red" },
    WITHDRAWN: { label: "취소", variant: "gray" },
    CANCELLED: { label: "취소됨", variant: "gray" },
    PUBLISHED: { label: "게시 중", variant: "green" },
    DRAFT: { label: "초안", variant: "gray" },
    PAUSED: { label: "일시정지", variant: "orange" },
    CLOSED: { label: "마감", variant: "gray" },
    ACTIVE: { label: "활성", variant: "green" },
    INACTIVE: { label: "비활성", variant: "gray" },
    SUSPENDED: { label: "정지", variant: "red" },
    OPEN: { label: "모집 중", variant: "blue" },
  };
  const config = map[status] ?? { label: status, variant: "gray" as const };
  return (
    <Badge variant={config.variant} dot>
      {config.label}
    </Badge>
  );
}

export { Badge, badgeVariants };
