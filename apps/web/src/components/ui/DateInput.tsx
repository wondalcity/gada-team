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
 * DateInput — GADA 디자인 시스템 날짜 입력 컴포넌트
 *
 * 네이티브 <input type="date"> 를 감싸 달력 아이콘과 일관된 스타일을 제공합니다.
 * 값이 없을 때 placeholder 텍스트를 오버레이로 표시하고,
 * 달력 아이콘 클릭 시 날짜 선택기를 바로 엽니다.
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
    if (disabled) return;
    inputRef.current?.showPicker?.();
    inputRef.current?.focus();
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
      {/* Native date input — invisible text when empty so our placeholder shows */}
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
        onClick={(e) => e.stopPropagation()}
        className={cn(
          // base
          "w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-all outline-none",
          // border + focus
          "border-neutral-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100",
          // right padding for icon
          "pr-10",
          // when empty, make text transparent so custom placeholder shows instead
          isEmpty
            ? "[color-scheme:light] text-transparent [&::-webkit-datetime-edit]:text-transparent"
            : "text-neutral-900",
          // hide browser's own calendar picker icon
          "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer",
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
