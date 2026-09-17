"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  CalendarClock,
  Info,
  Loader2,
  Pencil,
  Play,
  Plus,
  Repeat,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
  formatDate,
  formatDateInput,
  formatCurrency,
} from "@/lib/format";
import {
  useAccounts,
  useCategories,
  useCreateRecurring,
  useDeleteRecurring,
  useRecurring,
  useRunRecurring,
  useUpdateRecurring,
} from "@/lib/hooks";
import type {
  Account,
  Category,
  Frequency,
  RecurringInput,
  RecurringTransaction,
  TransactionType,
} from "@/lib/types";

const FREQUENCIES: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

const FREQUENCY_LABELS: Record<Frequency, string> = {
  DAILY: "Harian",
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const FREQUENCY_UNIT: Record<Frequency, string> = {
  DAILY: "hari",
  WEEKLY: "minggu",
  MONTHLY: "bulan",
  YEARLY: "tahun",
};

/** "Setiap hari", "Setiap 2 bulan", etc. */
function getFrequencyLabel(frequency: Frequency, interval: number): string {
  const unit = FREQUENCY_UNIT[frequency];
  if (!Number.isFinite(interval) || interval <= 1) {
    return `Setiap ${unit}`;
  }
  return `Setiap ${interval} ${unit}`;
}

export function RecurringSection() {
  const { data: recurring, isLoading } = useRecurring();
  const runMut = useRunRecurring();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringTransaction | null>(
    null
  );

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: RecurringTransaction) {
    setEditing(item);
    setFormOpen(true);
  }

  function handleRunNow() {
    runMut.mutate(undefined, {
      onSuccess: (res) => {
        const count = res?.generated ?? 0;
        if (count > 0) {
          toast.success(`${count} transaksi berulang berhasil dibuat.`);
        } else {
          toast.info("Tidak ada transaksi berulang yang perlu dijalankan saat ini.");
        }
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menjalankan transaksi berulang.");
      },
    });
  }

  const list = recurring ?? [];
  const activeCount = list.filter((r) => r.active).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Transaksi Berulang
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Otomatiskan transaksi rutin seperti gaji & tagihan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleRunNow}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={runMut.isPending || activeCount === 0}
          >
            {runMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Jalankan Sekarang</span>
            <span className="sm:hidden">Jalankan</span>
          </Button>
          <Button onClick={openAdd} size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Info className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">
            Apa itu transaksi berulang?
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            Atur sekali, dan sistem akan membuat transaksi otomatis sesuai
            jadwal (harian, mingguan, bulanan, atau tahunan). Klik{" "}
            <span className="font-medium text-foreground">Jalankan Sekarang</span>{" "}
            untuk memproses semua jadwal yang sudah jatuh tempo.
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {list.map((item) => (
              <RecurringItem
                key={item.id}
                item={item}
                onEdit={() => openEdit(item)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add / Edit dialog */}
      <RecurringFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        recurring={editing}
      />
    </div>
  );
}

// ---------- Recurring Item ----------
function RecurringItem({
  item,
  onEdit,
}: {
  item: RecurringTransaction;
  onEdit: () => void;
}) {
  const updateMut = useUpdateRecurring();
  const deleteMut = useDeleteRecurring();

  const isIncome = item.type === "INCOME";
  const cat = item.category;
  const acct = item.account;

  function handleToggleActive(checked: boolean) {
    updateMut.mutate(
      { id: item.id, data: { active: checked } as Partial<RecurringInput> },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? "Transaksi berulang diaktifkan."
              : "Transaksi berulang dinonaktifkan."
          );
        },
        onError: (err) => {
          toast.error(err.message || "Gagal mengubah status.");
        },
      }
    );
  }

  function handleDelete() {
    deleteMut.mutate(item.id, {
      onSuccess: () => {
        toast.success("Transaksi berulang dihapus.");
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menghapus.");
      },
    });
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "group relative overflow-hidden p-0 transition-shadow hover:shadow-md",
          !item.active && "opacity-70"
        )}
      >
        <div className="flex items-center gap-3 p-4">
          {/* Category icon */}
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: cat ? `${cat.color}1a` : undefined }}
          >
            <LucideIcon
              name={cat?.icon ?? "Repeat"}
              className="h-5 w-5"
              style={{ color: cat?.color }}
            />
          </span>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.description}
              </p>
              <Badge
                variant="secondary"
                className={cn(
                  "shrink-0 text-[10px] font-medium",
                  isIncome
                    ? "bg-income/10 text-income"
                    : "bg-expense/10 text-expense"
                )}
              >
                {isIncome ? "Pemasukan" : "Pengeluaran"}
              </Badge>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Repeat className="h-3 w-3" />
                {getFrequencyLabel(item.frequency, item.interval)}
              </span>
              <span className="text-border">·</span>
              <span className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" />
                {formatDate(item.nextDate)}
              </span>
              {acct && (
                <>
                  <span className="text-border">·</span>
                  <span className="flex items-center gap-1">
                    <LucideIcon
                      name={acct.icon}
                      className="h-3 w-3"
                      style={{ color: acct.color }}
                    />
                    {acct.name}
                  </span>
                </>
              )}
            </div>
            {item.note && (
              <p className="mt-1 truncate text-[11px] italic text-muted-foreground">
                {item.note}
              </p>
            )}
          </div>

          {/* Right: amount + controls */}
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                isIncome ? "text-income" : "text-expense"
              )}
            >
              {isIncome ? "+" : "−"}
              {formatCurrency(item.amount)}
            </span>
            <Switch
              checked={item.active}
              onCheckedChange={handleToggleActive}
              aria-label="Aktifkan transaksi berulang"
            />
          </div>
        </div>

        {/* Hover actions */}
        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onEdit}
            aria-label="Edit"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                disabled={deleteMut.isPending}
                aria-label="Hapus"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Hapus transaksi berulang ini?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <strong>{item.description}</strong> akan dihapus. Transaksi
                  yang sudah dibuat sebelumnya tetap ada. Tindakan ini tidak
                  dapat dibatalkan.
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
    </motion.div>
  );
}

