import * as React from "react";
import { cn } from "../lib/utils";
import { type LucideIcon, SearchX, FolderOpen, AlertCircle } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "search" | "error";
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  size = "default",
  className,
}: EmptyStateProps) {
  const defaultIcons: Record<string, LucideIcon> = {
    default: FolderOpen,
    search: SearchX,
    error: AlertCircle,
  };

  const Icon = icon ?? defaultIcons[variant];

  const iconContainerColors = {
    default: "bg-neutral-100 text-neutral-400",
    search: "bg-brand-blue-50 text-brand-blue",
    error: "bg-red-50 text-red-400",
  };

  const sizes = {
    sm: {
      container: "py-8",
      iconWrap: "h-10 w-10",
      icon: "h-5 w-5",
      title: "text-sm font-semibold",
      description: "text-xs",
    },
    default: {
      container: "py-14",
      iconWrap: "h-14 w-14",
      icon: "h-7 w-7",
      title: "text-base font-bold",
      description: "text-sm",
    },
    lg: {
      container: "py-20",
      iconWrap: "h-20 w-20",
      icon: "h-9 w-9",
      title: "text-xl font-bold",
      description: "text-base",
    },
  };

  const s = sizes[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4",
        s.container,
        className
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl",
          s.iconWrap,
          iconContainerColors[variant]
        )}
      >
        <Icon className={s.icon} aria-hidden />
      </div>
      <div className="flex flex-col items-center gap-1.5 max-w-xs">
        <p className={cn(s.title, "text-neutral-900")}>{title}</p>
        {description && (
          <p className={cn(s.description, "text-neutral-500 leading-relaxed")}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
