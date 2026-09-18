"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Inbox,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Wallet,
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
  ACCOUNT_COLORS,
  ACCOUNT_TYPE_ICONS,
} from "@/lib/constants";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateInput,
  formatDateLong,
  relativeDay,
} from "@/lib/format";
import {
  useAccounts,
  useCreateAccount,
  useDeleteAccount,
  useTransactions,
  useTransfer,
  useUpdateAccount,
} from "@/lib/hooks";
import type {
  Account,
  AccountInput,
  AccountType,
  TransferInput,
} from "@/lib/types";

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CASH: "Tunai",
  BANK: "Bank",
  EWALLET: "E-Wallet",
  INVESTMENT: "Investasi",
};

const ACCOUNT_TYPES: AccountType[] = [
  "CASH",
  "BANK",
  "EWALLET",
  "INVESTMENT",
];

export function AccountsSection() {
  const { data: accounts, isLoading } = useAccounts();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<Account | null>(
    null
  );
  const [transferOpen, setTransferOpen] = React.useState(false);

  const totalBalance = (accounts ?? []).reduce(
    (sum, a) => sum + (a.balance ?? 0),
    0
  );

  function openAdd() {
    setEditingAccount(null);
    setFormOpen(true);
  }
  function openEdit(a: Account) {
    setEditingAccount(a);
    setFormOpen(true);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Akun
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola dompet, bank, dan e-wallet Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setTransferOpen(true)}
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={(accounts ?? []).length < 2}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden sm:inline">Transfer</span>
          </Button>
          <Button onClick={openAdd} size="sm" className="gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tambah Akun</span>
            <span className="sm:hidden">Tambah</span>
          </Button>
        </div>
      </div>

      {/* Summary hero — total balance across all accounts */}
      {isLoading ? (
        <Skeleton className="h-32 rounded-2xl" />
      ) : (
        <Card
          className={cn(
            "relative overflow-hidden border-0 p-5 text-white shadow-lg ring-inner-glow sm:p-6",
            "gradient-balance"
          )}
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-white/85">
                    Total Saldo
                  </p>
                  <p className="text-[11px] text-white/60">
                    {(accounts ?? []).length} akun aktif
                  </p>
                </div>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                {formatCurrency(totalBalance)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                onClick={() => setTransferOpen(true)}
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-white/15 text-white backdrop-blur hover:bg-white/25"
                disabled={(accounts ?? []).length < 2}
              >
                <ArrowLeftRight className="h-4 w-4" />
                Transfer Antar Akun
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Account grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : (accounts ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Belum ada akun
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tambahkan akun pertama Anda untuk mulai melacak saldo.
            </p>
          </div>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Tambah Akun
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(accounts ?? []).map((a) => (
            <AccountCard key={a.id} account={a} onEdit={() => openEdit(a)} />
          ))}
        </div>
      )}

      {/* Account form dialog (add/edit) */}
      <AccountFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        account={editingAccount}
      />

      {/* Transfer dialog */}
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </div>
  );
}

