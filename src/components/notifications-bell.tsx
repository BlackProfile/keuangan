"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { api, type NotificationItem } from "@/lib/api";
import {
  useDeleteNotification,
  useDailyAllowance,
  useGoals,
  useMarkNotificationRead,
  useNotifications,
  useRecurring,
  useTransactions,
} from "@/lib/hooks";
import { formatCurrency, formatDateInput, relativeDay } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Notification payload helpers                                       */
/* ------------------------------------------------------------------ */

async function postNotification(
  payload: { type: string; title: string; body: string; icon?: string },
  qc: ReturnType<typeof useQueryClient>
) {
  try {
    await api.createNotification(payload);
    qc.invalidateQueries({ queryKey: ["notifications"] });
  } catch {
    // Silent fail — notifications are best-effort
  }
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/* ------------------------------------------------------------------ */
/*  Bell component                                                     */
/* ------------------------------------------------------------------ */

export function NotificationsBell() {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const { data: notifications } = useNotifications();
  const markReadMut = useMarkNotificationRead();
  const deleteMut = useDeleteNotification();

  // Data sources for auto-notification generation
  const { data: transactions } = useTransactions();
  const { data: recurring } = useRecurring();
  const { data: daily } = useDailyAllowance();
  const { data: goals } = useGoals();

  const generate = React.useCallback(() => {
    // 1. Reminder catat harian — at 9 PM, if no transactions today
    if (transactions) {
      const today = formatDateInput(new Date());
      const hasToday = transactions.some(
        (t) => formatDateInput(t.date) === today && t.type === "EXPENSE"
      );
      const hour = new Date().getHours();
      if (!hasToday && hour >= 21) {
        void postNotification(
          {
            type: "DAILY_REMINDER",
            title: "Sudah catat pengeluaran hari ini?",
            body: "Jangan lupa catat semua jajan dan pengeluaran hari ini sebelum tidur.",
            icon: "Calendar",
          },
          qc
        );
      }
    }

    // 2. Reminder tagihan — bills due within 3 days
    if (recurring) {
      const now = startOfDay(new Date());
      const in3 = new Date(now);
      in3.setDate(now.getDate() + 3);
      for (const b of recurring) {
        if (!b.active) continue;
        const next = startOfDay(new Date(b.nextDate));
        if (next.getTime() >= now.getTime() && next.getTime() <= in3.getTime()) {
          void postNotification(
            {
              type: "BILL_DUE",
              title: `Tagihan ${b.description} jatuh tempo ${relativeDay(b.nextDate)}`,
              body: `Jatuh tempo dalam 3 hari lagi. Segera siapkan dana ${formatCurrency(b.amount)}.`,
              icon: "ReceiptText",
            },
            qc
          );
        }
      }
    }

    // 3. Alert 80% — monthly spending > 80% of allowance
    if (daily && daily.monthlyAllowance > 0) {
      const pct = (daily.spentThisMonth / daily.monthlyAllowance) * 100;
      if (pct >= 80) {
        void postNotification(
          {
            type: "BUDGET_ALERT",
            title: "Pengeluaran sudah 80% uang saku!",
            body: `Bulan ini sudah terpakai ${pct.toFixed(0)}% dari ${formatCurrency(
              daily.monthlyAllowance
            )}. Waktu ngendalikan pengeluaran.`,
            icon: "AlertTriangle",
          },
          qc
        );
      }
    }

    // 4. Goal milestone — any goal crossed 50%
    if (goals) {
      for (const g of goals) {
        if (g.targetAmount <= 0) continue;
        const pct = (g.currentAmount / g.targetAmount) * 100;
        if (pct >= 50 && !g.completed) {
          void postNotification(
            {
              type: "GOAL_MILESTONE",
              title: `Target '${g.name}' sudah ${Math.floor(pct)}%!`,
              body: `Lumayan! Sisa ${formatCurrency(
                Math.max(g.targetAmount - g.currentAmount, 0)
              )} lagi untuk capai target.`,
              icon: "Target",
            },
            qc
          );
        }
      }
    }

    // 5. Anomali — today's spending > 3x average daily
    if (transactions) {
      const today = formatDateInput(new Date());
      const todaySpent = transactions
        .filter(
          (t) =>
            t.type === "EXPENSE" &&
            formatDateInput(t.date) === today
        )
        .reduce((s, t) => s + t.amount, 0);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentExpenses = transactions.filter(
        (t) =>
          t.type === "EXPENSE" &&
          new Date(t.date) >= thirtyDaysAgo
      );
      const totalRecent = recentExpenses.reduce((s, t) => s + t.amount, 0);
      const avgDaily = totalRecent / 30;
      if (avgDaily > 0 && todaySpent > avgDaily * 3 && todaySpent > 10000) {
        void postNotification(
          {
            type: "ANOMALY",
            title: "Pengeluaran hari ini tidak biasa",
            body: `Sudah keluar ${formatCurrency(
              todaySpent
            )} hari ini — 3x rata-rata harian ${formatCurrency(avgDaily)}. Cek yuk.`,
            icon: "TrendingUp",
          },
          qc
        );
      }
    }
  }, [qc, transactions, recurring, daily, goals]);

  // Run once on mount + every 5 minutes
  React.useEffect(() => {
    // Delay first run by 2s so we don't compete with initial queries
    const first = setTimeout(generate, 2000);
    const id = setInterval(generate, 5 * 60 * 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [generate]);

  // Outside-click closes dropdown
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const items: NotificationItem[] = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    for (const n of items.filter((n) => !n.read)) {
      markReadMut.mutate(n.id);
    }
    if (items.length === 0) {
      toast.info("Tidak ada notifikasi.");
    } else {
      toast.success("Semua notifikasi ditandai dibaca.");
    }
  }

  function handleDelete(id: string) {
    deleteMut.mutate(id, {
      onError: (err) => toast.error(err.message || "Gagal menghapus."),
    });
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifikasi"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : (
          items.length > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" />
          )
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2.5">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold">Notifikasi</p>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                  {unreadCount} baru
                </span>
              )}
            </div>
            <div className="flex gap-1">
              {items.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  className="h-6 px-2 text-[11px] text-muted-foreground"
                  disabled={markReadMut.isPending}
                >
                  Tandai dibaca
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="h-6 w-6 text-muted-foreground"
                aria-label="Tutup"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* List */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <BellOff className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">
                Belum ada notifikasi.
              </p>
            </div>
          ) : (
            <ul className="custom-scrollbar max-h-96 divide-y divide-border overflow-y-auto">
              {items.map((n) => (
                <NotificationRow
                  key={n.id}
                  item={n}
                  onMarkRead={() => markReadMut.mutate(n.id)}
                  onDelete={() => handleDelete(n.id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Row                                                                */
/* ------------------------------------------------------------------ */

function NotificationRow({
  item,
  onMarkRead,
  onDelete,
}: {
  item: NotificationItem;
  onMarkRead: () => void;
  onDelete: () => void;
}) {
  const time = relativeDay(item.createdAt);
  return (
    <li
      className={cn(
        "group relative px-3 py-2.5 transition-colors hover:bg-muted/40",
        !item.read && "bg-emerald-50/40 dark:bg-emerald-500/5"
      )}
    >
      <button
        type="button"
        onClick={onMarkRead}
        className="block w-full text-left"
        aria-label={item.read ? "Notifikasi dibaca" : "Tandai dibaca"}
      >
        <div className="flex items-start gap-2.5">
          <span
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
              item.read
                ? "bg-muted text-muted-foreground"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            )}
          >
            <LucideIcon name={item.icon || "Bell"} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {!item.read && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
              )}
              <p className="truncate text-xs font-semibold text-foreground">
                {item.title}
              </p>
            </div>
            <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
              {item.body}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">{time}</p>
          </div>
        </div>
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label="Hapus notifikasi"
        className="absolute right-2 top-2 hidden h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive group-hover:flex"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </li>
  );
}
