"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
} from "@/lib/format";
import {
  useBudgetStatuses,
  useCategories,
  useCreateBudget,
  useDeleteBudget,
  useUpdateBudget,
} from "@/lib/hooks";
import type {
  BudgetInput,
  BudgetPeriod,
  BudgetStatus,
} from "@/lib/types";

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

type BudgetStatusKey = BudgetStatus["status"];

const STATUS_CONFIG: Record<
  BudgetStatusKey,
  { label: string; color: string; badgeClass: string }
> = {
  safe: {
    label: "Aman",
    color: "#10b981",
    badgeClass:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  },
  warning: {
    label: "Waspada",
    color: "#eab308",
    badgeClass:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  },
  danger: {
    label: "Bahaya",
    color: "#f97316",
    badgeClass:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  },
  over: {
    label: "Lewat",
    color: "#ef4444",
    badgeClass:
      "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
};

export function BudgetsSection() {
  const { data: budgets, isLoading } = useBudgetStatuses();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editBudget, setEditBudget] = React.useState<BudgetStatus | null>(
    null
  );

  const totals = React.useMemo(() => {
    const total = (budgets ?? []).reduce((s, b) => s + b.amount, 0);
    const spent = (budgets ?? []).reduce((s, b) => s + b.spent, 0);
    return { total, spent, remaining: total - spent };
  }, [budgets]);

  function openCreate() {
    setEditBudget(null);
    setDialogOpen(true);
  }

  function openEdit(b: BudgetStatus) {
    setEditBudget(b);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Anggaran</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Atur batas pengeluaran per kategori dan pantau realisasinya.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Tambah Anggaran
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryMini
          label="Total Anggaran"
          value={totals.total}
          tone="default"
          icon={<Wallet className="h-4 w-4" />}
        />
        <SummaryMini
          label="Total Terpakai"
          value={totals.spent}
          tone="expense"
        />
        <SummaryMini
          label="Sisa Anggaran"
          value={totals.remaining}
          tone={totals.remaining >= 0 ? "income" : "expense"}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-2xl" />
          ))}
        </div>
      ) : (budgets ?? []).length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {(budgets ?? []).map((b) => (
            <BudgetCard
              key={b.id}
              budget={b}
              onEdit={() => openEdit(b)}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editBudget={editBudget}
      />
    </div>
  );
}

function SummaryMini({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: "default" | "income" | "expense";
  icon?: React.ReactNode;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        {icon && (
          <span className="text-muted-foreground/70">{icon}</span>
        )}
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          tone === "income" && "text-income",
          tone === "expense" && "text-expense"
        )}
      >
        {formatCurrency(value)}
      </p>
    </Card>
  );
}

