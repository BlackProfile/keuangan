"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArchiveRestore,
  Clock,
  Inbox,
  Loader2,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatDateLong,
  parseDateLocal,
} from "@/lib/format";
import {
  useDeletedTransactions,
  useEmptyTrash,
  usePurgeDeletedTransaction,
  useRestoreTransaction,
} from "@/lib/hooks";
import type { DeletedTransaction } from "@/lib/types";

const TRASH_RETENTION_DAYS = 30;

function daysUntil(iso: string): number {
  const target = parseDateLocal(iso);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil(
    (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function expiryBadge(expiresAt: string) {
  const days = daysUntil(expiresAt);
  if (days <= 0) {
    return {
      label: "Segera dihapus",
      className:
        "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    };
  }
  if (days <= 3) {
    return {
      label: `${days} hari lagi`,
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
    };
  }
  if (days <= 7) {
    return {
      label: `${days} hari lagi`,
      className:
        "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
    };
  }
  return {
    label: `${days} hari lagi`,
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  };
}

function TrashCard({
  item,
  onRestore,
  onPurge,
  restoring,
  purging,
}: {
  item: DeletedTransaction;
  onRestore: () => void;
  onPurge: () => void;
  restoring: boolean;
  purging: boolean;
}) {
  const expiry = expiryBadge(item.expiresAt);
  const isIncome = item.type === "INCOME";
  return (
    <Card className="border p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
          style={{ backgroundColor: item.category?.color ?? "#6b7280" }}
        >
          <LucideIcon
            name={item.category?.icon ?? "Receipt"}
            className="h-5 w-5"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{item.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatDateLong(item.date)}
                {item.merchant ? ` • ${item.merchant}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={cn(
                  "font-semibold tabular-nums",
                  isIncome ? "text-emerald-600" : "text-rose-600"
                )}
              >
                {isIncome ? "+" : "-"}
                {formatCurrency(item.amount)}
              </p>
              <p className="text-xs text-muted-foreground">
                {isIncome ? "Pemasukan" : "Pengeluaran"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary" className={expiry.className}>
              <Clock className="mr-1 h-3 w-3" />
              {expiry.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Dihapus {formatDate(item.deletedAt)}
            </span>
            {item.category && (
              <Badge variant="outline" className="text-xs">
                {item.category.name}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onRestore}
              disabled={restoring || purging}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
            >
              {restoring ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              )}
              Pulihkan
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={restoring || purging}
                  className="text-muted-foreground hover:text-destructive"
                >
                  {purging ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Hapus Permanen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus permanen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Transaksi &quot;{item.description}&quot; akan dihapus
                    permanen dan tidak bisa dipulihkan lagi.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onPurge}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Hapus Permanen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function TrashSection() {
  const { data: items, isLoading } = useDeletedTransactions();
  const restoreMut = useRestoreTransaction();
  const purgeMut = usePurgeDeletedTransaction();
  const emptyMut = useEmptyTrash();

  const sorted = React.useMemo(() => {
    return (items ?? [])
      .slice()
      .sort(
        (a, b) =>
          new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );
  }, [items]);

  const expiredCount = React.useMemo(
    () => sorted.filter((i) => daysUntil(i.expiresAt) <= 0).length,
    [sorted]
  );

  function handleRestore(item: DeletedTransaction) {
    restoreMut.mutate(item.id, {
      onSuccess: () => toast.success(`"${item.description}" dipulihkan`),
      onError: (e) => toast.error(e.message),
    });
  }

  function handlePurge(item: DeletedTransaction) {
    purgeMut.mutate(item.id, {
      onSuccess: () =>
        toast.success(`"${item.description}" dihapus permanen`),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleEmptyExpired() {
    emptyMut.mutate(true, {
      onSuccess: (r) =>
        toast.success(
          r?.purged
            ? `${r.purged} transaksi kedaluwarsa dihapus`
            : "Tidak ada transaksi kedaluwarsa"
        ),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleEmptyAll() {
    emptyMut.mutate(false, {
      onSuccess: (r) =>
        toast.success(
          r?.purged
            ? `${r.purged} transaksi dihapus permanen`
            : "Tempat sampah sudah kosong"
        ),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
              <ArchiveRestore className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Tempat Sampah
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Transaksi yang dihapus (dipulihkan dalam {TRASH_RETENTION_DAYS}{" "}
            hari)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleEmptyExpired}
            disabled={emptyMut.isPending || expiredCount === 0}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Hapus Kedaluwarsa
            {expiredCount > 0 && (
              <Badge
                variant="secondary"
                className="ml-1.5 bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
              >
                {expiredCount}
              </Badge>
            )}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={emptyMut.isPending || sorted.length === 0}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Kosongkan Tempat Sampah
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Kosongkan seluruh tempat sampah?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  Semua {sorted.length} transaksi di tempat sampah akan dihapus
                  permanen dan tidak bisa dipulihkan lagi.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleEmptyAll}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Ya, Kosongkan
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Trash list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
            <Inbox className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">Tempat sampah kosong</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Transaksi yang Anda hapus akan muncul di sini. Anda bisa
              memulihkannya selama {TRASH_RETENTION_DAYS} hari sebelum dihapus
              permanen secara otomatis.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {sorted.map((item) => (
            <TrashCard
              key={item.id}
              item={item}
              onRestore={() => handleRestore(item)}
              onPurge={() => handlePurge(item)}
              restoring={
                restoreMut.isPending &&
                restoreMut.variables === item.id
              }
              purging={
                purgeMut.isPending && purgeMut.variables === item.id
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
