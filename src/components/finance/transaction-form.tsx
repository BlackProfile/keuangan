"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Plus,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { formatCurrency, formatDateInput } from "@/lib/format";
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useDeleteTransaction,
  useUpdateTransaction,
} from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";
import {
  ReceiptScanner,
  type ScannedReceiptData,
} from "@/components/finance/receipt-scanner";

/** Quick amount presets (Rp). */
const QUICK_AMOUNTS = [5000, 10000, 20000, 50000];

export interface PrefillData {
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  merchant?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  prefill?: PrefillData | null;
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  prefill,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[95dvh] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <TransactionFormInner
          open={open}
          onOpenChange={onOpenChange}
          transaction={transaction}
          prefill={prefill}
        />
      </DialogContent>
    </Dialog>
  );
}

function TransactionFormInner({
  open,
  onOpenChange,
  transaction,
  prefill,
}: Props) {
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  const createMut = useCreateTransaction();
  const updateMut = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();

  const isEdit = !!transaction;

  const [type, setType] = React.useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [date, setDate] = React.useState<string>(formatDateInput(new Date()));
  const [accountId, setAccountId] = React.useState<string>("");
  const [note, setNote] = React.useState<string>("");
  const [merchant, setMerchant] = React.useState<string>("");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);

  const [scanOpen, setScanOpen] = React.useState(false);

  // Sync form state when dialog opens, transaction changes, or prefill changes.
  React.useEffect(() => {
    if (!open) return;
    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount ?? ""));
      setDescription(transaction.description ?? "");
      setCategoryId(transaction.categoryId ?? "");
      setDate(formatDateInput(transaction.date));
      setAccountId(transaction.accountId ?? "");
      setNote(transaction.note ?? "");
      setMerchant(transaction.merchant ?? "");
      setPhotoUrl(transaction.photoUrl ?? null);
    } else if (prefill) {
      setType(prefill.type ?? "EXPENSE");
      setAmount(prefill.amount ? String(prefill.amount) : "");
      setDescription(prefill.description ?? "");
      setCategoryId(prefill.categoryId ?? "");
      setDate(prefill.date ?? formatDateInput(new Date()));
      setAccountId("");
      setNote("");
      setMerchant(prefill.merchant ?? "");
      setPhotoUrl(null);
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setDate(formatDateInput(new Date()));
      setAccountId("");
      setNote("");
      setMerchant("");
      setPhotoUrl(null);
    }
  }, [open, transaction, prefill]);

  // Filter categories by current type
  const filteredCategories = React.useMemo(() => {
    if (!categories) return [];
    return categories.filter((c) => c.type === type);
  }, [categories, type]);

  // Default to first category of current type when none selected
  React.useEffect(() => {
    if (!categoryId && filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    } else if (
      categoryId &&
      filteredCategories.length > 0 &&
      !filteredCategories.some((c) => c.id === categoryId)
    ) {
      // current selection not in filtered list (type changed) — pick first
      setCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, categoryId]);

  const amountNum = Number(amount);
  const isValid =
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    description.trim().length > 0 &&
    categoryId.length > 0;

  function handleQuickAdd(value: number) {
    setAmount((prev) => {
      const cur = Number(prev) || 0;
      return String(cur + value);
    });
  }

  function handleScan(data: ScannedReceiptData) {
    setType("EXPENSE");
    if (typeof data.total === "number" && data.total > 0) {
      setAmount(String(Math.round(data.total)));
    }
    if (data.merchant) {
      setMerchant(data.merchant);
      if (!description.trim()) setDescription(data.merchant);
    }
    if (data.date) {
      try {
        setDate(formatDateInput(data.date));
      } catch {
        // ignore parse errors
      }
    }
    if (data.categoryId) setCategoryId(data.categoryId);
    if (data.photoUrl) setPhotoUrl(data.photoUrl);
    toast.success("Data struk diterapkan ke form.");
  }

  function handleSubmit() {
    if (!isValid) {
      toast.error("Lengkapi jumlah, keterangan, dan kategori dulu.");
      return;
    }
    const payload = {
      type,
      amount: Math.round(amountNum),
      description: description.trim(),
      date,
      categoryId,
      accountId: accountId || undefined,
      note: note.trim() || undefined,
      merchant: merchant.trim() || undefined,
      photoUrl: photoUrl || undefined,
    };
    if (isEdit && transaction) {
      updateMut.mutate(
        { id: transaction.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Transaksi diperbarui.");
            onOpenChange(false);
          },
          onError: (err) => toast.error(err.message || "Gagal memperbarui."),
        },
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Transaksi ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message || "Gagal menambah."),
      });
    }
  }

  function handleDelete() {
    if (!transaction) return;
    deleteMut.mutate(transaction.id, {
      onSuccess: () => {
        toast.success("Transaksi dihapus.");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err.message || "Gagal menghapus."),
    });
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <>
      <DialogHeader className="shrink-0 border-b border-border bg-muted/30 p-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <DialogTitle className="text-base">
              {isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {isEdit
                ? "Perbarui detail transaksi Anda."
                : "Catat pemasukan atau pengeluaran dengan cepat."}
            </DialogDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => onOpenChange(false)}
            aria-label="Tutup"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </DialogHeader>

      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        {/* Scrollable content area */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto custom-scrollbar p-4">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <TypeButton
              active={type === "EXPENSE"}
              onClick={() => setType("EXPENSE")}
              icon={<ArrowUpRight className="h-4 w-4" />}
              label="Pengeluaran"
              activeClass="bg-rose-500 text-white"
            />
            <TypeButton
              active={type === "INCOME"}
              onClick={() => setType("INCOME")}
              icon={<ArrowDownLeft className="h-4 w-4" />}
              label="Pemasukan"
              activeClass="bg-emerald-600 text-white"
            />
          </div>

          {/* Amount + quick presets */}
          <div className="space-y-2">
            <Label htmlFor="tx-amount">Jumlah</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                Rp
              </span>
              <Input
                id="tx-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-9 text-lg font-semibold tabular-nums"
                autoFocus
              />
            </div>
            {amount && Number(amount) > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(Number(amount))}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {QUICK_AMOUNTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleQuickAdd(v)}
                  className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  +{v >= 1000 ? `${v / 1000}rb` : v}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="tx-desc">Keterangan</Label>
            <Input
              id="tx-desc"
              placeholder="cth. Makan siang di warteg"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Category + Date side-by-side */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <Label htmlFor="tx-cat">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="tx-cat" className="w-full">
                  <SelectValue placeholder="Pilih" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={c.icon}
                          className="h-3.5 w-3.5"
                          style={{ color: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tx-date">Tanggal</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Account (optional) */}
          <div className="space-y-2">
            <Label htmlFor="tx-acc">Akun (opsional)</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="tx-acc" className="w-full">
                <SelectValue placeholder="Tanpa akun" />
              </SelectTrigger>
              <SelectContent>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <LucideIcon
                        name={a.icon}
                        className="h-3.5 w-3.5"
                        style={{ color: a.color }}
                      />
                      {a.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scan struk */}
          <div className="space-y-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setScanOpen(true)}
            >
              <ScanLine className="h-4 w-4" />
              Pindai Struk
            </Button>
            {photoUrl && (
              <div className="relative overflow-hidden rounded-lg border border-border">
                <img
                  src={photoUrl}
                  alt="Struk"
                  className="max-h-32 w-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setPhotoUrl(null)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-background/80 p-1 backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Hapus foto struk"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Note (optional) */}
          <div className="space-y-2">
            <Label htmlFor="tx-note">Catatan (opsional)</Label>
            <Textarea
              id="tx-note"
              placeholder="Tambahan catatan untuk transaksi ini..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>
        </div>

        {/* Sticky footer */}
        <div className="shrink-0 border-t border-border bg-background p-3">
          <div className="flex gap-2">
            {isEdit ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    aria-label="Hapus transaksi"
                    disabled={deleteMut.isPending}
                  >
                    {deleteMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini tidak bisa dibatalkan. Transaksi akan
                      dihapus permanen.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Batal</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Hapus
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Batal
            </Button>
            <Button
              type="submit"
              className="flex-1 gap-1.5"
              disabled={pending || !isValid}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isEdit ? "Simpan" : "Tambah"}
            </Button>
          </div>
        </div>
      </form>

      {/* Receipt scanner dialog */}
      <ReceiptScanner
        open={scanOpen}
        onOpenChange={setScanOpen}
        onScan={handleScan}
      />
    </>
  );
}

function TypeButton({
  active,
  onClick,
  icon,
  label,
  activeClass,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors",
        active
          ? cn("border-transparent shadow-sm", activeClass)
          : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
      aria-pressed={active}
    >
      {icon}
      {label}
    </button>
  );
}
