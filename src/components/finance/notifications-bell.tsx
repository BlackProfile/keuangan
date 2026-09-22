"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  Inbox,
  Loader2,
  Target,
  Trash2,
  ReceiptText,
  Sparkles,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatCurrency, parseDateLocal } from "@/lib/format";
import {
  useBills,
  useBudgetStatuses,
  useClearReadNotifications,
  useCreateNotification,
  useDashboard,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/hooks";
import type {
  AppNotification,
  NotificationInput,
  NotificationType,
} from "@/lib/types";

const NOTIFICATION_TYPE_CONFIG: Record<
  string,
  { icon: React.ReactNode; color: string; label: string }
> = {
  BILL_DUE: {
    icon: <ReceiptText className="h-3.5 w-3.5" />,
    color: "#f97316",
    label: "Tagihan",
  },
  BUDGET_ALERT: {
    icon: <AlertCircle className="h-3.5 w-3.5" />,
    color: "#ef4444",
    label: "Anggaran",
  },
  GOAL_MILESTONE: {
    icon: <Target className="h-3.5 w-3.5" />,
    color: "#10b981",
    label: "Target",
  },
  SUBSCRIPTION_RENEWAL: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "#8b5cf6",
    label: "Langganan",
  },
  INSIGHT: {
    icon: <Sparkles className="h-3.5 w-3.5" />,
    color: "#0891b2",
    label: "Insight",
  },
  REMINDER: {
    icon: <Bell className="h-3.5 w-3.5" />,
    color: "#eab308",
    label: "Pengingat",
  },
  SYSTEM: {
    icon: <Info className="h-3.5 w-3.5" />,
    color: "#6b7280",
    label: "Sistem",
  },
};

function configForType(type: string) {
  return (
    NOTIFICATION_TYPE_CONFIG[type] ?? {
      icon: <Bell className="h-3.5 w-3.5" />,
      color: "#6b7280",
      label: "Lainnya",
    }
  );
}

