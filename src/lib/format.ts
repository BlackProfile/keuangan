// Currency & date formatting helpers (Indonesian locale)

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const IDR_DECIMAL = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const NUMBER = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(amount: number, withDecimals = false): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return withDecimals ? IDR_DECIMAL.format(value) : IDR.format(value);
}

/** Compact format: Rp1,2 jt, Rp3,5 rb */
export function formatCurrencyCompact(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) {
    return `${sign}Rp${(abs / 1_000_000_000).toFixed(1).replace(".", ",")} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp${(abs / 1_000_000).toFixed(1).replace(".", ",")} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp${(abs / 1_000).toFixed(0)} rb`;
  }
  return `${sign}Rp${NUMBER.format(abs)}`;
}

/** Ultra-short format for chart axes: "9,7jt", "350rb" */
export function formatCurrencyAxis(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(abs / 1_000_000_000).toFixed(1).replace(".", ",")}M`;
  }
  if (abs >= 1_000_000) {
    return `${(abs / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  }
  if (abs >= 1_000) {
    return `${Math.round(abs / 1_000)}rb`;
  }
  return `${abs}`;
}

export function formatNumber(value: number): string {
  return NUMBER.format(Number.isFinite(value) ? value : 0);
}

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const MONTHS_SHORT_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/** Parse a date string (yyyy-mm-dd or ISO) to a local Date (no timezone shift). */
export function parseDateLocal(input: string | Date): Date {
  if (input instanceof Date) return input;
  if (!input) return new Date();
  // If yyyy-mm-dd, parse as local date
  if (/^\d{4}-\d{2}-\d{2}/.test(input)) {
    const [y, m, d] = input.split("T")[0].split("-").map(Number);
    return new Date(y, (m ?? 1) - 1, d ?? 1);
  }
  return new Date(input);
}

export function formatDate(input: string | Date): string {
  const d = parseDateLocal(input);
  return `${d.getDate()} ${MONTHS_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateLong(input: string | Date): string {
  const d = parseDateLocal(input);
  return `${DAYS_ID[d.getDay()]}, ${d.getDate()} ${MONTHS_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatDateInput(input: string | Date): string {
  const d = parseDateLocal(input);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function getMonthLabel(monthKey: string): string {
  // monthKey = "YYYY-MM"
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  return `${MONTHS_SHORT_ID[m - 1]} ${String(y).slice(2)}`;
}

export function getMonthYearLabel(date: Date): string {
  return `${MONTHS_ID[date.getMonth()]} ${date.getFullYear()}`;
}

export function getMonthKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Returns "Hari ini", "Kemarin", or formatted date. */
export function relativeDay(input: string | Date): string {
  const d = parseDateLocal(input);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Hari ini";
  if (diffDays === -1) return "Kemarin";
  if (diffDays === 1) return "Besok";
  return formatDate(d);
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

/** Hidden amount placeholder for privacy mode */
export function hiddenAmount(): string {
  return "Rp••••••";
}

/** Format currency with optional hidden mode */
export function formatCurrencyHidden(
  amount: number,
  hidden: boolean,
  withDecimals = false
): string {
  if (hidden) return hiddenAmount();
  return formatCurrency(amount, withDecimals);
}

export function formatCurrencyCompactHidden(
  amount: number,
  hidden: boolean
): string {
  if (hidden) return "Rp••••";
  return formatCurrencyCompact(amount);
}

/** Calculate streak of consecutive days with at least one transaction */
export function calculateStreak(dates: Array<string | Date>): number {
  if (dates.length === 0) return 0;
  const daySet = new Set<string>();
  for (const d of dates) {
    const dt = parseDateLocal(d);
    daySet.add(formatDateInput(dt));
  }
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  // If no transaction today, allow yesterday to start streak
  if (!daySet.has(formatDateInput(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!daySet.has(formatDateInput(cursor))) return 0;
  }
  while (daySet.has(formatDateInput(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Parse tags string "a,b,c" into array */
export function parseTags(tags: string | null | undefined): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Format percentage with sign */
export function formatPercent(value: number, withSign = false): string {
  const v = Number.isFinite(value) ? value : 0;
  const sign = withSign && v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1).replace(".", ",")}%`;
}

/** Compute estimated completion date for a goal given monthly contribution */
export function estimateGoalDate(
  remaining: number,
  monthlyContribution: number
): Date | null {
  if (monthlyContribution <= 0 || remaining <= 0) return null;
  const months = Math.ceil(remaining / monthlyContribution);
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Weekday labels in Indonesian (Monday-first) */
export const WEEKDAYS_ID = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** Get weekday index (0=Monday) from date */
export function getWeekdayMondayFirst(date: Date): number {
  return (date.getDay() + 6) % 7;
}

/** Hash a PIN using SubtleCrypto (client-side) — returns hex string */
export async function hashPin(pin: string): Promise<string> {
  const enc = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Add months to a date */
export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Compute next date for recurring transaction */
export function computeNextDate(
  current: Date,
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY",
  interval: number
): Date {
  const d = new Date(current);
  switch (frequency) {
    case "DAILY":
      d.setDate(d.getDate() + interval);
      break;
    case "WEEKLY":
      d.setDate(d.getDate() + interval * 7);
      break;
    case "MONTHLY":
      d.setMonth(d.getMonth() + interval);
      break;
    case "YEARLY":
      d.setFullYear(d.getFullYear() + interval);
      break;
  }
  return d;
}
