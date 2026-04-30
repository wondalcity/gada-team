"use client";

import * as React from "react";
import { Calendar } from "lucide-react";

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

export function DateInput({
  value,
  onChange,
  placeholder = "날짜 선택",
  min,
  max,
  disabled,
  required,
  className = "",
  id,
}: DateInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isEmpty = !value;

  function openPicker() {
    if (disabled || !inputRef.current) return;
    try {
      inputRef.current.showPicker?.();
    } catch {
      inputRef.current.focus();
      inputRef.current.click();
    }
  }

  return (
    <div
      className={`relative flex items-center cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
      onClick={openPicker}
    >
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
        className={[
          "w-full px-3 py-2 text-sm border rounded-xl bg-white transition-all outline-none pr-10",
          "border-neutral-200 focus:ring-2 focus:ring-amber-400 focus:border-amber-400",
          "[&::-webkit-calendar-picker-indicator]:hidden",
          isEmpty
            ? "text-transparent [&::-webkit-datetime-edit]:text-transparent"
            : "text-neutral-900",
          disabled ? "cursor-not-allowed" : "",
        ].join(" ")}
      />

      {/* Placeholder */}
      {isEmpty && (
        <span className="pointer-events-none absolute left-3 text-sm text-neutral-400 select-none">
          {placeholder}
        </span>
      )}

      {/* Calendar icon */}
      <span className="pointer-events-none absolute right-3 flex items-center">
        <Calendar className={`h-4 w-4 ${isEmpty ? "text-neutral-400" : "text-amber-500"}`} />
      </span>
    </div>
  );
}