export function NotificationsBell() {
  const { data: notifications, isLoading } = useNotifications();
  const markAllReadMut = useMarkAllNotificationsRead();
  const markReadMut = useMarkNotificationRead();
  const clearReadMut = useClearReadNotifications();
  const createNotifMut = useCreateNotification();
  const [open, setOpen] = React.useState(false);

  // Auto-generation sources
  const { data: bills } = useBills();
  const { data: budgets } = useBudgetStatuses();
  const { data: dashboard } = useDashboard();

  const unreadCount = React.useMemo(
    () => (notifications ?? []).filter((n) => !n.read).length,
    [notifications]
  );

  const sorted = React.useMemo(() => {
    const list = notifications ?? [];
    return [...list].sort(
      (a, b) =>
        parseDateLocal(b.createdAt).getTime() -
        parseDateLocal(a.createdAt).getTime()
    );
  }, [notifications]);

  // Auto-generate notifications from bills, budgets, and goals — runs once per
  // session after source data is available. Backend does not persist metadata,
  // so we dedupe by checking whether an existing notification already has the
  // exact same body (which includes bill/category/goal identifiers).
  const autoGenRanRef = React.useRef(false);
  React.useEffect(() => {
    if (autoGenRanRef.current) return;
    if (!notifications) return;
    if (bills === undefined) return;
    if (budgets === undefined) return;
    if (dashboard === undefined) return;
    if (createNotifMut.isPending) return;
    autoGenRanRef.current = true;

    const existingBodies = new Set(
      notifications.map((n) => n.body?.trim().toLowerCase() ?? "")
    );
    const existingTitles = new Set(
      notifications.map((n) => n.title?.trim().toLowerCase() ?? "")
    );

    const toCreate: NotificationInput[] = [];

    // 1. Bills due within 3 days
    for (const bill of bills) {
      if (bill.paidThisMonth) continue;
      const days = getDaysUntilDue(bill.dueDay);
      if (days < 0 || days > 3) continue;
      const body = `${bill.name} (${formatCurrency(
        bill.amount
      )}) jatuh tempo ${
        days === 0 ? "hari ini" : `${days} hari lagi`
      }.`;
      if (existingBodies.has(body.toLowerCase())) continue;
      toCreate.push({
        type: "BILL_DUE",
        title: "Tagihan Jatuh Tempo",
        body,
        icon: "ReceiptText",
        actionUrl: "/?section=bills",
      });
    }

    // 2. Budget alerts — over or in danger zone
    for (const b of budgets) {
      if (b.status !== "danger" && b.status !== "over") continue;
      const body = `${b.category.name}: ${formatCurrency(
        b.spent
      )} dari ${formatCurrency(b.amount)} (${Math.round(
        b.percentage
      )}% terpakai).`;
      if (existingBodies.has(body.toLowerCase())) continue;
      toCreate.push({
        type: "BUDGET_ALERT",
        title:
          b.status === "over" ? "Anggaran Terlewati" : "Anggaran Mendekati Limit",
        body,
        icon: "AlertCircle",
        actionUrl: "/?section=budgets",
      });
    }

    // 3. Goal milestones (50%, 75%, 90%)
    for (const g of dashboard.goals) {
      if (g.completed) continue;
      if (g.targetAmount <= 0) continue;
      const pct = (g.currentAmount / g.targetAmount) * 100;
      const milestone = [50, 75, 90].find((m) => pct >= m && pct < m + 5);
      if (milestone === undefined) continue;
      const title = `Target ${milestone}% Tercapai`;
      // For goals, dedupe by title + goal name in body — we want at most one
      // notification per milestone per goal.
      const body = `${g.name}: ${formatCurrency(
        g.currentAmount
      )} dari ${formatCurrency(g.targetAmount)}. Terus tingkatkan!`;
      if (existingTitles.has(title.toLowerCase()) && existingBodies.has(body.toLowerCase())) {
        continue;
      }
      toCreate.push({
        type: "GOAL_MILESTONE",
        title,
        body,
        icon: "Target",
        actionUrl: "/?section=goals",
      });
    }

    if (toCreate.length === 0) return;
    for (const input of toCreate) {
      createNotifMut.mutate(input, {
        onError: () => {
          /* silent — best-effort */
        },
      });
    }
  }, [
    notifications,
    bills,
    budgets,
    dashboard,
    createNotifMut,
  ]);

  function handleMarkAllRead() {
    if (unreadCount === 0) return;
    const unreadIds = (notifications ?? [])
      .filter((n) => !n.read)
      .map((n) => n.id);
    if (unreadIds.length === 0) return;
    markAllReadMut.mutate(unreadIds, {
      onSuccess: () => toast.success("Semua notifikasi ditandai dibaca"),
      onError: (e: Error) =>
        toast.error("Gagal menandai semua dibaca", { description: e.message }),
    });
  }

  function handleMarkRead(n: AppNotification) {
    if (n.read) return;
    markReadMut.mutate(n.id, {
      onError: (e: Error) =>
        toast.error("Gagal menandai dibaca", { description: e.message }),
    });
  }

  function handleClearRead() {
    clearReadMut.mutate(undefined, {
      onSuccess: () =>
        toast.success("Notifikasi yang sudah dibaca dibersihkan"),
      onError: (e: Error) =>
        toast.error("Gagal membersihkan notifikasi", { description: e.message }),
    });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
          aria-label={`Notifikasi${
            unreadCount > 0 ? `, ${unreadCount} belum dibaca` : ""
          }`}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <motion.span
              key={unreadCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(360px,calc(100vw-2rem))] p-0"
      >
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold">Notifikasi</span>
            {unreadCount > 0 && (
              <Badge className="bg-red-100 px-1.5 text-[10px] text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400">
                {unreadCount} baru
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleMarkAllRead}
            disabled={
              unreadCount === 0 ||
              markAllReadMut.isPending ||
              markReadMut.isPending
            }
            className="h-7 gap-1 px-2 text-xs"
          >
            {markAllReadMut.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCheck className="h-3.5 w-3.5" />
            )}
            Tandai Semua Dibaca
          </Button>
        </div>

        <ScrollArea className="max-h-96">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : sorted.length === 0 ? (
            <EmptyNotifications />
          ) : (
            <ul className="divide-y divide-border/60">
              <AnimatePresence initial={false}>
                {sorted.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onMarkRead={() => handleMarkRead(n)}
                    isProcessing={markReadMut.isPending}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </ScrollArea>

        {sorted.length > 0 && (
          <div className="flex items-center justify-between gap-2 border-t border-border px-3 py-2">
            <p className="text-[11px] text-muted-foreground">
              {sorted.length} notifikasi · {unreadCount} belum dibaca
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClearRead}
              disabled={
                sorted.length === 0 || clearReadMut.isPending
              }
              className="h-6 gap-1 px-1.5 text-[11px] text-muted-foreground hover:text-red-600"
            >
              {clearReadMut.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Bersihkan dibaca
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

interface NotificationRowProps {
  notification: AppNotification;
  onMarkRead: () => void;
  isProcessing: boolean;
}

function NotificationRow({
  notification,
  onMarkRead,
  isProcessing,
}: NotificationRowProps) {
  const config = configForType(notification.type);
  const time = relativeTime(notification.createdAt);

  function handleClick() {
    if (!notification.read) onMarkRead();
  }

  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative cursor-pointer px-3 py-3 transition-colors hover:bg-accent/40",
        !notification.read && "bg-primary/[0.04]"
      )}
      onClick={handleClick}
    >
      {/* Unread indicator dot */}
      {!notification.read && (
        <span
          className="absolute left-1.5 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-primary"
          aria-label="Belum dibaca"
        />
      )}
      <div className="flex items-start gap-2.5 pl-2">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: config.color }}
        >
          {config.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold">
              {notification.title}
            </p>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              {time}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
            {notification.body}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
            >
              {config.label}
            </Badge>
            {!notification.read && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkRead();
                }}
                disabled={isProcessing}
                className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
              >
                Tandai dibaca
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.li>
  );
}

function EmptyNotifications() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="text-sm font-medium">Tidak ada notifikasi</p>
      <p className="max-w-[240px] text-[11px] text-muted-foreground">
        Anda akan melihat pengingat tagihan jatuh tempo, peringatan anggaran, dan
        pencapaian target di sini.
      </p>
    </div>
  );
}

// =================== HELPERS ===================

function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDueDay = Math.min(Math.max(dueDay, 1), daysInMonth);
  let dueDate = new Date(year, month, safeDueDay);
  dueDate.setHours(0, 0, 0, 0);
  if (dueDate.getTime() < today.getTime()) {
    dueDate = new Date(year, month + 1, safeDueDay);
    dueDate.setHours(0, 0, 0, 0);
  }
  return Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

function relativeTime(input: string): string {
  const d = parseDateLocal(input);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return "Baru saja";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} mnt lalu`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} jam lalu`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} hari lalu`;
  const wk = Math.floor(day / 7);
  if (wk < 4) return `${wk} mgg lalu`;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
  });
}
