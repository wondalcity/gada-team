"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "../lib/utils";

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  width?: "sm" | "default" | "lg" | "xl";
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const widths = {
  sm: "w-full sm:max-w-sm",
  default: "w-full sm:max-w-md",
  lg: "w-full sm:max-w-lg",
  xl: "w-full sm:max-w-2xl",
};

export function SidePanel({
  open,
  onClose,
  title,
  subtitle,
  width = "default",
  children,
  footer,
  className,
}: SidePanelProps) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  React.useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-neutral-950/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed right-0 top-0 bottom-0 z-50 flex flex-col",
          "bg-white shadow-card-xl border-l border-neutral-100",
          "animate-slide-in-right",
          widths[width],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 flex-shrink-0">
          <div>
            {title && (
              <h2 className="text-base font-bold text-neutral-950">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors ml-3 flex-shrink-0"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-neutral-100 bg-white flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

export function SidePanelBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("px-5 py-5", className)}>{children}</div>;
}

export function SidePanelSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("py-4 border-b border-neutral-50 last:border-0", className)}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 px-5">
          {title}
        </p>
      )}
      <div className="px-5">{children}</div>
    </div>
  );
}