// ---------- Account Card ----------
function AccountCard({
  account,
  onEdit,
}: {
  account: Account;
  onEdit: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const deleteMut = useDeleteAccount();

  function handleDelete() {
    deleteMut.mutate(account.id, {
      onSuccess: () => {
        toast.success(`Akun "${account.name}" dihapus.`);
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menghapus akun.");
      },
    });
  }

  return (
    <div className="space-y-2">
      <Card
        className={cn(
          "group relative overflow-hidden p-0 transition-shadow hover:shadow-md",
          expanded && "ring-1 ring-primary/30"
        )}
      >
        {/* Top: clickable area */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block w-full p-4 text-left"
          aria-expanded={expanded}
          aria-label={`Lihat transaksi ${account.name}`}
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${account.color}1a` }}
            >
              <LucideIcon
                name={account.icon}
                className="h-5 w-5"
                style={{ color: account.color }}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-foreground">
                  {account.name}
                </p>
                {account.isDefault && (
                  <Badge
                    variant="secondary"
                    className="shrink-0 bg-primary/10 text-[10px] font-medium text-primary"
                  >
                    Utama
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </p>
              <p className="mt-2 text-lg font-bold tabular-nums text-foreground">
                {formatCurrency(account.balance)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                expanded && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Hover actions: edit & delete */}
        <div className="absolute right-2 top-2 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={onEdit}
            aria-label="Edit akun"
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
                aria-label="Hapus akun"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus akun ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Akun <strong>{account.name}</strong> akan dihapus. Jika masih
                  ada transaksi terkait, penghapusan akan ditolak.
                  {account.isDefault && (
                    <span className="mt-2 block text-destructive">
                      Akun default tidak dapat dihapus. Ubah default ke akun
                      lain terlebih dahulu.
                    </span>
                  )}
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

      {/* Expanded: recent transactions for this account */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <AccountRecentTransactions accountId={account.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AccountRecentTransactions({ accountId }: { accountId: string }) {
  const { data: transactions, isLoading } = useTransactions({
    accountId,
    limit: 5,
  });

  const list = transactions ?? [];

  return (
    <Card className="divide-y divide-border overflow-hidden p-0">
      <div className="flex items-center justify-between bg-muted/40 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Transaksi Terbaru
        </span>
        <span className="text-[10px] text-muted-foreground">
          5 terakhir
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
          Belum ada transaksi pada akun ini.
        </div>
      ) : (
        list.map((t) => {
          const isIncome = t.type === "INCOME";
          return (
            <div
              key={t.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: t.category
                    ? `${t.category.color}1a`
                    : undefined,
                }}
              >
                <LucideIcon
                  name={t.category?.icon ?? "Circle"}
                  className="h-4 w-4"
                  style={{ color: t.category?.color }}
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  {t.description}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {relativeDay(t.date)}
                </p>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums",
                  isIncome ? "text-income" : "text-expense"
                )}
              >
                {isIncome ? "+" : "−"}
                {formatCurrencyCompact(t.amount)}
              </span>
            </div>
          );
        })
      )}
    </Card>
  );
}

// ---------- Account Form Dialog (Add / Edit) ----------
function AccountFormDialog({
  open,
  onOpenChange,
  account,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: Account | null;
}) {
  const isEdit = !!account;
  const createMut = useCreateAccount();
  const updateMut = useUpdateAccount();

  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<AccountType>("CASH");
  const [icon, setIcon] = React.useState("Banknote");
  const [color, setColor] = React.useState(ACCOUNT_COLORS[0]);
  const [balance, setBalance] = React.useState("");
  const [isDefault, setIsDefault] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (account) {
      setName(account.name);
      setType(account.type);
      setIcon(account.icon);
      setColor(account.color);
      setBalance(String(account.balance ?? 0));
      setIsDefault(account.isDefault);
      setNote(account.note ?? "");
    } else {
      setName("");
      setType("CASH");
      setIcon(ACCOUNT_TYPE_ICONS.CASH[0]);
      setColor(ACCOUNT_COLORS[0]);
      setBalance("");
      setIsDefault(false);
      setNote("");
    }
    setError(null);
  }, [open, account]);

  // When type changes (and not editing), pick a sensible default icon
  React.useEffect(() => {
    if (isEdit) return;
    const icons = ACCOUNT_TYPE_ICONS[type] ?? [];
    if (icons.length > 0 && !icons.includes(icon)) {
      setIcon(icons[0]);
    }
  }, [type, isEdit, icon]);

  const submitting = createMut.isPending || updateMut.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Nama akun wajib diisi.");
      return;
    }

    const amt = Number(balance.replace(/[^\d.-]/g, ""));
    const finalBalance = Number.isFinite(amt) ? amt : 0;

    const payload: AccountInput = {
      name: name.trim(),
      type,
      icon,
      color,
      balance: finalBalance,
      isDefault,
      note: note.trim() || undefined,
    };

    if (isEdit && account) {
      updateMut.mutate(
        { id: account.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Akun berhasil diperbarui.");
            onOpenChange(false);
          },
          onError: (err) => {
            setError(err.message || "Gagal memperbarui akun.");
          },
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(`Akun "${name.trim()}" ditambahkan.`);
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Gagal menambah akun.");
        },
      });
    }
  }

  const availableIcons = ACCOUNT_TYPE_ICONS[type] ?? [];

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
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${color}1a` }}
              >
                <LucideIcon
                  name={icon}
                  className="h-5 w-5"
                  style={{ color }}
                />
              </span>
              <div>
                <DialogTitle className="text-base">
                  {isEdit ? "Edit Akun" : "Akun Baru"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isEdit
                    ? "Ubah detail akun Anda."
                    : "Tambahkan dompet, bank, atau e-wallet baru."}
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
          <div className="max-h-[65vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Nama Akun</Label>
              <Input
                id="acc-name"
                placeholder="cth. Rekening BCA, GoPay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoFocus
              />
            </div>

            {/* Type select */}
            <div className="space-y-1.5">
              <Label>Tipe Akun</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AccountType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih tipe akun" />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={ACCOUNT_TYPE_ICONS[t][0]}
                          className="h-4 w-4 text-muted-foreground"
                        />
                        {ACCOUNT_TYPE_LABELS[t]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="grid grid-cols-4 gap-2">
                {availableIcons.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "flex h-10 items-center justify-center rounded-lg transition-colors",
                      icon === ic
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                    aria-label={ic}
                  >
                    <LucideIcon name={ic} className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {ACCOUNT_COLORS.map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    onClick={() => setColor(cl)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-transform",
                      color === cl &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: cl }}
                    aria-label={`Warna ${cl}`}
                  >
                    {color === cl && <Check className="h-4 w-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Initial balance / current balance */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">
                {isEdit ? "Saldo Saat Ini" : "Saldo Awal"}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="acc-balance"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="pl-9 font-semibold"
                />
              </div>
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Mengubah saldo akan menimpa saldo akun secara langsung.
                </p>
              )}
            </div>

            {/* Default switch */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  Jadikan Akun Utama
                </p>
                <p className="text-xs text-muted-foreground">
                  Akun utama dipakai sebagai pilihan default saat catat
                  transaksi.
                </p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
                aria-label="Jadikan akun utama"
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-note">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="acc-note"
                placeholder="cth. Untuk belanja harian"
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
            <Button type="submit" disabled={submitting} className="gap-1">
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isEdit ? "Simpan" : "Tambah Akun"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Transfer Dialog ----------
function TransferDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: accounts } = useAccounts();
  const transferMut = useTransfer();

  const [fromAccountId, setFromAccountId] = React.useState("");
  const [toAccountId, setToAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [date, setDate] = React.useState(formatDateInput(new Date()));
  const [fee, setFee] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const accountList = accounts ?? [];

  React.useEffect(() => {
    if (!open) return;
    setFromAccountId(accountList[0]?.id ?? "");
    setToAccountId(accountList[1]?.id ?? "");
    setAmount("");
    setDate(formatDateInput(new Date()));
    setFee("");
    setNote("");
    setError(null);
    // Only reset when the dialog opens (intentionally ignore accountList changes).
  }, [open]);

  const fromAccount = accountList.find((a) => a.id === fromAccountId);
  const toAccount = accountList.find((a) => a.id === toAccountId);

  const sameAccount =
    fromAccountId && toAccountId && fromAccountId === toAccountId;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fromAccountId || !toAccountId) {
      setError("Pilih akun asal dan tujuan.");
      return;
    }
    if (sameAccount) {
      setError("Akun asal dan tujuan harus berbeda.");
      return;
    }
    const amt = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Masukkan jumlah yang valid (lebih dari 0).");
      return;
    }
    const feeAmt = Number(fee.replace(/[^\d.-]/g, ""));
    const finalFee = Number.isFinite(feeAmt) && feeAmt > 0 ? feeAmt : 0;

    const payload: TransferInput = {
      fromAccountId,
      toAccountId,
      amount: amt,
      date,
      note: note.trim() || undefined,
      fee: finalFee > 0 ? finalFee : undefined,
    };

    transferMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Transfer berhasil dilakukan.");
        onOpenChange(false);
      },
      onError: (err) => {
        setError(err.message || "Gagal melakukan transfer.");
      },
    });
  }

  const submitting = transferMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ArrowLeftRight className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base">
                  Transfer Antar Akun
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Pindahkan dana antar akun Anda.
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
          <div className="max-h-[65vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* From account */}
            <div className="space-y-1.5">
              <Label>Dari Akun</Label>
              <Select value={fromAccountId} onValueChange={setFromAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih akun asal" />
                </SelectTrigger>
                <SelectContent>
                  {accountList.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === toAccountId}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={a.icon}
                          className="h-4 w-4"
                          style={{ color: a.color }}
                        />
                        <span className="truncate">{a.name}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatCurrencyCompact(a.balance)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fromAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo: {formatCurrency(fromAccount.balance)}
                </p>
              )}
            </div>

            {/* To account */}
            <div className="space-y-1.5">
              <Label>Ke Akun</Label>
              <Select value={toAccountId} onValueChange={setToAccountId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {accountList.map((a) => (
                    <SelectItem key={a.id} value={a.id} disabled={a.id === fromAccountId}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={a.icon}
                          className="h-4 w-4"
                          style={{ color: a.color }}
                        />
                        <span className="truncate">{a.name}</span>
                        <span className="ml-auto text-[11px] text-muted-foreground">
                          {formatCurrencyCompact(a.balance)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {toAccount && (
                <p className="text-[11px] text-muted-foreground">
                  Saldo: {formatCurrency(toAccount.balance)}
                </p>
              )}
            </div>

            {sameAccount && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                Akun asal dan tujuan harus berbeda.
              </div>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="trf-amount">Jumlah Transfer</Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="trf-amount"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9 text-lg font-semibold"
                />
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="trf-date">Tanggal</Label>
              <Input
                id="trf-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={formatDateInput(new Date())}
              />
            </div>

            {/* Fee */}
            <div className="space-y-1.5">
              <Label htmlFor="trf-fee">
                Biaya Admin{" "}
                <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                  Rp
                </span>
                <Input
                  id="trf-fee"
                  inputMode="decimal"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={fee}
                  onChange={(e) => setFee(e.target.value)}
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Biaya akan tercatat sebagai pengeluaran otomatis pada akun asal.
              </p>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="trf-note">
                Catatan <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Textarea
                id="trf-note"
                placeholder="cth. Transfer ke tabungan"
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
            <Button type="submit" disabled={submitting} className="gap-1">
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              <ArrowLeftRight className="h-4 w-4" />
              Transfer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
