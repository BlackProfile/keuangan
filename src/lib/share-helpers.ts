import type {
  ShareAccessLevel,
  ShareScopeType,
} from "@/lib/types";

export const SHARE_ACCESS_LEVELS: Array<{
  value: ShareAccessLevel;
  label: string;
  description: string;
  icon: string;
  color: string;
}> = [
  {
    value: "VIEW",
    label: "Lihat Saja",
    description: "Penerima hanya bisa lihat data",
    icon: "Eye",
    color: "#10b981",
  },
  {
    value: "COMMENT",
    label: "Lihat + Komentar",
    description: "Bisa komentar di transaksi",
    icon: "MessageCircle",
    color: "#0891b2",
  },
  {
    value: "WRITE",
    label: "Baca-Tulis",
    description: "Bisa tambah/edit transaksi",
    icon: "Pencil",
    color: "#f59e0b",
  },
  {
    value: "ADMIN",
    label: "Admin",
    description: "Akses penuh termasuk hapus",
    icon: "Shield",
    color: "#ef4444",
  },
];

export const SHARE_SCOPE_TYPES: Array<{
  value: ShareScopeType;
  label: string;
  description: string;
  icon: string;
}> = [
  { value: "ALL", label: "Semua Data", description: "Bagikan semua transaksi", icon: "Database" },
  { value: "ACCOUNT", label: "Per Akun", description: "Hanya akun tertentu", icon: "Landmark" },
  { value: "CATEGORY", label: "Per Kategori", description: "Hanya kategori tertentu", icon: "Tags" },
  { value: "GROUP", label: "Per Event/Group", description: "Hanya group tertentu", icon: "Folder" },
  { value: "TAG", label: "Per Tag", description: "Hanya tag tertentu", icon: "Tag" },
  { value: "DATE_RANGE", label: "Rentang Tanggal", description: "Hanya periode tertentu", icon: "CalendarDays" },
  { value: "CUSTOM", label: "Pilih Manual", description: "Pilih transaksi individual", icon: "ListChecks" },
];

export const SHARE_THEME_COLORS = [
  "#10b981", "#0891b2", "#8b5cf6", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#6366f1", "#a855f7", "#6b7280",
];

export const SHARE_EXPIRY_PRESETS: Array<{
  label: string;
  hours?: number;
  days?: number;
  views?: number;
}> = [
  { label: "1 jam", hours: 1 },
  { label: "24 jam", hours: 24 },
  { label: "7 hari", days: 7 },
  { label: "30 hari", days: 30 },
  { label: "Sekali pakai", views: 1 },
  { label: "Tidak kadaluarsa" },
];

/** Generate short share token */
export function generateShareToken(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 16; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

/** Build the full share URL */
export function buildShareUrl(token: string): string {
  if (typeof window === "undefined") return `/share/${token}`;
  return `${window.location.origin}/share/${token}`;
}

/** Check if a share link is expired */
export function isShareExpired(link: {
  expiresAt: string | null;
  hoursActive: number | null;
  createdAt: string;
  maxViews: number | null;
  viewCount: number;
  oneTime: boolean;
}): { expired: boolean; reason?: string } {
  const now = Date.now();
  if (link.expiresAt) {
    const exp = new Date(link.expiresAt).getTime();
    if (now >= exp) return { expired: true, reason: "Link sudah kadaluarsa (tanggal)." };
  }
  if (link.hoursActive) {
    const created = new Date(link.createdAt).getTime();
    if (now >= created + link.hoursActive * 3600_000) {
      return { expired: true, reason: "Link sudah kadaluarsa (waktu habis)." };
    }
  }
  if (link.maxViews && link.viewCount >= link.maxViews) {
    return { expired: true, reason: "Batas jumlah pembukaan tercapai." };
  }
  if (link.oneTime && link.viewCount >= 1) {
    return { expired: true, reason: "Link sekali pakai sudah digunakan." };
  }
  return { expired: false };
}

/** Format view remaining */
export function viewsRemaining(link: {
  maxViews: number | null;
  viewCount: number;
}): number | null {
  if (!link.maxViews) return null;
  return Math.max(0, link.maxViews - link.viewCount);
}
