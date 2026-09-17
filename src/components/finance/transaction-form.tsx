"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
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
import { Textarea } from "@/components/ui/textarea";
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
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatDateInput } from "@/lib/format";
import {
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
}: Props) {
  const isEdit = !!transaction;

  const [type, setType] = React.useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [date, setDate] = React.useState(formatDateInput(new Date()));
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const createMut = useCreateTransaction();
  const updateMut = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();

  // Sync form state when opening / when transaction changes
  React.useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setDate(formatDateInput(transaction.date));
      setNote(transaction.note ?? "");
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(formatDateInput(new Date()));
      setNote("");
    }
    setError(null);
  }, [open, transaction]);

  // Filter categories by selected type and reset category if type changes
  const filteredCategories = React.useMemo(
    () => (categories ?? []).filter((c) => c.type === type),
    [categories, type]
  );

  React.useEffect(() => {
    if (categoryId) {
      const cat = categories?.find((c) => c.id === categoryId);
      if (cat && cat.type !== type) {
        setCategoryId("");
      }
    }
  }, [type, categories, categoryId]);

  const submitting =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Masukkan jumlah yang valid (lebih dari 0).");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan transaksi wajib diisi.");
      return;
    }
    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    if (!date) {
      setError("Tanggal wajib diisi.");
      return;
    }

    const payload = {
      type,
      amount: amt,
      description: description.trim(),
      categoryId,
      date,
      note: note.trim() || undefined,
    };

    if (isEdit && transaction) {
      updateMut.mutate(
        { id: transaction.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Transaksi berhasil diperbarui.");
            onOpenChange(false);
          },
          onError: (err) => {
            setError(err.message || "Gagal memperbarui transaksi.");
          },
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Transaksi berhasil ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Gagal menambah transaksi.");
        },
      });
    }
  }

  function handleDelete() {
    if (!transaction) return;
    deleteMut.mutate(transaction.id, {
      onSuccess: () => {
        toast.success("Transaksi berhasil dihapus.");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menghapus transaksi.");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-0 border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                  type === "INCOME" ? "bg-income" : "bg-expense"
                )}
              >
                {type === "INCOME" ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </span>
              <div>
                <DialogTitle className="text-base">
                  {isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isEdit
                    ? "Ubah detail transaksi Anda."
                    : "Catat pemasukan atau pengeluaran baru."}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[70vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setType("INCOME")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  type === "INCOME"
                    ? "bg-income text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowDownLeft className="h-4 w-4" />
                Pemasukan
              </button>
              <button
                type="button"
                onClick={() => setType("EXPENSE")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  type === "EXPENSE"
                    ? "bg-expense text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <ArrowUpRight className="h-4 w-4" />
                Pengeluaran
              </button>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">Jumlah</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="amount"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 text-lg font-semibold"
                  autoFocus
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Keterangan</Label>
              <Input
                id="description"
                placeholder={
                  type === "INCOME"
                    ? "cth. Gaji bulan ini"
                    : "cth. Makan siang"
                }
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={80}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label>Kategori</Label>
              {catsLoading ? (
                <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
              ) : filteredCategories.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                  Belum ada kategori untuk tipe ini. Tambahkan di tab Kategori.
                </div>
              ) : (
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {filteredCategories.map((c) => (
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
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Tanggal</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={formatDateInput(new Date())}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="note">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="note"
                placeholder="Tambah catatan..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="flex-row items-center gap-2 border-t border-border bg-muted/30 p-4 sm:justify-between">
            <div>
              {isEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={submitting}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Hapus transaksi ini?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Transaksi akan
                        dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Ya, Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={submitting}
                className={
                  type === "INCOME"
                    ? "bg-income text-white hover:bg-income/90"
                    : "bg-expense text-white hover:bg-expense/90"
                }
              >
                {submitting && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
