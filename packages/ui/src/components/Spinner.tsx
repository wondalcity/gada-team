import * as React from "react";
import { cn } from "../lib/utils";

export interface SpinnerProps {
  size?: "sm" | "default" | "lg";
  className?: string;
  label?: string;
}

export function Spinner({ size = "default", className, label }: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4 border-[1.5px]",
    default: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[2.5px]",
  };

  return (
    <span role="status" aria-label={label ?? "로딩 중"} className={cn("inline-flex", className)}>
      <span
        className={cn(
          "rounded-full border-brand-blue/25 border-t-brand-blue animate-spin",
          sizes[size]
        )}
      />
      {label && <span className="sr-only">{label}</span>}
    </span>
  );
}
