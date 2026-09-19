"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarClock,
  CalendarDays,
  Check,
  Copy,
  Database,
  Eye,
  EyeOff,
  Globe,
  Link2,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Pencil,
  Plus,
  QrCode,
  Shield,
  ShieldAlert,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { LucideIcon } from "@/components/lucide-icon";

import { cn } from "@/lib/utils";
import {
  formatDate,
  formatDateInput,
  formatDateLong,
  parseDateLocal,
} from "@/lib/format";
import {
  SHARE_ACCESS_LEVELS,
  SHARE_EXPIRY_PRESETS,
  SHARE_SCOPE_TYPES,
  SHARE_THEME_COLORS,
  buildShareUrl,
  isShareExpired,
  viewsRemaining,
} from "@/lib/share-helpers";
import {
  useAccounts,
  useCategories,
  useCloneShareLink,
  useCreateShareLink,
  useDeleteShareLink,
  useGroups,
  useRevokeShareLink,
  useShareLinks,
  useUpdateShareLink,
} from "@/lib/hooks";
import type {
  ShareAccessLevel,
  ShareLink,
  ShareLinkInput,
  ShareScopeType,
} from "@/lib/types";

// ---------- Helpers ----------
function parseScopeData(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function describeScope(
  scopeType: ShareScopeType,
  scopeDataStr: string | null,
  ctx: {
    accounts: Array<{ id: string; name: string }>;
    categories: Array<{ id: string; name: string }>;
    groups: Array<{ id: string; name: string }>;
  }
): string {
  const data = parseScopeData(scopeDataStr);
  switch (scopeType) {
    case "ALL":
      return "Semua Data";
    case "ACCOUNT": {
      const id = String(data.accountId ?? data.accountIds?.[0] ?? "");
      const acc = ctx.accounts.find((a) => a.id === id);
      return acc ? `Akun: ${acc.name}` : "Per Akun";
    }
    case "CATEGORY": {
      const id = String(data.categoryId ?? data.categoryIds?.[0] ?? "");
      const cat = ctx.categories.find((c) => c.id === id);
      return cat ? `Kategori: ${cat.name}` : "Per Kategori";
    }
    case "GROUP": {
      const id = String(data.groupId ?? data.groupIds?.[0] ?? "");
      const g = ctx.groups.find((x) => x.id === id);
      return g ? `Group: ${g.name}` : "Per Group";
    }
    case "TAG": {
      const tag = String(data.tag ?? data.tags?.[0] ?? "");
      return tag ? `Tag: ${tag}` : "Per Tag";
    }
    case "DATE_RANGE": {
      const from = data.from ? formatDate(String(data.from)) : "?";
      const to = data.to ? formatDate(String(data.to)) : "?";
      return `Rentang: ${from} - ${to}`;
    }
    case "CUSTOM":
      return "Pilihan Manual";
    default:
      return "—";
  }
}

function statusInfo(link: ShareLink): {
  label: string;
  dotClass: string;
  textClass: string;
} {
  if (!link.active) {
    return {
      label: "Dicabut",
      dotClass: "bg-gray-400",
      textClass: "text-gray-500 dark:text-gray-400",
    };
  }
  const expired = isShareExpired({
    expiresAt: link.expiresAt,
    hoursActive: link.hoursActive,
    createdAt: link.createdAt,
    maxViews: link.maxViews,
    viewCount: link.viewCount,
    oneTime: link.oneTime,
  });
  if (expired.expired) {
    return {
      label: "Kadaluarsa",
      dotClass: "bg-red-500",
      textClass: "text-red-600 dark:text-red-400",
    };
  }
  return {
    label: "Aktif",
    dotClass: "bg-emerald-500",
    textClass: "text-emerald-600 dark:text-emerald-400",
  };
}

function expiryLabel(link: ShareLink): string {
  if (link.oneTime) {
    if (link.viewCount >= 1) return "Sudah digunakan";
    return "Sekali pakai";
  }
  const remaining = viewsRemaining(link);
  if (remaining !== null) return `${remaining}x tersisa`;
  if (link.expiresAt) {
    return `Berlaku hingga ${formatDate(link.expiresAt)}`;
  }
  if (link.hoursActive) {
    return `Aktif ${link.hoursActive} jam`;
  }
  return "Permanen";
}

// ---------- Main Section ----------
export function SharesSection() {
  const { data: shares, isLoading } = useShareLinks();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editShare, setEditShare] = React.useState<ShareLink | null>(null);
  const [qrShare, setQrShare] = React.useState<ShareLink | null>(null);

  const ctx = React.useMemo(
    () => ({
      accounts: (accounts ?? []).map((a) => ({ id: a.id, name: a.name })),
      categories: (categories ?? []).map((c) => ({ id: c.id, name: c.name })),
      groups: (groups ?? []).map((g) => ({ id: g.id, name: g.name })),
    }),
    [accounts, categories, groups]
  );

  const stats = React.useMemo(() => {
    const list = shares ?? [];
    const active = list.filter((l) => {
      if (!l.active) return false;
      const e = isShareExpired({
        expiresAt: l.expiresAt,
        hoursActive: l.hoursActive,
        createdAt: l.createdAt,
        maxViews: l.maxViews,
        viewCount: l.viewCount,
        oneTime: l.oneTime,
      });
      return !e.expired;
    }).length;
    const totalViews = list.reduce((s, l) => s + (l.viewCount || 0), 0);
    const totalComments = list.reduce(
      (s, l) => s + (l._count?.comments ?? 0),
      0
    );
    const expired = list.filter((l) => {
      if (!l.active) return false;
      const e = isShareExpired({
        expiresAt: l.expiresAt,
        hoursActive: l.hoursActive,
        createdAt: l.createdAt,
        maxViews: l.maxViews,
        viewCount: l.viewCount,
        oneTime: l.oneTime,
      });
      return e.expired;
    }).length;
    return { active, totalViews, totalComments, expired };
  }, [shares]);

  function openCreate() {
    setEditShare(null);
    setDialogOpen(true);
  }

  function openEdit(s: ShareLink) {
    setEditShare(s);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Link Berbagi</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Bagikan data keuangan ke orang lain
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Buat Link Baru
        </Button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Total Link Aktif"
          value={stats.active}
          icon={<Link2 className="h-4 w-4" />}
          tone="primary"
        />
        <StatCard
          label="Total Views"
          value={stats.totalViews}
          icon={<Eye className="h-4 w-4" />}
          tone="default"
        />
        <StatCard
          label="Total Komentar"
          value={stats.totalComments}
          icon={<MessageSquare className="h-4 w-4" />}
          tone="default"
        />
        <StatCard
          label="Link Kadaluarsa"
          value={stats.expired}
          icon={<CalendarClock className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : (shares ?? []).length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(shares ?? []).map((s) => (
            <ShareCard
              key={s.id}
              share={s}
              scopeLabel={describeScope(s.scopeType, s.scopeData, ctx)}
              onEdit={() => openEdit(s)}
              onShowQr={() => setQrShare(s)}
            />
          ))}
        </div>
      )}

      <ShareFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editShare={editShare}
      />

      <QrCodeDialog share={qrShare} onOpenChange={(o) => !o && setQrShare(null)} />
    </div>
  );
}

