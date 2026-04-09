import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format Korean Won: 150000 → "15만원" */
export function formatWon(amount: number): string {
  if (amount >= 10000) {
    const man = Math.floor(amount / 10000);
    const rest = amount % 10000;
    return rest === 0 ? `${man}만원` : `${man}만 ${rest.toLocaleString()}원`;
  }
  return `${amount.toLocaleString()}원`;
}

/** Format pay range */
export function formatPayRange(
  min?: number | null,
  max?: number | null,
  unit?: string | null
): string {
  const unitLabel: Record<string, string> = {
    HOURLY: "/시간",
    DAILY: "/일",
    MONTHLY: "/월",
    LUMP_SUM: " (일괄)",
  };
  const suffix = unit ? unitLabel[unit] ?? "" : "";
  if (!min && !max) return "급여 협의";
  if (min && max) return `${formatWon(min)} ~ ${formatWon(max)}${suffix}`;
  if (min) return `${formatWon(min)}~${suffix}`;
  return `~${formatWon(max!)}${suffix}`;
}

/** Truncate text */
export function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}