// ---------- Empty State ----------
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Repeat className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada transaksi berulang
        </p>
        <p className="mt-0.5 max-w-xs text-xs text-muted-foreground">
          Tambahkan jadwal rutin seperti gaji bulanan, biaya langganan, atau
          cicilan agar otomatis tercatat.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="gap-1.5">
        <Plus className="h-4 w-4" />
        Tambah Sekarang
      </Button>
    </div>
  );
}

// ---------- Recurring Form Dialog (Add / Edit) ----------
function RecurringFormDialog({
  open,
  onOpenChange,
  recurring,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: RecurringTransaction | null;
}) {
  const isEdit = !!recurring;
  const createMut = useCreateRecurring();
  const updateMut = useUpdateRecurring();

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: accounts } = useAccounts();

  const [type, setType] = React.useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [accountId, setAccountId] = React.useState("NONE");
  const [frequency, setFrequency] = React.useState<Frequency>("MONTHLY");
  const [interval, setIntervalValue] = React.useState("1");
  const [startDate, setStartDate] = React.useState(
    formatDateInput(new Date())
  );
  const [endDate, setEndDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (recurring) {
      setType(recurring.type);
      setAmount(String(recurring.amount));
      setDescription(recurring.description);
      setCategoryId(recurring.categoryId);
      setAccountId(recurring.accountId ?? "NONE");
      setFrequency(recurring.frequency);
      setIntervalValue(String(recurring.interval));
      setStartDate(formatDateInput(recurring.startDate));
      setEndDate(recurring.endDate ? formatDateInput(recurring.endDate) : "");
      setNote(recurring.note ?? "");
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setAccountId("NONE");
      setFrequency("MONTHLY");
      setIntervalValue("1");
      setStartDate(formatDateInput(new Date()));
      setEndDate("");
      setNote("");
    }
    setError(null);
  }, [open, recurring]);

  const filteredCategories = React.useMemo(
    () => (categories ?? []).filter((c) => c.type === type),
    [categories, type]
  );

  // Reset category if type changes and current category doesn't match
  React.useEffect(() => {
    if (!categoryId) return;
    const cat = categories?.find((c) => c.id === categoryId);
    if (cat && cat.type !== type) {
      setCategoryId("");
    }
  }, [type, categories, categoryId]);

  // Auto-pick first category when type changes / loads
  React.useEffect(() => {
    if (catsLoading) return;
    if (!categoryId && filteredCategories.length > 0) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [catsLoading, filteredCategories, categoryId]);

  const accountList: Account[] = accounts ?? [];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Masukkan jumlah yang valid (lebih dari 0).");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan wajib diisi.");
      return;
    }
    if (!categoryId) {
      setError("Pilih kategori terlebih dahulu.");
      return;
    }
    const intInterval = parseInt(interval, 10);
    if (!Number.isFinite(intInterval) || intInterval <= 0) {
      setError("Interval harus berupa angka positif.");
      return;
    }
    if (!startDate) {
      setError("Tanggal mulai wajib diisi.");
      return;
    }
    if (endDate && endDate < startDate) {
      setError("Tanggal berakhir harus setelah tanggal mulai.");
      return;
    }

    const payload: RecurringInput = {
      type,
      amount: amt,
      description: description.trim(),
      categoryId,
      accountId: accountId === "NONE" ? undefined : accountId,
      frequency,
      interval: intInterval,
      startDate,
      endDate: endDate || undefined,
      note: note.trim() || undefined,
    };

    if (isEdit && recurring) {
      updateMut.mutate(
        { id: recurring.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Transaksi berulang diperbarui.");
            onOpenChange(false);
          },
          onError: (err) => {
            setError(err.message || "Gagal memperbarui.");
          },
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Transaksi berulang ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Gagal menambahkan.");
        },
      });
    }
  }

  const submitting = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                  type === "INCOME" ? "bg-income" : "bg-expense"
                )}
              >
                <Repeat className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base">
                  {isEdit ? "Edit Transaksi Berulang" : "Transaksi Berulang Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isEdit
                    ? "Ubah jadwal transaksi rutin Anda."
                    : "Buat jadwal transaksi otomatis."}
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

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="rc-amount">Jumlah</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="rc-amount"
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
              <Label htmlFor="rc-desc">Keterangan</Label>
              <Input
                id="rc-desc"
                placeholder={
                  type === "INCOME"
                    ? "cth. Gaji bulanan"
                    : "cth. Langganan internet"
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
                    {filteredCategories.map((c: Category) => (
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

            {/* Account (optional) */}
            <div className="space-y-1.5">
              <Label>
                Akun{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tanpa akun" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">
                    <span className="text-muted-foreground">
                      Tanpa akun tertentu
                    </span>
                  </SelectItem>
                  {accountList.map((a) => (
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
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency + interval */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Frekuensi</Label>
                <Select
                  value={frequency}
                  onValueChange={(v) => setFrequency(v as Frequency)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQUENCY_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rc-interval">Interval</Label>
                <Input
                  id="rc-interval"
                  type="number"
                  min="1"
                  step="1"
                  value={interval}
                  onChange={(e) => setIntervalValue(e.target.value)}
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] text-muted-foreground">
              {getFrequencyLabel(
                frequency,
                Number.isFinite(Number(interval)) ? Number(interval) : 1
              )}
            </p>

            {/* Start date */}
            <div className="space-y-1.5">
              <Label htmlFor="rc-start">Tanggal Mulai</Label>
              <Input
                id="rc-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* End date (optional) */}
            <div className="space-y-1.5">
              <Label htmlFor="rc-end">
                Berakhir Pada{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="rc-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
              />
              <p className="text-[11px] text-muted-foreground">
                Kosongkan agar jadwal berjalan tanpa batas.
              </p>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="rc-note">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="rc-note"
                placeholder="cth. Otomatis dari langganan"
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

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting}
              className={cn(
                "gap-1",
                type === "INCOME"
                  ? "bg-income text-white hover:bg-income/90"
                  : "bg-expense text-white hover:bg-expense/90"
              )}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
