"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ options, value, onChange, placeholder = "선택하세요", className }: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-lg border px-4 py-2.5 text-sm transition-all bg-white",
          selected ? "border-neutral-200 text-neutral-900" : "border-neutral-200 text-neutral-400",
          open ? "border-primary-400 ring-2 ring-primary-100" : "hover:border-neutral-300"
        )}
      >
        <span className="flex items-center gap-2 truncate text-left min-w-0">
          {selected?.icon && <span className="flex-shrink-0 text-base leading-none">{selected.icon}</span>}
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={cn("ml-2 h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-150", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-card-lg py-1">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
              className={cn(
                "flex w-full items-center px-4 py-2.5 text-sm transition-colors",
                !value ? "bg-primary-50 font-semibold text-primary-600" : "text-neutral-400 hover:bg-neutral-50"
              )}
            >
              {placeholder}
            </button>
          )}
          {options.map(opt => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm transition-colors",
                  active ? "bg-primary-50 font-semibold text-primary-600" : "text-neutral-700 hover:bg-neutral-50"
                )}
              >
                <span className="flex flex-1 items-center gap-2 truncate min-w-0">
                  {opt.icon && <span className="flex-shrink-0 text-base leading-none">{opt.icon}</span>}
                  {opt.label}
                </span>
                {active && (
                  <svg className="h-4 w-4 flex-shrink-0 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