// ---------- Stat Card ----------
function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "default" | "primary" | "danger";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg",
            tone === "primary" && "bg-primary/10 text-primary",
            tone === "danger" && "bg-destructive/10 text-destructive",
            tone === "default" && "bg-muted text-muted-foreground"
          )}
        >
          {icon}
        </span>
      </div>
      <p
        className={cn(
          "mt-2 text-2xl font-bold tabular-nums",
          tone === "primary" && "text-primary",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
    </Card>
  );
}

// ---------- Empty State ----------
function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Link2 className="h-7 w-7 text-primary" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada link berbagi
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Buat link pertama Anda untuk berbagi data keuangan.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1">
        <Plus className="h-4 w-4" />
        Buat Link Baru
      </Button>
    </Card>
  );
}

// ---------- Share Card ----------
function ShareCard({
  share,
  scopeLabel,
  onEdit,
  onShowQr,
}: {
  share: ShareLink;
  scopeLabel: string;
  onEdit: () => void;
  onShowQr: () => void;
}) {
  const deleteMut = useDeleteShareLink();
  const revokeMut = useRevokeShareLink();
  const cloneMut = useCloneShareLink();

  const status = statusInfo(share);
  const access = SHARE_ACCESS_LEVELS.find((a) => a.value === share.accessLevel);
  const scope = SHARE_SCOPE_TYPES.find((s) => s.value === share.scopeType);
  const themeColor = share.customTheme || "#10b981";
  const url = buildShareUrl(share.token);
  const commentCount = share._count?.comments ?? 0;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link disalin");
    } catch {
      toast.error("Gagal menyalin link.");
    }
  }

  function handleWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(url)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleRevoke() {
    revokeMut.mutate(share.token, {
      onSuccess: () => toast.success("Link berhasil dicabut."),
      onError: (err) =>
        toast.error(err.message || "Gagal mencabut link."),
    });
  }

  function handleClone() {
    cloneMut.mutate(share.token, {
      onSuccess: () => toast.success("Link berhasil diduplikasi."),
      onError: (err) =>
        toast.error(err.message || "Gagal menduplikasi link."),
    });
  }

  function handleDelete() {
    deleteMut.mutate(share.id, {
      onSuccess: () => toast.success(`Link "${share.title}" dihapus.`),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus link."),
    });
  }

  return (
    <Card className="relative flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${themeColor}1a` }}
          >
            <LucideIcon
              name={access?.icon ?? "Eye"}
              className="h-5 w-5"
              style={{ color: themeColor }}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {share.title}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {scopeLabel}
            </p>
          </div>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "border-transparent",
            "bg-opacity-100 text-xs font-medium"
          )}
          style={{
            backgroundColor: `${access?.color}1a`,
            color: access?.color,
          }}
        >
          {access?.label ?? share.accessLevel}
        </Badge>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums text-foreground">
            {share.viewCount}
          </span>{" "}
          views
        </span>
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" />
          <span className="font-medium tabular-nums text-foreground">
            {commentCount}
          </span>{" "}
          komentar
        </span>
        {share.passwordHash && (
          <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Lock className="h-3.5 w-3.5" />
            Password
          </span>
        )}
        {share.requireEmail && (
          <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
            <Mail className="h-3.5 w-3.5" />
            Email
          </span>
        )}
      </div>

      {/* Status + expiry */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full", status.dotClass)}
            aria-hidden="true"
          />
          <span className={cn("font-medium", status.textClass)}>
            {status.label}
          </span>
        </span>
        <span className="text-muted-foreground">
          {expiryLabel(share)}
        </span>
      </div>

      {/* Created date */}
      <p className="text-[11px] text-muted-foreground">
        Dibuat {formatDate(share.createdAt)}
      </p>

      {/* Actions */}
      <div className="mt-1 flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 flex-1"
          onClick={handleCopy}
        >
          <Copy className="h-3.5 w-3.5" />
          Salin
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 flex-1"
          onClick={onShowQr}
        >
          <QrCode className="h-3.5 w-3.5" />
          QR
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 flex-1"
          onClick={handleWhatsApp}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 w-8 p-0"
              aria-label="Aksi lainnya"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleClone}
              disabled={cloneMut.isPending || !share.active}
              className="gap-2"
            >
              {cloneMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              Duplikasi
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleRevoke}
              disabled={revokeMut.isPending || !share.active}
              className="gap-2 text-amber-600 focus:text-amber-700 dark:text-amber-400"
            >
              {revokeMut.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ShieldAlert className="h-3.5 w-3.5" />
              )}
              Cabut
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Hapus link berbagi ini?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Link <strong>{share.title}</strong> akan dihapus
                    permanen bersama semua data views dan komentar. Tindakan ini
                    tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleteMut.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMut.isPending && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

