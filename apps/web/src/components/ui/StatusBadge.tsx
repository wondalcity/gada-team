"use client"

import { cn } from "@/lib/utils"

export type BadgeVariant =
  | "gray" | "blue" | "green" | "red" | "amber" | "purple" | "indigo" | "orange"

const variantClasses: Record<BadgeVariant, string> = {
  gray:   "bg-neutral-100 text-neutral-600",
  blue:   "bg-primary-100 text-primary-700",
  green:  "bg-success-100 text-success-700",
  red:    "bg-danger-100 text-danger-700",
  amber:  "bg-warning-100 text-warning-700",
  purple: "bg-secondary-100 text-secondary-600",
  indigo: "bg-secondary-100 text-secondary-600",
  orange: "bg-warning-100 text-warning-700",
}

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  className?: string
  dot?: boolean
}

export function StatusBadge({ label, variant = "gray", className, dot }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      variantClasses[variant],
      className
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}

export function ApplicationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; variant: BadgeVariant }> = {
    APPLIED:           { label: "지원완료", variant: "gray" },
    UNDER_REVIEW:      { label: "검토중",   variant: "blue" },
    SHORTLISTED:       { label: "서류통과", variant: "indigo" },
    INTERVIEW_PENDING: { label: "면접예정", variant: "purple" },
    ON_HOLD:           { label: "보류",     variant: "amber" },
    REJECTED:          { label: "불합격",   variant: "red" },
    HIRED:             { label: "최종합격", variant: "green" },
    WITHDRAWN:         { label: "취소",     variant: "gray" },
  }
  const c = config[status] ?? { label: status, variant: "gray" as BadgeVariant }
  return <StatusBadge label={c.label} variant={c.variant} dot />
}
