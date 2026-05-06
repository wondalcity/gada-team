"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
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

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseDate(value: string) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(value: string) {
  const p = parseDate(value);
  if (!p) return "";
  return `${p.year}년 ${p.month + 1}월 ${p.day}일`;
}

interface CalendarDropdownProps {
  anchorRect: DOMRect;
  value: string;
  min?: string;
  max?: string;
  onSelect: (dateStr: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function CalendarDropdown({
  anchorRect,
  value,
  min,
  max,
  onSelect,
  onClear,
  onClose,
}: CalendarDropdownProps) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const parsed = parseDate(value);

  const [viewYear, setViewYear] = React.useState(parsed?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = React.useState(parsed?.month ?? today.getMonth());

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  // Position: prefer below, flip above if not enough space
  const dropdownH = 320;
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8;
  const above = spaceBelow < dropdownH && anchorRect.top > dropdownH;
  const top = above
    ? anchorRect.top + window.scrollY - dropdownH - 6
    : anchorRect.bottom + window.scrollY + 6;
  const left = Math.min(
    anchorRect.left + window.scrollX,
    window.innerWidth - 288 - 8
  );

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function isDisabledDay(day: number) {
    const s = toDateStr(viewYear, viewMonth, day);
    return (!!min && s < min) || (!!max && s > max);
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  return ReactDOM.createPortal(
    <div
      ref={dropdownRef}
      style={{ position: "absolute", top, left, width: 288, zIndex: 9999 }}
      className="bg-white rounded-xl border border-neutral-200 shadow-card-xl p-3 animate-fade-in"
    >
      {/* Month/year header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-neutral-800 tabular-nums">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500 transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-center text-xs font-medium py-1",
              i === 0 ? "text-danger-500" : i === 6 ? "text-primary-500" : "text-neutral-400"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array.from({ length: totalCells }, (_, i) => {
          const day = i - firstDay + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const dayDisabled = valid && isDisabledDay(day);
          const dayStr = valid ? toDateStr(viewYear, viewMonth, day) : "";
          const isToday = dayStr === todayStr;
          const isSelected = dayStr === value;
          const col = i % 7;

          return (
            <button
              key={i}
              type="button"
              disabled={!valid || dayDisabled}
              onClick={() => {
                if (valid && !dayDisabled) {
                  onSelect(dayStr);
                }
              }}
              className={cn(
                "h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all",
                !valid && "invisible pointer-events-none",
                valid && !isSelected && !dayDisabled && [
                  col === 0
                    ? "text-danger-500 hover:bg-danger-50"
                    : col === 6
                    ? "text-primary-500 hover:bg-primary-50"
                    : "text-neutral-700 hover:bg-neutral-100",
                ],
                isToday && !isSelected && "bg-primary-50 text-primary-600 font-bold",
                isSelected && "bg-primary-500 text-white font-bold hover:bg-primary-600",
                dayDisabled && "text-neutral-300 cursor-not-allowed"
              )}
            >
              {valid ? day : ""}
            </button>
          );
        })}
      </div>

      {/* Footer: clear / today */}
      <div className="flex justify-between mt-3 pt-2.5 border-t border-neutral-100">
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors px-1 py-0.5"
        >
          삭제
        </button>
        <button
          type="button"
          onClick={() => onSelect(todayStr)}
          className="text-xs text-primary-500 hover:text-primary-600 font-medium transition-colors px-1 py-0.5"
        >
          오늘
        </button>
      </div>
    </div>,
    document.body
  );
}

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
  const [open, setOpen] = React.useState(false);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  const displayValue = formatDisplay(value);

  function handleOpen() {
    if (disabled) return;
    if (!open && triggerRef.current) {
      setAnchorRect(triggerRef.current.getBoundingClientRect());
    }
    setOpen((o) => !o);
  }

  // Update anchor position on scroll/resize while open
  React.useEffect(() => {
    if (!open) return;
    function update() {
      if (triggerRef.current) setAnchorRect(triggerRef.current.getBoundingClientRect());
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  return (
    <div className={cn("relative", className)}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleOpen}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left bg-white",
          open
            ? "border-primary-500 ring-2 ring-primary-100"
            : "border-neutral-200 hover:border-neutral-300",
          disabled && "opacity-50 cursor-not-allowed",
          displayValue ? "text-neutral-900" : "text-neutral-400"
        )}
      >
        <span className="flex-1 truncate">{displayValue || placeholder}</span>
        <CalendarDays
          className={cn(
            "h-4 w-4 shrink-0",
            displayValue ? "text-primary-500" : "text-neutral-400"
          )}
        />
      </button>

      {/* Portal calendar */}
      {open && anchorRect && (
        <CalendarDropdown
          anchorRect={anchorRect}
          value={value}
          min={min}
          max={max}
          onSelect={(d) => { onChange(d); setOpen(false); }}
          onClear={() => { onChange(""); setOpen(false); }}
          onClose={() => setOpen(false)}
        />
      )}

      {/* Hidden input for required form validation */}
      {required && (
        <input
          type="text"
          value={value}
          required
          readOnly
          tabIndex={-1}
          className="sr-only"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
