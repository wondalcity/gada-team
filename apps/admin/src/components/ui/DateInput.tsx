"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

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

  React.useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClose]);

  const dropdownH = 320;
  const spaceBelow = window.innerHeight - anchorRect.bottom - 8;
  const above = spaceBelow < dropdownH && anchorRect.top > dropdownH;
  const top = above
    ? anchorRect.top + window.scrollY - dropdownH - 6
    : anchorRect.bottom + window.scrollY + 6;
  const left = Math.min(anchorRect.left + window.scrollX, window.innerWidth - 288 - 8);

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
      className="bg-white rounded-xl border border-border shadow-xl p-3"
    >
      {/* Month/year header */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {viewYear}년 {viewMonth + 1}월
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={d}
            className={clsx(
              "text-center text-xs font-medium py-1",
              i === 0
                ? "text-destructive"
                : i === 6
                ? "text-primary"
                : "text-muted-foreground"
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
              onClick={() => { if (valid && !dayDisabled) onSelect(dayStr); }}
              className={clsx(
                "h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all",
                !valid && "invisible pointer-events-none",
                valid && !isSelected && !dayDisabled && (
                  col === 0
                    ? "text-destructive hover:bg-destructive/10"
                    : col === 6
                    ? "text-primary hover:bg-accent"
                    : "text-foreground hover:bg-muted"
                ),
                isToday && !isSelected && "bg-accent text-primary font-bold",
                isSelected && "bg-primary text-primary-foreground font-bold",
                dayDisabled && "text-muted-foreground/40 cursor-not-allowed"
              )}
            >
              {valid ? day : ""}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex justify-between mt-3 pt-2.5 border-t border-border">
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1 py-0.5"
        >
          삭제
        </button>
        <button
          type="button"
          onClick={() => onSelect(todayStr)}
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors px-1 py-0.5"
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
  className = "",
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
    <div className={clsx("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        onClick={handleOpen}
        className={clsx(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all text-left bg-background",
          open
            ? "border-primary ring-2 ring-ring/20"
            : "border-input hover:border-primary/40",
          disabled && "opacity-50 cursor-not-allowed",
          displayValue ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="flex-1 truncate">{displayValue || placeholder}</span>
        <CalendarDays
          className={clsx(
            "h-4 w-4 shrink-0",
            displayValue ? "text-primary" : "text-muted-foreground"
          )}
        />
      </button>

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
