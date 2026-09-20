"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Coffee,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateInput } from "@/lib/format";
import { JAJAN_PRESETS } from "@/lib/student-constants";
import {
  useCategories,
  useCreateTransaction,
  useJajanCheck,
} from "@/lib/hooks";
import type { Category, TransactionInput } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Resolve a category id by name (case-insensitive), with a "Makanan" fallback. */
function resolveCategoryId(
  categories: Category[] | undefined,
  name: string
): string | undefined {
  if (!categories || categories.length === 0) return undefined;
  const target = name.trim().toLowerCase();
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const exact = expense.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact.id;
  const partial = expense.find((c) => c.name.toLowerCase().includes(target));
  if (partial) return partial.id;
  const makanan = expense.find((c) => c.name.toLowerCase() === "makanan");
  return makanan?.id;
}

function todayInput(): string {
  return formatDateInput(new Date());
}

function nowTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export interface JajanPreset {
  label: string;
  amount: number;
  icon: string;
  category: string;
}

/* ------------------------------------------------------------------ */
/*  Main floating button                                                */
/* ------------------------------------------------------------------ */

export function JajanButton() {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Jajan cepat"
        className={cn(
          "fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full",
          "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
          "transition-transform hover:scale-105 active:scale-95",
          "sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
        )}
      >
        <Coffee className="h-5 w-5 sm:h-6 sm:w-6" />
        <span className="sr-only">Jajan cepat</span>
      </button>

      <JajanSheet open={open} onOpenChange={setOpen} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet content                                                       */
/* ------------------------------------------------------------------ */

function JajanSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: categories } = useCategories("EXPENSE");
  const createMut = useCreateTransaction();

  const handlePreset = React.useCallback(
    (preset: JajanPreset) => {
      const categoryId = resolveCategoryId(categories, preset.category);
      if (!categoryId) {
        toast.error(
          `Kategori "${preset.category}" belum ada. Tambah dulu di tab Kategori.`
        );
        return;
      }
      const payload: TransactionInput = {
        type: "EXPENSE",
        amount: preset.amount,
        description: preset.label,
        date: todayInput(),
        categoryId,
        time: nowTime(),
      };
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(
            `Jajan ${preset.label} ${formatCurrency(preset.amount)} tercatat!`
          );
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err.message || "Gagal mencatat jajan."),
      });
    },
    [categories, createMut, onOpenChange]
  );

  const pending = createMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md rounded-t-2xl p-0 sm:rounded-t-2xl"
      >
        <SheetHeader className="border-b border-border bg-muted/30 p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Coffee className="h-5 w-5" />
              </span>
              <div>
                <SheetTitle className="text-base">Jajan Cepat</SheetTitle>
                <SheetDescription className="text-xs">
                  Satu ketuk, langsung tercatat sebagai pengeluaran.
                </SheetDescription>
              </div>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {/* Preset grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {JAJAN_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={pending}
                onClick={() => handlePreset(p)}
                className={cn(
                  "group flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all",
                  "hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm",
                  "dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:group-hover:bg-emerald-500/15 dark:group-hover:text-emerald-400">
                  <LucideIcon name={p.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {p.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(p.amount)}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>atau catat manual</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Custom input */}
          <CustomJajanForm
            categories={categories ?? []}
            pending={pending}
            onSubmitted={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom jajan form (inline within the sheet)                        */
/* ------------------------------------------------------------------ */

function CustomJajanForm({
  categories,
  pending,
  onSubmitted,
}: {
  categories: Category[];
  pending: boolean;
  onSubmitted: () => void;
}) {
  const createMut = useCreateTransaction();
  const jajanCheck = useJajanCheck();

  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");

  const amountNum = Number(amount);
  const canAfford = jajanCheck.data?.canAfford;

  // Trigger AI verdict when amount changes (debounced via react-query)
  React.useEffect(() => {
    if (Number.isFinite(amountNum) && amountNum > 0 && !jajanCheck.isPending) {
      const t = setTimeout(() => {
        jajanCheck.mutate(amountNum);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [amount, amountNum, jajanCheck]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah yang valid.");
      return;
    }
    const desc = description.trim() || "Jajan";
    const categoryId = resolveCategoryId(categories, "Makanan");
    if (!categoryId) {
      toast.error("Kategori Makanan belum ada. Tambah dulu di tab Kategori.");
      return;
    }
    const payload: TransactionInput = {
      type: "EXPENSE",
      amount: Math.round(amountNum),
      description: desc,
      date: todayInput(),
      categoryId,
      time: nowTime(),
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(`Jajan ${desc} ${formatCurrency(amountNum)} tercatat!`);
        setAmount("");
        setDescription("");
        onSubmitted();
      },
      onError: (err) =>
        toast.error(err.message || "Gagal mencatat jajan."),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="jb-amount">Jumlah (Rp)</Label>
        <Input
          id="jb-amount"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          placeholder="cth. 8500"
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

      <div className="space-y-1.5">
        <Label htmlFor="jb-desc">Keterangan</Label>
        <Input
          id="jb-desc"
          placeholder="cth. Cireng tukang sebelah"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={80}
        />
      </div>

      {/* AI Jajan Check verdict */}
      {amount && Number(amount) > 0 && jajanCheck.data && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            canAfford
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          )}
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{jajanCheck.data.reply}</span>
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Catat Jajan
      </Button>
    </form>
  );
}
