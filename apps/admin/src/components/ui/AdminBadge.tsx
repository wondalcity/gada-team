import { cn } from "@gada/ui";

type AdminBadgeVariant =
  | "green"
  | "red"
  | "blue"
  | "amber"
  | "gray"
  | "indigo"
  | "purple"
  | "orange";

const VARIANT_CLASS: Record<AdminBadgeVariant, string> = {
  green: "bg-green-50 text-green-700 border border-green-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  gray: "bg-neutral-100 text-neutral-500 border border-neutral-200",
  indigo: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  orange: "bg-orange-50 text-orange-700 border border-orange-200",
};

interface AdminBadgeProps {
  label: string;
  variant: AdminBadgeVariant;
  className?: string;
}

export function AdminBadge({ label, variant, className }: AdminBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        VARIANT_CLASS[variant],
        className
      )}
    >
      {label}
    </span>
  );
}
