"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
} from "@/lib/hooks";
import type { Category, TransactionType } from "@/lib/types";

export function CategoryManager() {
  const { data: categories, isLoading } = useCategories();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [defaultType, setDefaultType] = React.useState<TransactionType>("EXPENSE");

  const incomeCats = (categories ?? []).filter((c) => c.type === "INCOME");
  const expenseCats = (categories ?? []).filter((c) => c.type === "EXPENSE");

  function openNew(type: TransactionType) {
    setDefaultType(type);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CategoryGroup
          title="Kategori Pemasukan"
          description="Sumber pemasukan Anda"
          type="INCOME"
          categories={incomeCats}
          loading={isLoading}
          onAdd={() => openNew("INCOME")}
        />
        <CategoryGroup
          title="Kategori Pengeluaran"
          description="Jenis pengeluaran Anda"
          type="EXPENSE"
          categories={expenseCats}
          loading={isLoading}
          onAdd={() => openNew("EXPENSE")}
        />
      </div>

      <CategoryFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        defaultType={defaultType}
      />
    </div>
  );
}

function CategoryGroup({
  title,
  description,
  type,
  categories,
  loading,
  onAdd,
}: {
  title: string;
  description: string;
  type: TransactionType;
  categories: Category[];
  loading?: boolean;
  onAdd: () => void;
}) {
  const isIncome = type === "INCOME";
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isIncome ? "bg-income" : "bg-expense"
              )}
            />
            {title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={onAdd}
          className="gap-1"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((c) => (
            <CategoryCard key={c.id} category={c} />
          ))}
        </div>
      )}
    </Card>
  );
}

function CategoryCard({ category }: { category: Category }) {
  const deleteMut = useDeleteCategory();

  function handleDelete() {
    deleteMut.mutate(category.id, {
      onSuccess: () => {
        toast.success(`Kategori "${category.name}" dihapus.`);
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menghapus kategori.");
      },
    });
  }

  return (
    <div className="group relative flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/40">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="absolute right-1.5 top-1.5 rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
            aria-label={`Hapus kategori ${category.name}`}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori <strong>{category.name}</strong> akan dihapus. Tindakan
              ini tidak dapat dibatalkan. Jika masih ada transaksi terkait,
              penghapusan akan ditolak.
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

      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${category.color}1a` }}
      >
        <LucideIcon
          name={category.icon}
          className="h-6 w-6"
          style={{ color: category.color }}
        />
      </span>
      <span className="line-clamp-2 text-center text-xs font-medium text-foreground">
        {category.name}
      </span>
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType: TransactionType;
}) {
  const [type, setType] = React.useState<TransactionType>(defaultType);
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("Wallet");
  const [color, setColor] = React.useState(CATEGORY_COLORS[0]);
  const [error, setError] = React.useState<string | null>(null);

  const createMut = useCreateCategory();

  React.useEffect(() => {
    if (open) {
      setType(defaultType);
      setName("");
      setIcon(defaultType === "INCOME" ? "Wallet" : "UtensilsCrossed");
      setColor(
        defaultType === "INCOME" ? CATEGORY_COLORS[0] : CATEGORY_COLORS[8]
      );
      setError(null);
    }
  }, [open, defaultType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Nama kategori wajib diisi.");
      return;
    }
    createMut.mutate(
      {
        name: name.trim(),
        type,
        icon,
        color,
      },
      {
        onSuccess: () => {
          toast.success(`Kategori "${name.trim()}" ditambahkan.`);
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Gagal menambah kategori.");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">Kategori Baru</DialogTitle>
              <DialogDescription className="text-xs">
                Tambah kategori untuk pemasukan atau pengeluaran.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[65vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* Type */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  type === "INCOME"
                    ? "bg-income text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  type === "EXPENSE"
                    ? "bg-expense text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Pengeluaran
              </button>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Nama Kategori</Label>
              <Input
                id="cat-name"
                placeholder="cth. Makanan, Transportasi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                autoFocus
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 custom-scrollbar sm:grid-cols-10">
                {CATEGORY_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      icon === ic
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-label={ic}
                  >
                    <LucideIcon name={ic} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_COLORS.map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    onClick={() => setColor(cl)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-transform",
                      color === cl && "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: cl }}
                    aria-label={`Warna ${cl}`}
                  >
                    {color === cl && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label>Pratinjau</Label>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${color}1a` }}
                >
                  <LucideIcon
                    name={icon}
                    className="h-6 w-6"
                    style={{ color }}
                  />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {name || "Nama kategori"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={createMut.isPending}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={createMut.isPending}
              className="gap-1"
            >
              {createMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Simpan Kategori
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