function BudgetCard({
  budget,
  onEdit,
}: {
  budget: BudgetStatus;
  onEdit: () => void;
}) {
  const deleteMut = useDeleteBudget();
  const status = STATUS_CONFIG[budget.status];
  const pct = Math.min(budget.percentage, 100);
  const isOver = budget.remaining < 0;

  function handleDelete() {
    deleteMut.mutate(budget.id, {
      onSuccess: () =>
        toast.success(`Anggaran "${budget.category.name}" dihapus.`),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus anggaran."),
    });
  }

  return (
    <Card className="group relative p-4 transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${budget.category.color}1a` }}
          >
            <LucideIcon
              name={budget.category.icon}
              className="h-5 w-5"
              style={{ color: budget.category.color }}
            />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {budget.category.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {PERIOD_LABELS[budget.period]} ·{" "}
              {formatCurrencyCompact(budget.amount)}
            </p>
          </div>
        </div>

        <Badge
          variant="secondary"
          className={cn("border-transparent", status.badgeClass)}
        >
          {status.label}
        </Badge>
      </div>

      {/* Amounts */}
      <div className="mt-3 flex items-end justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Terpakai</p>
          <p className="text-sm font-semibold tabular-nums text-expense">
            {formatCurrency(budget.spent)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Anggaran</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(budget.amount)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="mt-3 space-y-1.5">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(budget.percentage)}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: status.color,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {budget.percentage.toFixed(0)}% terpakai
          </span>
          <span
            className={cn(
              "font-medium",
              isOver ? "text-expense" : "text-muted-foreground"
            )}
          >
            {isOver
              ? `Lewat ${formatCurrencyCompact(
                  Math.abs(budget.remaining)
                )}`
              : `Sisa ${formatCurrencyCompact(budget.remaining)}`}
          </span>
        </div>
      </div>

      {/* Hover actions */}
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label="Ubah anggaran"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={deleteMut.isPending}
              aria-label="Hapus anggaran"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus anggaran ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Anggaran <strong>{budget.category.name}</strong> akan
                dihapus. Tindakan ini tidak dapat dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Wallet className="h-7 w-7 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada anggaran
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Mulai atur batas pengeluaran agar finansial lebih terkontrol.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1">
        <Plus className="h-4 w-4" />
        Buat Anggaran Pertama
      </Button>
    </Card>
  );
}

function BudgetFormDialog({
  open,
  onOpenChange,
  editBudget,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBudget: BudgetStatus | null;
}) {
  const isEdit = !!editBudget;
  const { data: categories, isLoading: catsLoading } =
    useCategories("EXPENSE");
  const { data: existingBudgets } = useBudgetStatuses();
  const createMut = useCreateBudget();
  const updateMut = useUpdateBudget();

  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [period, setPeriod] = React.useState<BudgetPeriod>("MONTHLY");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (editBudget) {
        setCategoryId(editBudget.categoryId);
        setAmount(String(editBudget.amount));
        setPeriod(editBudget.period);
      } else {
        setCategoryId("");
        setAmount("");
        setPeriod("MONTHLY");
      }
      setError(null);
    }
  }, [open, editBudget]);

  // Available categories: EXPENSE not already budgeted (excluding current edit's category)
  const availableCategories = React.useMemo(() => {
    const all = categories ?? [];
    const used = new Set(
      (existingBudgets ?? [])
        .filter((b) => b.id !== editBudget?.id)
        .map((b) => b.categoryId)
    );
    return all.filter((c) => !used.has(c.id));
  }, [categories, existingBudgets, editBudget]);

  // When editing, ensure the current category is included even if "used"
  const options = React.useMemo(() => {
    if (!isEdit) return availableCategories;
    const editCat = (categories ?? []).find(
      (c) => c.id === editBudget.categoryId
    );
    if (
      editCat &&
      !availableCategories.find((c) => c.id === editCat.id)
    ) {
      return [editCat, ...availableCategories];
    }
    return availableCategories;
  }, [isEdit, availableCategories, categories, editBudget]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Jumlah anggaran harus lebih dari 0.");
      return;
    }
    const payload: BudgetInput = {
      categoryId,
      amount: Math.round(amountNum),
      period,
    };
    if (isEdit && editBudget) {
      updateMut.mutate(
        { id: editBudget.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Anggaran diperbarui.");
            onOpenChange(false);
          },
          onError: (err) =>
            setError(err.message || "Gagal memperbarui anggaran."),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Anggaran ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menambahkan anggaran."),
      });
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">
                {isEdit ? "Ubah Anggaran" : "Anggaran Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Perbarui batas anggaran untuk kategori ini."
                  : "Tetapkan batas pengeluaran untuk satu kategori."}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 p-5">
            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="bdg-category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger
                  id="bdg-category"
                  className="w-full"
                >
                  <SelectValue
                    placeholder={
                      catsLoading
                        ? "Memuat..."
                        : "Pilih kategori pengeluaran"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {options.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Tidak ada kategori tersedia.
                    </div>
                  ) : (
                    options.map((c) => (
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

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="bdg-amount">Jumlah Anggaran (Rp)</Label>
              <Input
                id="bdg-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="cth. 1500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <Label htmlFor="bdg-period">Periode</Label>
              <Select
                value={period}
                onValueChange={(v) => setPeriod(v as BudgetPeriod)}
              >
                <SelectTrigger id="bdg-period" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Mingguan</SelectItem>
                  <SelectItem value="MONTHLY">Bulanan</SelectItem>
                  <SelectItem value="YEARLY">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
              >
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="gap-1">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Simpan Anggaran"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
