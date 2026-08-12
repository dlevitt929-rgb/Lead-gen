import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

// Deliberately not Intl.NumberFormat: its thousands-separator output can
// differ between Node's and the browser's bundled ICU data (comma vs.
// narrow-no-break-space for en-ZA), which causes React hydration mismatches.
// Manual grouping guarantees identical server/client output.
function groupThousands(n: number): string {
  const rounded = Math.round(Math.abs(n));
  const withCommas = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return n < 0 ? `-${withCommas}` : withCommas;
}

export function formatCurrency(amount: number | null | undefined, currency = "ZAR") {
  if (amount === null || amount === undefined) return "—";
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return `${symbol}${groupThousands(amount)}`;
}

export function formatCurrencyRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "ZAR",
) {
  if (min === null || min === undefined || max === null || max === undefined) return "—";
  return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (Math.abs(diffSec) < 60) return "just now";
  if (Math.abs(diffMin) < 60) return diffMin > 0 ? `${diffMin}m ago` : `in ${-diffMin}m`;
  if (Math.abs(diffHour) < 24) return diffHour > 0 ? `${diffHour}h ago` : `in ${-diffHour}h`;
  if (Math.abs(diffDay) < 30) return diffDay > 0 ? `${diffDay}d ago` : `in ${-diffDay}d`;
  return formatDate(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Manual, locale-independent formatting — Intl's toLocaleString/toLocaleDateString
// output can differ between Node's and the browser's bundled ICU data (separators,
// spacing), which causes React hydration mismatches for anything SSR-ed.
export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${formatDate(d)}, ${hours}:${minutes}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
