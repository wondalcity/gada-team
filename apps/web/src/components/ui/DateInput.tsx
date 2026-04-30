"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
}

/**
 * DateInput — 네이티브 <input type="date"> 래퍼
 * 달력 아이콘과 placeholder 오버레이를 제공하며,
 * 클릭 시 showPicker() → focus() 순서로 안정적으로 열립니다.
 */
export function DateInput({
  value,
  onChange,
  placeholder = "날짜 선택",
  min,
  max,
  disabled,
  required,
  className,
  id,
}: DateInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isEmpty = !value;

  function openPicker() {
    if (disabled || !inputRef.current) return;
    try {
      inputRef.current.showPicker?.();
    } catch {
      // showPicker() not supported or blocked — fall back to focus
      inputRef.current.focus();
      inputRef.current.click();
    }
  }

  return (
    <div
      className={cn(
        "relative flex items-center cursor-pointer",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={openPicker}
    >
      {/* Native date input */}
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        min={min}
        max={max}
        disabled={disabled}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-all outline-none",
          "border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
          "pr-10",
          // hide browser's built-in calendar icon
          "[&::-webkit-calendar-picker-indicator]:hidden",
          isEmpty ? "text-transparent [&::-webkit-datetime-edit]:text-transparent" : "text-neutral-900",
          disabled && "cursor-not-allowed"
        )}
      />

      {/* Placeholder overlay — shown when empty */}
      {isEmpty && (
        <span
          className="pointer-events-none absolute left-3 text-sm text-neutral-400 select-none"
          aria-hidden="true"
        >
          {placeholder}
        </span>
      )}

      {/* Calendar icon */}
      <span className="pointer-events-none absolute right-3 flex items-center">
        <CalendarDays className={cn("h-4 w-4", isEmpty ? "text-neutral-400" : "text-primary-500")} />
      </span>
    </div>
  );
}
