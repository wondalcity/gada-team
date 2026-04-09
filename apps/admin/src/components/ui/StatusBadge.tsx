import { cn } from "@gada/ui";

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "승인대기",
    className: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  },
  ACTIVE: {
    label: "활성",
    className: "bg-green-50 text-green-700 border border-green-200",
  },
  SUSPENDED: {
    label: "정지",
    className: "bg-red-50 text-red-700 border border-red-200",
  },
  CLOSED: {
    label: "폐업",
    className: "bg-neutral-100 text-neutral-500",
  },
  DRAFT: {
    label: "임시저장",
    className: "bg-neutral-100 text-neutral-600",
  },
  PUBLISHED: {
    label: "게시중",
    className: "bg-blue-50 text-brand-blue border border-blue-200",
  },
  PAUSED: {
    label: "일시중지",
    className: "bg-orange-50 text-orange-700 border border-orange-200",
  },
  ARCHIVED: {
    label: "보관",
    className: "bg-neutral-100 text-neutral-400",
  },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return (
      <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-500">
        {status}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