// ---------- QR Code Dialog ----------
function QrCodeDialog({
  share,
  onOpenChange,
}: {
  share: ShareLink | null;
  onOpenChange: (o: boolean) => void;
}) {
  const [copied, setCopied] = React.useState(false);
  if (!share) return null;
  const url = buildShareUrl(share.token);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
    url
  )}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link disalin");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Gagal menyalin link.");
    }
  }

  return (
    <Dialog open={!!share} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">Kode QR Link</DialogTitle>
              <DialogDescription className="text-xs">
                Pindai untuk membuka link berbagi.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 p-6">
          <div className="rounded-xl border border-border bg-white p-3">
            <img
              src={qrSrc}
              alt={`QR Code for ${share.title}`}
              width={200}
              height={200}
              className="h-[200px] w-[200px]"
            />
          </div>
          <div className="w-full space-y-1.5 text-center">
            <p className="text-sm font-medium text-foreground">{share.title}</p>
            <p className="break-all text-[11px] text-muted-foreground">{url}</p>
          </div>
          <Button
            type="button"
            onClick={copyLink}
            className="w-full gap-1.5"
            variant="outline"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? "Tersalin" : "Salin Link"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Form Dialog (Create / Edit) ----------
type FormState = {
  title: string;
  message: string;
  accessLevel: ShareAccessLevel;
  scopeType: ShareScopeType;
  scopeData: Record<string, unknown>;
  // expiry
  expiresAt: string; // yyyy-mm-dd or ""
  maxViews: string;
  hoursActive: string;
  oneTime: boolean;
  // security
  maxConcurrent: string;
  passwordEnabled: boolean;
  password: string;
  requireEmailEnabled: boolean;
  requireEmail: string;
  ipWhitelist: string;
  hiddenAmounts: boolean;
  maskedDesc: boolean;
  // appearance
  customTheme: string;
  hideBranding: boolean;
  language: string;
};

const DEFAULT_FORM: FormState = {
  title: "",
  message: "",
  accessLevel: "VIEW",
  scopeType: "ALL",
  scopeData: {},
  expiresAt: "",
  maxViews: "",
  hoursActive: "",
  oneTime: false,
  maxConcurrent: "",
  passwordEnabled: false,
  password: "",
  requireEmailEnabled: false,
  requireEmail: "",
  ipWhitelist: "",
  hiddenAmounts: false,
  maskedDesc: false,
  customTheme: "#10b981",
  hideBranding: false,
  language: "id",
};

function shareToForm(s: ShareLink): FormState {
  const sd = parseScopeData(s.scopeData);
  return {
    title: s.title,
    message: s.message ?? "",
    accessLevel: s.accessLevel,
    scopeType: s.scopeType,
    scopeData: sd,
    expiresAt: s.expiresAt ? formatDateInput(s.expiresAt) : "",
    maxViews: s.maxViews != null ? String(s.maxViews) : "",
    hoursActive: s.hoursActive != null ? String(s.hoursActive) : "",
    oneTime: s.oneTime,
    maxConcurrent: s.maxConcurrent != null ? String(s.maxConcurrent) : "",
    passwordEnabled: !!s.passwordHash,
    password: "",
    requireEmailEnabled: !!s.requireEmail,
    requireEmail: s.requireEmail ?? "",
    ipWhitelist: s.ipWhitelist ?? "",
    hiddenAmounts: s.hiddenAmounts,
    maskedDesc: s.maskedDesc,
    customTheme: s.customTheme ?? "#10b981",
    hideBranding: s.hideBranding,
    language: s.language || "id",
  };
}

function ShareFormDialog({
  open,
  onOpenChange,
  editShare,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editShare: ShareLink | null;
}) {
  const isEdit = !!editShare;
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();

  const createMut = useCreateShareLink();
  const updateMut = useUpdateShareLink();

  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [tab, setTab] = React.useState<string>("content");
  const [error, setError] = React.useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setForm(editShare ? shareToForm(editShare) : DEFAULT_FORM);
      setTab("content");
      setError(null);
    }
  }, [open, editShare]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Apply an expiry preset to form state
  function applyPreset(preset: (typeof SHARE_EXPIRY_PRESETS)[number]) {
    setForm((prev) => {
      const next = { ...prev, oneTime: false };
      if (preset.views) {
        next.maxViews = String(preset.views);
        next.expiresAt = "";
        next.hoursActive = "";
        next.oneTime = true;
      } else if (preset.hours) {
        next.hoursActive = String(preset.hours);
        next.expiresAt = "";
        next.maxViews = "";
      } else if (preset.days) {
        const d = new Date();
        d.setDate(d.getDate() + preset.days);
        next.expiresAt = formatDateInput(d);
        next.hoursActive = "";
        next.maxViews = "";
      } else {
        // Tidak kadaluarsa
        next.expiresAt = "";
        next.hoursActive = "";
        next.maxViews = "";
      }
      return next;
    });
  }

  function buildScopeData(): Record<string, unknown> {
    const sd: Record<string, unknown> = {};
    switch (form.scopeType) {
      case "ACCOUNT":
        if (form.scopeData.accountId)
          sd.accountId = form.scopeData.accountId;
        break;
      case "CATEGORY":
        if (form.scopeData.categoryId)
          sd.categoryId = form.scopeData.categoryId;
        break;
      case "GROUP":
        if (form.scopeData.groupId) sd.groupId = form.scopeData.groupId;
        break;
      case "TAG":
        if (form.scopeData.tag) sd.tag = form.scopeData.tag;
        break;
      case "DATE_RANGE":
        if (form.scopeData.from) sd.from = form.scopeData.from;
        if (form.scopeData.to) sd.to = form.scopeData.to;
        break;
      case "CUSTOM":
        sd.txIds = Array.isArray(form.scopeData.txIds)
          ? form.scopeData.txIds
          : [];
        break;
      case "ALL":
      default:
        break;
    }
    return sd;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Judul link wajib diisi.");
      setTab("content");
      return;
    }
    if (form.passwordEnabled && !form.password.trim() && !isEdit) {
      setError("Kata sandi belum diisi.");
      setTab("security");
      return;
    }
    if (
      form.passwordEnabled &&
      form.password.trim() &&
      form.password.trim().length < 4
    ) {
      setError("Kata sandi minimal 4 karakter.");
      setTab("security");
      return;
    }
    if (form.requireEmailEnabled && !form.requireEmail.trim()) {
      setError("Email verifikasi belum diisi.");
      setTab("security");
      return;
    }
    if (
      form.requireEmailEnabled &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.requireEmail)
    ) {
      setError("Format email verifikasi tidak valid.");
      setTab("security");
      return;
    }

    const scopeData = buildScopeData();

    const payload: ShareLinkInput = {
      title: form.title.trim(),
      message: form.message.trim() || undefined,
      accessLevel: form.accessLevel,
      scopeType: form.scopeType,
      scopeData,
      expiresAt: form.expiresAt
        ? parseDateLocal(form.expiresAt).toISOString()
        : undefined,
      maxViews: form.maxViews ? Number(form.maxViews) : undefined,
      hoursActive: form.hoursActive ? Number(form.hoursActive) : undefined,
      oneTime: form.oneTime,
      maxConcurrent: form.maxConcurrent ? Number(form.maxConcurrent) : undefined,
      requireEmail: form.requireEmailEnabled
        ? form.requireEmail.trim()
        : undefined,
      ipWhitelist: form.ipWhitelist.trim() || undefined,
      hiddenAmounts: form.hiddenAmounts,
      maskedDesc: form.maskedDesc,
      customTheme: form.customTheme,
      hideBranding: form.hideBranding,
      language: form.language,
    };

    // Password handling: only send if user typed one (create: required if enabled; edit: only if changed)
    if (form.passwordEnabled && form.password.trim()) {
      payload.password = form.password.trim();
    } else if (isEdit && !form.passwordEnabled) {
      // Disabled in edit → clear password
      payload.password = "";
    }

    if (isEdit && editShare) {
      updateMut.mutate(
        { id: editShare.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Link berbagi diperbarui.");
            onOpenChange(false);
          },
          onError: (err) =>
            setError(err.message || "Gagal memperbarui link."),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Link berbagi dibuat.");
          onOpenChange(false);
        },
        onError: (err) => setError(err.message || "Gagal membuat link."),
      });
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  const previewUrl = editShare
    ? buildShareUrl(editShare.token)
    : "/share/preview-link-anda";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">
                {isEdit ? "Ubah Link Berbagi" : "Buat Link Berbagi Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Perbarui pengaturan link berbagi Anda."
                  : "Bagikan data keuangan dengan aman."}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs
            value={tab}
            onValueChange={setTab}
            className="flex flex-col gap-0"
          >
            <div className="border-b border-border bg-background px-4 pt-3">
              <TabsList className="bg-muted/60">
                <TabsTrigger value="content" className="gap-1.5">
                  <Database className="h-3.5 w-3.5" />
                  Konten
                </TabsTrigger>
                <TabsTrigger value="security" className="gap-1.5">
                  <Shield className="h-3.5 w-3.5" />
                  Keamanan
                </TabsTrigger>
                <TabsTrigger value="appearance" className="gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tampilan
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[62vh] overflow-y-auto custom-scrollbar p-5">
                {/* TAB 1: KONTEN */}
                <TabsContent value="content" className="mt-0 space-y-5">
                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sh-title">
                      Judul <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="sh-title"
                      value={form.title}
                      onChange={(e) => update("title", e.target.value)}
                      placeholder="cth. Laporan Keuangan September"
                      autoFocus
                    />
                  </div>

                  {/* Message */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sh-message">Pesan (opsional)</Label>
                    <Textarea
                      id="sh-message"
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      placeholder="Tulis pesan singkat untuk penerima link…"
                      rows={3}
                    />
                  </div>

                  <Separator />

                  {/* Access level */}
                  <div className="space-y-2">
                    <Label>Tingkat Akses</Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {SHARE_ACCESS_LEVELS.map((lvl) => {
                        const selected = form.accessLevel === lvl.value;
                        return (
                          <button
                            key={lvl.value}
                            type="button"
                            onClick={() => update("accessLevel", lvl.value)}
                            className={cn(
                              "flex items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                              selected
                                ? "border-foreground/30 bg-muted/60"
                                : "border-border hover:border-foreground/20 hover:bg-muted/30"
                            )}
                            style={
                              selected
                                ? {
                                    borderColor: `${lvl.color}80`,
                                    backgroundColor: `${lvl.color}0d`,
                                  }
                                : undefined
                            }
                          >
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                backgroundColor: `${lvl.color}1a`,
                              }}
                            >
                              <LucideIcon
                                name={lvl.icon}
                                className="h-4 w-4"
                                style={{ color: lvl.color }}
                              />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-medium text-foreground">
                                  {lvl.label}
                                </p>
                                {selected && (
                                  <Check
                                    className="h-4 w-4 shrink-0"
                                    style={{ color: lvl.color }}
                                  />
                                )}
                              </div>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {lvl.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Scope type */}
                  <div className="space-y-2">
                    <Label>Cakupan Data</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {SHARE_SCOPE_TYPES.map((sc) => {
                        const selected = form.scopeType === sc.value;
                        return (
                          <button
                            key={sc.value}
                            type="button"
                            onClick={() =>
                              update("scopeType", sc.value as ShareScopeType)
                            }
                            className={cn(
                              "flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-colors",
                              selected
                                ? "border-primary bg-primary/5"
                                : "border-border hover:bg-muted/30"
                            )}
                          >
                            <LucideIcon
                              name={sc.icon}
                              className={cn(
                                "h-4 w-4",
                                selected
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              )}
                            />
                            <p className="text-xs font-medium text-foreground">
                              {sc.label}
                            </p>
                            <p className="text-[10px] leading-tight text-muted-foreground">
                              {sc.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Scope detail */}
                  <ScopeDetailEditor
                    form={form}
                    update={update}
                    accounts={accounts ?? []}
                    categories={categories ?? []}
                    groups={groups ?? []}
                  />
                </TabsContent>

                {/* TAB 2: KEAMANAN & MASA BERLAKU */}
                <TabsContent value="security" className="mt-0 space-y-5">
                  {/* Expiry presets */}
                  <div className="space-y-2">
                    <Label>Masa Berlaku Cepat</Label>
                    <div className="flex flex-wrap gap-2">
                      {SHARE_EXPIRY_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => applyPreset(preset)}
                        >
                          <Zap className="h-3.5 w-3.5" />
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Custom expiry */}
                  <div className="space-y-3">
                    <Label>Atur Masa Berlaku Manual</Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {/* Expiry date picker */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="sh-expires"
                          className="text-xs text-muted-foreground"
                        >
                          Tanggal Kadaluarsa
                        </Label>
                        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              id="sh-expires"
                              type="button"
                              variant="outline"
                              className="w-full justify-start text-left font-normal"
                            >
                              <CalendarDays className="h-4 w-4 text-muted-foreground" />
                              {form.expiresAt
                                ? formatDateLong(form.expiresAt)
                                : "Pilih tanggal"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={
                                form.expiresAt
                                  ? parseDateLocal(form.expiresAt)
                                  : undefined
                              }
                              onSelect={(d) => {
                                if (d) {
                                  update("expiresAt", formatDateInput(d));
                                }
                                setDatePickerOpen(false);
                              }}
                              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* Max views */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="sh-maxviews"
                          className="text-xs text-muted-foreground"
                        >
                          Batas Pembukaan
                        </Label>
                        <Input
                          id="sh-maxviews"
                          type="number"
                          min={0}
                          value={form.maxViews}
                          onChange={(e) => update("maxViews", e.target.value)}
                          placeholder="cth. 50"
                        />
                      </div>

                      {/* Hours active */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="sh-hours"
                          className="text-xs text-muted-foreground"
                        >
                          Aktif Selama (jam)
                        </Label>
                        <Input
                          id="sh-hours"
                          type="number"
                          min={0}
                          value={form.hoursActive}
                          onChange={(e) => update("hoursActive", e.target.value)}
                          placeholder="cth. 24"
                        />
                      </div>

                      {/* Max concurrent */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="sh-concurrent"
                          className="text-xs text-muted-foreground"
                        >
                          Maksimum Penonton Bersamaan
                        </Label>
                        <Input
                          id="sh-concurrent"
                          type="number"
                          min={0}
                          value={form.maxConcurrent}
                          onChange={(e) =>
                            update("maxConcurrent", e.target.value)
                          }
                          placeholder="cth. 5"
                        />
                      </div>
                    </div>

                    {/* One-time switch */}
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="sh-onetime" className="text-sm">
                          Sekali Pakai
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Link otomatis kadaluarsa setelah dibuka 1 kali.
                        </p>
                      </div>
                      <Switch
                        id="sh-onetime"
                        checked={form.oneTime}
                        onCheckedChange={(v) => update("oneTime", v)}
                      />
                    </div>
                  </div>

                  <Separator />

                  {/* Password protection */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="sh-pw-toggle" className="text-sm">
                          Proteksi Kata Sandi
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Penerima harus memasukkan kata sandi untuk membuka.
                        </p>
                      </div>
                      <Switch
                        id="sh-pw-toggle"
                        checked={form.passwordEnabled}
                        onCheckedChange={(v) => update("passwordEnabled", v)}
                      />
                    </div>
                    {form.passwordEnabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="sh-pw">
                          {isEdit
                            ? "Kata Sandi Baru (kosongkan jika tidak diubah)"
                            : "Kata Sandi"}
                        </Label>
                        <Input
                          id="sh-pw"
                          type="text"
                          autoComplete="off"
                          value={form.password}
                          onChange={(e) => update("password", e.target.value)}
                          placeholder="Min. 4 karakter"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Email verification */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="sh-email-toggle" className="text-sm">
                          Verifikasi Email
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Hanya penerima dengan email tertentu yang dapat
                          membuka.
                        </p>
                      </div>
                      <Switch
                        id="sh-email-toggle"
                        checked={form.requireEmailEnabled}
                        onCheckedChange={(v) =>
                          update("requireEmailEnabled", v)
                        }
                      />
                    </div>
                    {form.requireEmailEnabled && (
                      <div className="space-y-1.5">
                        <Label htmlFor="sh-email">Email Penerima</Label>
                        <Input
                          id="sh-email"
                          type="email"
                          value={form.requireEmail}
                          onChange={(e) => update("requireEmail", e.target.value)}
                          placeholder="nama@email.com"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* IP Whitelist */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sh-ip">Daftar Putih IP (opsional)</Label>
                    <Textarea
                      id="sh-ip"
                      value={form.ipWhitelist}
                      onChange={(e) => update("ipWhitelist", e.target.value)}
                      placeholder="192.168.1.1, 203.0.0.0/24"
                      rows={2}
                    />
                    <p className="text-xs text-muted-foreground">
                      Pisahkan beberapa IP dengan koma. Gunakan CIDR untuk
                      subnet.
                    </p>
                  </div>

                  <Separator />

                  {/* Privacy switches */}
                  <div className="space-y-2">
                    <Label>Privasi</Label>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="sh-hidden-amt" className="text-sm">
                          Sembunyikan Nominal
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Nominal transaksi tidak ditampilkan.
                        </p>
                      </div>
                      <Switch
                        id="sh-hidden-amt"
                        checked={form.hiddenAmounts}
                        onCheckedChange={(v) => update("hiddenAmounts", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="sh-masked-desc" className="text-sm">
                          Samarkan Deskripsi
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Deskripsi transaksi dipotong sebagian.
                        </p>
                      </div>
                      <Switch
                        id="sh-masked-desc"
                        checked={form.maskedDesc}
                        onCheckedChange={(v) => update("maskedDesc", v)}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: TAMPILAN */}
                <TabsContent value="appearance" className="mt-0 space-y-5">
                  {/* Theme color */}
                  <div className="space-y-2">
                    <Label>Warna Tema</Label>
                    <div className="flex flex-wrap gap-2">
                      {SHARE_THEME_COLORS.map((color) => {
                        const selected = form.customTheme === color;
                        return (
                          <button
                            key={color}
                            type="button"
                            onClick={() => update("customTheme", color)}
                            className={cn(
                              "h-8 w-8 rounded-full border-2 transition-all",
                              selected
                                ? "border-foreground scale-110"
                                : "border-transparent hover:scale-105"
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Warna ${color}`}
                          >
                            {selected && (
                              <Check className="mx-auto h-4 w-4 text-white drop-shadow" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Hide branding */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="space-y-0.5">
                      <Label htmlFor="sh-branding" className="text-sm">
                        Sembunyikan Branding
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Logo & nama DompetKu tidak ditampilkan di halaman
                        share.
                      </p>
                    </div>
                    <Switch
                      id="sh-branding"
                      checked={form.hideBranding}
                      onCheckedChange={(v) => update("hideBranding", v)}
                    />
                  </div>

                  <Separator />

                  {/* Language */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sh-lang">Bahasa</Label>
                    <Select
                      value={form.language}
                      onValueChange={(v) => update("language", v)}
                    >
                      <SelectTrigger id="sh-lang" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="id">Indonesia</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Preview */}
                  <div className="space-y-2">
                    <Label>Pratinjau Kartu Link</Label>
                    <SharePreview form={form} />
                  </div>
                </TabsContent>
            </div>

            {/* Footer */}
            <DialogFooter className="flex flex-col gap-3 border-t border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
              {/* URL preview */}
              <div className="flex min-w-0 flex-1 items-center gap-2 text-xs">
                <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-muted-foreground">
                  {previewUrl}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={pending}>
                    Batal
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={pending} className="gap-1">
                  {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? "Simpan Perubahan" : "Buat Link"}
                </Button>
              </div>
            </DialogFooter>

            {/* Hidden error banner */}
            {error && (
              <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </Tabs>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Scope Detail Editor ----------
function ScopeDetailEditor({
  form,
  update,
  accounts,
  categories,
  groups,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  accounts: Array<{ id: string; name: string; type: string; color: string; icon: string }>;
  categories: Array<{ id: string; name: string; type: string; color: string; icon: string }>;
  groups: Array<{ id: string; name: string; color: string; icon: string }>;
}) {
  const setScopeField = (key: string, value: unknown) => {
    update("scopeData", { ...form.scopeData, [key]: value });
  };

  switch (form.scopeType) {
    case "ACCOUNT":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="sh-account">Pilih Akun</Label>
          <Select
            value={String(form.scopeData.accountId ?? "")}
            onValueChange={(v) => setScopeField("accountId", v)}
          >
            <SelectTrigger id="sh-account" className="w-full">
              <SelectValue placeholder="Pilih akun" />
            </SelectTrigger>
            <SelectContent>
              {accounts.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Tidak ada akun tersedia.
                </div>
              ) : (
                accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <LucideIcon
                        name={a.icon}
                        className="h-4 w-4"
                        style={{ color: a.color }}
                      />
                      {a.name}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      );
    case "CATEGORY":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="sh-category">Pilih Kategori</Label>
          <Select
            value={String(form.scopeData.categoryId ?? "")}
            onValueChange={(v) => setScopeField("categoryId", v)}
          >
            <SelectTrigger id="sh-category" className="w-full">
              <SelectValue placeholder="Pilih kategori" />
            </SelectTrigger>
            <SelectContent>
              {categories.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Tidak ada kategori tersedia.
                </div>
              ) : (
                categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="flex items-center gap-2">
                      <LucideIcon
                        name={c.icon}
                        className="h-4 w-4"
                        style={{ color: c.color }}
                      />
                      {c.name}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      );
    case "GROUP":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="sh-group">Pilih Event/Group</Label>
          <Select
            value={String(form.scopeData.groupId ?? "")}
            onValueChange={(v) => setScopeField("groupId", v)}
          >
            <SelectTrigger id="sh-group" className="w-full">
              <SelectValue placeholder="Pilih group" />
            </SelectTrigger>
            <SelectContent>
              {groups.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  Tidak ada group tersedia.
                </div>
              ) : (
                groups.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    <span className="flex items-center gap-2">
                      <LucideIcon
                        name={g.icon}
                        className="h-4 w-4"
                        style={{ color: g.color }}
                      />
                      {g.name}
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
      );
    case "TAG":
      return (
        <div className="space-y-1.5">
          <Label htmlFor="sh-tag">Nama Tag</Label>
          <Input
            id="sh-tag"
            value={String(form.scopeData.tag ?? "")}
            onChange={(e) => setScopeField("tag", e.target.value)}
            placeholder="cth. liburan2026"
          />
        </div>
      );
    case "DATE_RANGE":
      return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sh-from">Dari Tanggal</Label>
            <Input
              id="sh-from"
              type="date"
              value={String(form.scopeData.from ?? "")}
              onChange={(e) => setScopeField("from", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sh-to">Sampai Tanggal</Label>
            <Input
              id="sh-to"
              type="date"
              value={String(form.scopeData.to ?? "")}
              onChange={(e) => setScopeField("to", e.target.value)}
            />
          </div>
        </div>
      );
    case "CUSTOM":
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <ListChecks className="h-4 w-4" />
            Pilih transaksi setelah link dibuat. Anda dapat memilih transaksi
            individual dari halaman share nanti.
          </p>
        </div>
      );
    case "ALL":
    default:
      return (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Database className="h-4 w-4" />
            Semua transaksi Anda akan dibagikan melalui link ini.
          </p>
        </div>
      );
  }
}

// ---------- Share Preview Card ----------
function SharePreview({ form }: { form: FormState }) {
  const access = SHARE_ACCESS_LEVELS.find((a) => a.value === form.accessLevel);
  const scope = SHARE_SCOPE_TYPES.find((s) => s.value === form.scopeType);
  const theme = form.customTheme;

  return (
    <div
      className="overflow-hidden rounded-xl border border-border"
      style={{ borderTopColor: theme, borderTopWidth: 3 }}
    >
      <div className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${theme}1a` }}
          >
            <LucideIcon
              name={access?.icon ?? "Eye"}
              className="h-4 w-4"
              style={{ color: theme }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {form.title.trim() || "Judul Link Berbagi"}
            </p>
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LucideIcon
                name={scope?.icon ?? "Database"}
                className="h-3 w-3"
              />
              {scope?.label ?? "Semua Data"}
            </p>
          </div>
          {!form.hideBranding && (
            <Badge
              variant="secondary"
              className="border-transparent bg-primary/10 text-[10px] text-primary"
            >
              DompetKu
            </Badge>
          )}
        </div>

        {form.message.trim() && (
          <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
            {form.message.trim()}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-[11px]">
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium"
            style={{
              backgroundColor: `${access?.color}1a`,
              color: access?.color,
            }}
          >
            <Shield className="h-3 w-3" />
            {access?.label}
          </span>
          {form.passwordEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" />
              Terproteksi
            </span>
          )}
          {form.requireEmailEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 font-medium text-cyan-600 dark:text-cyan-400">
              <Mail className="h-3 w-3" />
              Verifikasi Email
            </span>
          )}
          {form.hiddenAmounts && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              Nominal Disembunyikan
            </span>
          )}
          {form.maskedDesc && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 font-medium text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              Deskripsi Disamarkan
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border pt-3 text-[11px] text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>0 views</span>
          <Separator orientation="vertical" className="mx-1 h-3" />
          <MessageCircle className="h-3 w-3" />
          <span>0 komentar</span>
        </div>
      </div>
    </div>
  );
}

export default SharesSection;
