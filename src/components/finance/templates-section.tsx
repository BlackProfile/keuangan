"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Info,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Store,
  Trash2,
  X,
  Zap,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDateInput,
} from "@/lib/format";
import {
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
  TEMPLATE_ICONS,
} from "@/lib/constants";
import {
  useAccounts,
  useCategories,
  useCreateTransaction,
  useCreateTemplate,
  useDeleteTemplate,
  useTemplates,
} from "@/lib/hooks";
import type {
  PaymentMethod,
  Priority,
  TransactionTemplate,
  TransactionTemplateInput,
  TransactionType,
} from "@/lib/types";

const PRIORITY_BADGE_CLASS: Record<Priority, string> = {
  URGENT:
    "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  NEED: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  WANT: "bg-zinc-100 text-zinc-700 dark:bg-zinc-500/15 dark:text-zinc-300",
};

const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  DEBIT: "Debit",
  CREDIT: "Kredit",
  EWALLET: "E-Wallet",
};

export function TemplatesSection() {
  const { data: templates, isLoading } = useTemplates();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editTemplate, setEditTemplate] =
    React.useState<TransactionTemplate | null>(null);

  function openCreate() {
    setEditTemplate(null);
    setDialogOpen(true);
  }

  function openEdit(t: TransactionTemplate) {
    setEditTemplate(t);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Template Transaksi
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Buat preset untuk transaksi yang sering dicatat. Gunakan dengan
            satu klik.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Tambah Template
        </Button>
      </div>

      {/* Info banner */}
      <Card className="border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Info className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Apa itu template transaksi?
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Template memungkinkan Anda menyimpan detail transaksi yang
              sering diulang (cth. &ldquo;Beli kopi&rdquo;, &ldquo;Bayar
              kos&rdquo;). Klik tombol <strong>Gunakan</strong> pada kartu untuk
              langsung membuat transaksi baru dengan tanggal hari ini.
            </p>
          </div>
        </div>
      </Card>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (templates ?? []).length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(templates ?? []).map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onEdit={() => openEdit(t)}
            />
          ))}
        </div>
      )}

      <TemplateFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editTemplate={editTemplate}
      />
    </div>
  );
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: TransactionTemplate;
  onEdit: () => void;
}) {
  const deleteMut = useDeleteTemplate();
  const createTxMut = useCreateTransaction();
  const isIncome = template.type === "INCOME";

  const category = template.category;
  const account = template.account;
  const priorityOpt =
    template.priority != null
      ? PRIORITY_OPTIONS.find((p) => p.value === template.priority)
      : null;
  const payMethodOpt = template.paymentMethod
    ? PAYMENT_METHOD_OPTIONS.find((p) => p.value === template.paymentMethod)
    : null;

  function handleUse() {
    const today = formatDateInput(new Date());
    createTxMut.mutate(
      {
        type: template.type,
        amount: template.amount,
        description: template.description,
        date: today,
        categoryId: template.categoryId,
        accountId: template.accountId ?? undefined,
        merchant: template.merchant ?? undefined,
        paymentMethod: template.paymentMethod ?? undefined,
        priority: template.priority ?? undefined,
      },
      {
        onSuccess: () => {
          toast.success(
            `Transaksi ditambahkan dari template "${template.name}".`
          );
        },
        onError: (err) =>
          toast.error(err.message || "Gagal menggunakan template."),
      }
    );
  }

  function handleDelete() {
    deleteMut.mutate(template.id, {
      onSuccess: () =>
        toast.success(`Template "${template.name}" dihapus.`),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus template."),
    });
  }

  return (
    <Card className="group relative flex flex-col p-4 transition-shadow hover:shadow-md">
      {/* Hover edit/delete */}
      <div className="absolute right-3 top-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Aksi template"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onSelect={(e) => e.preventDefault()}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus template ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Template <strong>{template.name}</strong> akan dihapus.
                    Tindakan ini tidak dapat dibatalkan.
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
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Header: icon + name + type badge */}
      <div className="flex items-start gap-3 pr-12">
        <span
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            isIncome
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
          )}
        >
          <LucideIcon name={template.icon || "Zap"} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {template.name}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-1">
            <Badge
              variant="secondary"
              className={cn(
                "border-transparent",
                isIncome
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
              )}
            >
              {isIncome ? "Pemasukan" : "Pengeluaran"}
            </Badge>
            {priorityOpt && (
              <Badge
                variant="secondary"
                className={cn(
                  "border-transparent",
                  PRIORITY_BADGE_CLASS[template.priority as Priority]
                )}
              >
                {priorityOpt.label}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Amount */}
      <div className="mt-3">
        <p className="text-[11px] text-muted-foreground">Jumlah</p>
        <p
          className={cn(
            "text-lg font-bold tabular-nums",
            isIncome
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {formatCurrency(template.amount)}
        </p>
      </div>

      {/* Description */}
      {template.description && (
        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
          {template.description}
        </p>
      )}

      {/* Meta: category, account, merchant, payment */}
      <div className="mt-3 space-y-1.5 border-t border-border pt-3 text-xs">
        {category && (
          <MetaRow
            icon={
              <LucideIcon
                name={category.icon}
                className="h-3.5 w-3.5"
                style={{ color: category.color }}
              />
            }
            label="Kategori"
            value={category.name}
          />
        )}
        {account && (
          <MetaRow
            icon={
              <LucideIcon
                name={account.icon}
                className="h-3.5 w-3.5"
                style={{ color: account.color }}
              />
            }
            label="Akun"
            value={account.name}
          />
        )}
        {template.merchant && (
          <MetaRow
            icon={<Store className="h-3.5 w-3.5 text-muted-foreground" />}
            label="Merchant"
            value={template.merchant}
          />
        )}
        {payMethodOpt && (
          <MetaRow
            icon={
              <LucideIcon
                name={payMethodOpt.icon}
                className="h-3.5 w-3.5 text-muted-foreground"
              />
            }
            label="Metode"
            value={PAYMENT_METHOD_LABEL[template.paymentMethod as PaymentMethod]}
          />
        )}
      </div>

      {/* Action button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-4 w-full gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        onClick={handleUse}
        disabled={createTxMut.isPending}
      >
        {createTxMut.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className="h-3.5 w-3.5" />
        )}
        Gunakan
      </Button>
    </Card>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <Sparkles className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada template transaksi
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Buat preset untuk transaksi yang sering dicatat agar lebih cepat.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1">
        <Plus className="h-4 w-4" />
        Buat Template Pertama
      </Button>
    </Card>
  );
}

function TemplateFormDialog({
  open,
  onOpenChange,
  editTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editTemplate: TransactionTemplate | null;
}) {
  const isEdit = !!editTemplate;
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const createMut = useCreateTemplate();
  const deleteMut = useDeleteTemplate();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | "">(
    ""
  );
  const [priority, setPriority] = React.useState<Priority | "">("");
  const [icon, setIcon] = React.useState<string>("Zap");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (editTemplate) {
        setName(editTemplate.name);
        setType(editTemplate.type);
        setAmount(String(editTemplate.amount));
        setDescription(editTemplate.description);
        setCategoryId(editTemplate.categoryId);
        setAccountId(editTemplate.accountId ?? "");
        setMerchant(editTemplate.merchant ?? "");
        setPaymentMethod(editTemplate.paymentMethod ?? "");
        setPriority(editTemplate.priority ?? "");
        setIcon(editTemplate.icon || "Zap");
      } else {
        setName("");
        setType("EXPENSE");
        setAmount("");
        setDescription("");
        setCategoryId("");
        setAccountId("");
        setMerchant("");
        setPaymentMethod("");
        setPriority("");
        setIcon("Zap");
      }
      setError(null);
    }
  }, [open, editTemplate]);

  // Filter categories by current type
  const filteredCategories = React.useMemo(() => {
    return (categories ?? []).filter((c) => c.type === type);
  }, [categories, type]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama template wajib diisi.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      setError("Jumlah harus berupa angka tidak negatif.");
      return;
    }
    if (!description.trim()) {
      setError("Keterangan wajib diisi.");
      return;
    }
    if (!categoryId) {
      setError("Kategori wajib dipilih.");
      return;
    }

    const payload: TransactionTemplateInput = {
      name: name.trim(),
      type,
      amount: Math.round(amt),
      description: description.trim(),
      categoryId,
      accountId: accountId || undefined,
      merchant: merchant.trim() || undefined,
      paymentMethod: paymentMethod || undefined,
      priority: priority || undefined,
      icon,
    };

    if (isEdit && editTemplate) {
      // No PUT endpoint — delete + recreate
      deleteMut.mutate(editTemplate.id, {
        onSuccess: () => {
          createMut.mutate(payload, {
            onSuccess: () => {
              toast.success("Template diperbarui.");
              onOpenChange(false);
            },
            onError: (err) =>
              setError(err.message || "Gagal memperbarui template."),
          });
        },
        onError: (err) =>
          setError(err.message || "Gagal memperbarui template."),
      });
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(`Template "${name.trim()}" ditambahkan.`);
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menambah template."),
      });
    }
  }

  const pending =
    createMut.isPending || deleteMut.isPending;

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
                {isEdit ? "Ubah Template" : "Template Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Perbarui preset transaksi Anda."
                  : "Buat preset transaksi untuk pencatatan cepat."}
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
          <div className="max-h-[65vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
              <button
                type="button"
                onClick={() => {
                  setType("INCOME");
                  setCategoryId("");
                }}
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
                onClick={() => {
                  setType("EXPENSE");
                  setCategoryId("");
                }}
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
              <Label htmlFor="tpl-name">Nama Template</Label>
              <Input
                id="tpl-name"
                placeholder="cth. Beli kopi, Bayar kos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                autoFocus
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 custom-scrollbar sm:grid-cols-11">
                {TEMPLATE_ICONS.map((ic) => (
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

            {/* Amount + Description */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-amount">Jumlah (Rp)</Label>
              <Input
                id="tpl-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="cth. 15000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-desc">Keterangan</Label>
              <Textarea
                id="tpl-desc"
                placeholder="cth. Beli kopi di Starbucks pagi hari"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={150}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-category">Kategori</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger id="tpl-category" className="w-full">
                  <SelectValue
                    placeholder={
                      catsLoading
                        ? "Memuat..."
                        : "Pilih kategori"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      Tidak ada kategori untuk tipe ini.
                    </div>
                  ) : (
                    filteredCategories.map((c) => (
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

            {/* Account */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-account">Akun (opsional)</Label>
              <Select
                value={accountId}
                onValueChange={(v) => setAccountId(v === "none" ? "" : v)}
              >
                <SelectTrigger id="tpl-account" className="w-full">
                  <SelectValue
                    placeholder={
                      accountsLoading
                        ? "Memuat..."
                        : "Pilih akun"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">
                      Tidak ada akun
                    </span>
                  </SelectItem>
                  {(accounts ?? []).map((a) => (
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

            {/* Merchant */}
            <div className="space-y-1.5">
              <Label htmlFor="tpl-merchant">Merchant (opsional)</Label>
              <Input
                id="tpl-merchant"
                placeholder="cth. Starbucks, Indomaret"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                maxLength={60}
              />
            </div>

            {/* Payment method + priority */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-pay">Metode (opsional)</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) =>
                    setPaymentMethod(v as PaymentMethod | "")
                  }
                >
                  <SelectTrigger id="tpl-pay" className="w-full">
                    <SelectValue placeholder="Pilih metode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <LucideIcon
                            name={p.icon}
                            className="h-4 w-4"
                          />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-prio">Prioritas (opsional)</Label>
                <Select
                  value={priority}
                  onValueChange={(v) =>
                    setPriority(v as Priority | "")
                  }
                >
                  <SelectTrigger id="tpl-prio" className="w-full">
                    <SelectValue placeholder="Pilih prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label>Pratinjau</Label>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    type === "INCOME"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                  )}
                >
                  <LucideIcon name={icon} className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {name || "Nama template"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {amount && Number(amount) > 0
                      ? formatCurrency(Number(amount))
                      : "—"}
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
              {isEdit ? "Simpan Perubahan" : "Simpan Template"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
