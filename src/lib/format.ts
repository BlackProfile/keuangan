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
