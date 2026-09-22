"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  Tag,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatDateInput,
  parseDateLocal,
} from "@/lib/format";
import {
  useAccounts,
  useBills,
  useCreateBill,
  useCreateSubscription,
  useDeleteBill,
  useDeleteSubscription,
  useMarkBillPaid,
  useResetBillsMonth,
  useSubscriptions,
  useToggleSubscription,
} from "@/lib/hooks";
import type {
  Account,
  Bill,
  BillingCycle,
  Subscription,
  SubscriptionInput,
} from "@/lib/types";

const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  WEEKLY: "Mingguan",
  MONTHLY: "Bulanan",
  YEARLY: "Tahunan",
};

const SUBSCRIPTION_ICONS = [
  "Play", "Music", "Youtube", "Clapperboard", "Cloud", "HardDrive",
  "Smartphone", "Wifi", "Tv", "Camera", "Gamepad2", "Newspaper",
  "Book", "GraduationCap", "Dumbbell", "Building2",
];

const SUBSCRIPTION_COLORS = [
  "#10b981", "#0891b2", "#8b5cf6", "#f97316", "#ef4444",
  "#ec4899", "#14b8a6", "#eab308", "#6b7280",
];

/** Compute days until bill due date for the current month. */
function getDaysUntilDue(dueDay: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDueDay = Math.min(Math.max(dueDay, 1), daysInMonth);
  let dueDate = new Date(year, month, safeDueDay);
  dueDate.setHours(0, 0, 0, 0);
  // If today is past the due day this month, look ahead to next month.
  if (dueDate.getTime() < today.getTime()) {
    dueDate = new Date(year, month + 1, safeDueDay);
    dueDate.setHours(0, 0, 0, 0);
  }
  const diff = Math.round(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
}

function dueLabel(days: number): { label: string; tone: "ok" | "soon" | "over" } {
  if (days < 0) return { label: `Terlambat ${Math.abs(days)} hari`, tone: "over" };
  if (days === 0) return { label: "Jatuh tempo hari ini", tone: "soon" };
  if (days <= 3) return { label: `Jatuh tempo ${days} hari lagi`, tone: "soon" };
  return { label: `Jatuh tempo ${days} hari lagi`, tone: "ok" };
}

function renewalDays(nextBilling: string): number {
  const target = parseDateLocal(nextBilling);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/** Convert any billing cycle to monthly equivalent for cost summary. */
function monthlyEquivalent(amount: number, cycle: BillingCycle): number {
  switch (cycle) {
    case "WEEKLY":
      return amount * 4.345; // avg weeks/month
    case "YEARLY":
      return amount / 12;
    case "MONTHLY":
    default:
      return amount;
  }
}

export function BillsSection() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Tagihan & Langganan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Pantau tagihan bulanan, langganan aktif, dan hindari keterlambatan
            pembayaran.
          </p>
        </div>
      </div>

      <Tabs defaultValue="bills" className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="bills" className="gap-1.5">
            <ReceiptText className="h-4 w-4" />
            Tagihan
          </TabsTrigger>
          <TabsTrigger value="subscriptions" className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Langganan
          </TabsTrigger>
        </TabsList>
        <TabsContent value="bills" className="mt-4">
          <BillsTab />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <SubscriptionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =================== BILLS TAB ===================

function BillsTab() {
  const { data: bills, isLoading } = useBills();
  const { data: accounts } = useAccounts();

  const markPaidMut = useMarkBillPaid();
  const deleteMut = useDeleteBill();
  const resetMut = useResetBillsMonth();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editBill, setEditBill] = React.useState<Bill | null>(null);

  const summary = React.useMemo(() => {
    const list = bills ?? [];
    const total = list.reduce((s, b) => s + b.amount, 0);
    const paid = list.filter((b) => b.paidThisMonth);
    const unpaid = list.filter((b) => !b.paidThisMonth);
    const unpaidTotal = unpaid.reduce((s, b) => s + b.amount, 0);
    return {
      total,
      paidCount: paid.length,
      unpaidCount: unpaid.length,
      unpaidTotal,
      totalCount: list.length,
    };
  }, [bills]);

  const sortedBills = React.useMemo(() => {
    const list = bills ?? [];
    return [...list].sort((a, b) => {
      const da = getDaysUntilDue(a.dueDay);
      const db = getDaysUntilDue(b.dueDay);
      return da - db;
    });
  }, [bills]);

  function handleMarkPaid(bill: Bill) {
    markPaidMut.mutate(bill.id, {
      onSuccess: () =>
        toast.success("Tagihan ditandai lunas", {
          description: bill.name,
        }),
      onError: (e: Error) => toast.error("Gagal menandai lunas", { description: e.message }),
    });
  }

  function handleDelete(id: string, name: string) {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Tagihan dihapus", { description: name }),
      onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
    });
  }

  function handleResetMonth() {
    resetMut.mutate(undefined, {
      onSuccess: () =>
        toast.success("Bulan direset", {
          description: "Semua tagihan ditandai belum dibayar.",
        }),
      onError: (e: Error) => toast.error("Gagal reset bulan", { description: e.message }),
    });
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Bulan Ini"
          value={formatCurrency(summary.total)}
          icon={<CalendarDays className="h-4 w-4" />}
          tone="default"
        />
        <SummaryCard
          label="Sudah Dibayar"
          value={`${summary.paidCount}/${summary.totalCount}`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
        <SummaryCard
          label="Belum Dibayar"
          value={`${summary.unpaidCount}`}
          icon={<Clock className="h-4 w-4" />}
          tone="warning"
        />
        <SummaryCard
          label="Outstanding"
          value={formatCurrency(summary.unpaidTotal)}
          icon={<AlertCircle className="h-4 w-4" />}
          tone="danger"
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {summary.totalCount > 0
            ? `${summary.totalCount} tagihan terdaftar`
            : "Belum ada tagihan terdaftar."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetMonth}
            disabled={resetMut.isPending || summary.totalCount === 0}
            className="gap-1.5"
          >
            {resetMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Reset Bulan
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditBill(null);
              setDialogOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Tambah Tagihan
          </Button>
        </div>
      </div>

      {/* Bills list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : sortedBills.length === 0 ? (
        <EmptyState
          title="Belum ada tagihan"
          description="Tambahkan tagihan rutin seperti listrik, air, internet, atau cicilan untuk memantau jatuh temponya."
          actionLabel="Tambah Tagihan"
          onAction={() => {
            setEditBill(null);
            setDialogOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {sortedBills.map((bill) => {
              const days = getDaysUntilDue(bill.dueDay);
              const due = dueLabel(days);
              const isPaid = bill.paidThisMonth;
              const categoryLabel = bill.category || "Tagihan";
              const account =
                bill.accountId
                  ? (accounts ?? []).find((a) => a.id === bill.accountId)
                  : null;
              return (
                <motion.div
                  key={bill.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <BillCard
                    bill={bill}
                    categoryLabel={categoryLabel}
                    account={account}
                    due={due}
                    isPaid={isPaid}
                    onMarkPaid={() => handleMarkPaid(bill)}
                    onEdit={() => {
                      setEditBill(bill);
                      setDialogOpen(true);
                    }}
                    onDelete={() => handleDelete(bill.id, bill.name)}
                    isPending={markPaidMut.isPending}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <BillFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editBill={editBill}
      />
    </div>
  );
}

interface BillCardProps {
  bill: Bill;
  categoryLabel: string;
  account: Pick<Account, "id" | "name" | "icon" | "color"> | null | undefined;
  due: { label: string; tone: "ok" | "soon" | "over" };
  isPaid: boolean;
  onMarkPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isPending: boolean;
}

function BillCard({
  bill,
  categoryLabel,
  account,
  due,
  isPaid,
  onMarkPaid,
  onEdit,
  onDelete,
  isPending,
}: BillCardProps) {
  const dueToneClass =
    due.tone === "over"
      ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
      : due.tone === "soon"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 p-4 transition-colors",
        isPaid ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm",
              isPaid ? "bg-emerald-500/80" : "bg-primary/90"
            )}
          >
            <ReceiptText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold">{bill.name}</p>
              {isPaid ? (
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
                  <Check className="mr-1 h-3 w-3" />
                  Lunas
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">
                  Tgl {bill.dueDay}
                </Badge>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Tag className="h-3 w-3 text-primary" />
                {categoryLabel}
              </span>
              {account && (
                <>
                  <span aria-hidden>·</span>
                  <span className="inline-flex items-center gap-1">
                    <LucideIcon
                      name={account.icon}
                      className="h-3 w-3"
                      style={{ color: account.color }}
                    />
                    {account.name}
                  </span>
                </>
              )}
              {bill.note && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">{bill.note}</span>
                </>
              )}
            </div>
            {!isPaid && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge className={cn("font-medium", dueToneClass)}>
                  <Clock className="mr-1 h-3 w-3" />
                  {due.label}
                </Badge>
              </div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <p
            className={cn(
              "text-sm font-bold tabular-nums",
              isPaid && "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(bill.amount)}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={isPaid ? "outline" : "default"}
              onClick={onMarkPaid}
              disabled={isPending || isPaid}
              className="h-8 gap-1.5 px-2.5 text-xs"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {isPaid ? "Lunas" : "Tandai Lunas"}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
              aria-label="Edit tagihan"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-red-600"
                  aria-label="Hapus tagihan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus tagihan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tagihan <strong>{bill.name}</strong> akan dihapus permanen
                    dari daftar. Tindakan ini tidak bisa dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Hapus
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

interface BillFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBill: Bill | null;
}

function BillFormDialog({ open, onOpenChange, editBill }: BillFormDialogProps) {
  const { data: accounts } = useAccounts();
  const createMut = useCreateBill();

  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [dueDay, setDueDay] = React.useState("10");
  const [category, setCategory] = React.useState("Tagihan");
  const [accountId, setAccountId] = React.useState("");
  const [recurring, setRecurring] = React.useState(true);
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (editBill) {
      setName(editBill.name);
      setAmount(String(editBill.amount));
      setDueDay(String(editBill.dueDay));
      setCategory(editBill.category || "Tagihan");
      setAccountId(editBill.accountId ?? "");
      setRecurring(editBill.recurring);
      setNote(editBill.note ?? "");
    } else {
      setName("");
      setAmount("");
      setDueDay("10");
      setCategory("Tagihan");
      setAccountId("");
      setRecurring(true);
      setNote("");
    }
  }, [open, editBill]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama tagihan wajib diisi");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    const dd = Number(dueDay);
    if (!Number.isFinite(dd) || dd < 1 || dd > 31) {
      toast.error("Tanggal jatuh tempo harus 1-31");
      return;
    }
    createMut.mutate(
      {
        name: name.trim(),
        amount: amt,
        dueDay: dd,
        category: category.trim() || "Tagihan",
        accountId: accountId || undefined,
        recurring,
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Tagihan ditambahkan", { description: name.trim() });
          onOpenChange(false);
        },
        onError: (e: Error) =>
          toast.error("Gagal menyimpan tagihan", { description: e.message }),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editBill ? "Edit Tagihan" : "Tambah Tagihan"}
          </DialogTitle>
          <DialogDescription>
            Catat tagihan rutin untuk diingatkan saat jatuh tempo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">Nama Tagihan</Label>
            <Input
              id="bill-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Listrik PLN, Internet Indihome"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">Jumlah (Rp)</Label>
              <Input
                id="bill-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-due">Tanggal Jatuh Tempo</Label>
              <Input
                id="bill-due"
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                required
              />
              <p className="text-[11px] text-muted-foreground">Rentang 1-31</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bill-category">Kategori</Label>
            <Input
              id="bill-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="cth. Listrik, Internet, Cicilan"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Akun Pembayaran</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih akun (opsional)" />
              </SelectTrigger>
              <SelectContent>
                {(accounts ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="inline-flex items-center gap-2">
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

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label htmlFor="bill-recurring" className="text-sm">Tagihan Berulang</Label>
              <p className="text-[11px] text-muted-foreground">
                Tandai jika tagihan ini berulang setiap bulan.
              </p>
            </div>
            <Switch
              id="bill-recurring"
              checked={recurring}
              onCheckedChange={setRecurring}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bill-note">Catatan</Label>
            <Textarea
              id="bill-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="cth. ID pelanggan, nomor virtual account..."
              className="resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMut.isPending} className="gap-1.5">
              {createMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {editBill ? "Simpan Perubahan" : "Tambah Tagihan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =================== SUBSCRIPTIONS TAB ===================

function SubscriptionsTab() {
  const { data: subs, isLoading } = useSubscriptions();
  const deleteMut = useDeleteSubscription();
  const toggleMut = useToggleSubscription();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const summary = React.useMemo(() => {
    const list = (subs ?? []).filter((s) => s.active);
    const monthly = list.reduce(
      (s, x) => s + monthlyEquivalent(x.amount, x.billingCycle),
      0
    );
    return {
      monthlyTotal: monthly,
      activeCount: list.length,
      totalCount: (subs ?? []).length,
    };
  }, [subs]);

  const sortedSubs = React.useMemo(() => {
    const list = subs ?? [];
    return [...list].sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return renewalDays(a.nextBilling) - renewalDays(b.nextBilling);
    });
  }, [subs]);

  function handleDelete(id: string, name: string) {
    deleteMut.mutate(id, {
      onSuccess: () => toast.success("Langganan dihapus", { description: name }),
      onError: (e: Error) => toast.error("Gagal menghapus", { description: e.message }),
    });
  }

  function handleToggle(sub: Subscription) {
    toggleMut.mutate(
      { id: sub.id, active: !sub.active },
      {
        onSuccess: () =>
          toast.success(
            sub.active ? "Langganan dinonaktifkan" : "Langganan diaktifkan",
            { description: sub.name }
          ),
        onError: (e: Error) =>
          toast.error("Gagal mengubah status", { description: e.message }),
      }
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SummaryCard
          label="Biaya Langganan / Bulan"
          value={formatCurrency(Math.round(summary.monthlyTotal))}
          icon={<RefreshCw className="h-4 w-4" />}
          tone="default"
        />
        <SummaryCard
          label="Langganan Aktif"
          value={`${summary.activeCount} dari ${summary.totalCount}`}
          icon={<CheckCircle2 className="h-4 w-4" />}
          tone="success"
        />
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {summary.totalCount > 0
            ? `${summary.totalCount} langganan terdaftar`
            : "Belum ada langganan terdaftar."}
        </p>
        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Tambah Langganan
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : sortedSubs.length === 0 ? (
        <EmptyState
          title="Belum ada langganan"
          description="Catat langganan seperti Netflix, Spotify, atau YouTube Premium agar tidak lupa diperpanjang."
          actionLabel="Tambah Langganan"
          onAction={() => setDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AnimatePresence initial={false}>
            {sortedSubs.map((sub) => {
              const days = renewalDays(sub.nextBilling);
              const categoryLabel = sub.category || "Hiburan";
              return (
                <motion.div
                  key={sub.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                >
                  <SubscriptionCard
                    sub={sub}
                    categoryLabel={categoryLabel}
                    renewalDaysCount={days}
                    onToggle={() => handleToggle(sub)}
                    onDelete={() => handleDelete(sub.id, sub.name)}
                    isToggling={toggleMut.isPending}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}

interface SubscriptionCardProps {
  sub: Subscription;
  categoryLabel: string;
  renewalDaysCount: number;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
}

function SubscriptionCard({
  sub,
  categoryLabel,
  renewalDaysCount,
  onToggle,
  onDelete,
  isToggling,
}: SubscriptionCardProps) {
  const renewalLabel =
    renewalDaysCount < 0
      ? `Terlambat ${Math.abs(renewalDaysCount)} hari`
      : renewalDaysCount === 0
      ? "Diperpanjang hari ini"
      : `Perpanjang ${renewalDaysCount} hari lagi`;
  const renewalTone =
    renewalDaysCount < 0 || renewalDaysCount <= 3 ? "soon" : "ok";
  const renewalClass =
    renewalTone === "soon"
      ? "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";

  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border/60 p-4",
        !sub.active && "opacity-60"
      )}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-10"
        style={{ backgroundColor: sub.color || "#10b981" }}
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
            style={{ backgroundColor: sub.color || "#10b981" }}
          >
            <LucideIcon name={sub.icon || "Play"} className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{sub.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {BILLING_CYCLE_LABELS[sub.billingCycle]} ·{" "}
              {formatDate(sub.nextBilling)}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge className={cn("font-medium", renewalClass)}>
                <Clock className="mr-1 h-3 w-3" />
                {renewalLabel}
              </Badge>
              {categoryLabel && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Tag
                    className="mr-1 h-3 w-3 text-primary"
                  />
                  {categoryLabel}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <p className="text-sm font-bold tabular-nums">
            {formatCurrency(sub.amount)}
          </p>
          <div className="flex items-center gap-1.5">
            <Switch
              checked={sub.active}
              onCheckedChange={onToggle}
              disabled={isToggling}
              aria-label={`Aktifkan ${sub.name}`}
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-red-600"
                  aria-label={`Hapus ${sub.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus langganan?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Langganan <strong>{sub.name}</strong> akan dihapus permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Hapus
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

interface SubscriptionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SubscriptionFormDialog({
  open,
  onOpenChange,
}: SubscriptionFormDialogProps) {
  const createMut = useCreateSubscription();

  const [name, setName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [billingCycle, setBillingCycle] =
    React.useState<BillingCycle>("MONTHLY");
  const [nextBilling, setNextBilling] = React.useState(
    formatDateInput(new Date())
  );
  const [category, setCategory] = React.useState("Hiburan");
  const [icon, setIcon] = React.useState(SUBSCRIPTION_ICONS[0]);
  const [color, setColor] = React.useState(SUBSCRIPTION_COLORS[0]);
  const [note, setNote] = React.useState("");
  const [dateOpen, setDateOpen] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setAmount("");
    setBillingCycle("MONTHLY");
    setNextBilling(formatDateInput(new Date()));
    setCategory("Hiburan");
    setIcon(SUBSCRIPTION_ICONS[0]);
    setColor(SUBSCRIPTION_COLORS[0]);
    setNote("");
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nama langganan wajib diisi");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Jumlah harus lebih dari 0");
      return;
    }
    if (!nextBilling) {
      toast.error("Tanggal perpanjangan wajib diisi");
      return;
    }
    const payload: SubscriptionInput = {
      name: name.trim(),
      amount: amt,
      billingCycle,
      nextBilling,
      category: category.trim() || "Hiburan",
      icon,
      color,
      note: note.trim() || undefined,
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Langganan ditambahkan", { description: name.trim() });
        onOpenChange(false);
      },
      onError: (e: Error) =>
        toast.error("Gagal menyimpan langganan", { description: e.message }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto custom-scrollbar max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Langganan</DialogTitle>
          <DialogDescription>
            Catat langganan berulang untuk pengingat perpanjangan otomatis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <Label htmlFor="sub-name">Nama Langganan</Label>
            <Input
              id="sub-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Netflix, Spotify, YouTube Premium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Jumlah (Rp)</Label>
              <Input
                id="sub-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="65000"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Siklus Tagihan</Label>
              <Select
                value={billingCycle}
                onValueChange={(v) => setBillingCycle(v as BillingCycle)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih siklus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WEEKLY">Mingguan</SelectItem>
                  <SelectItem value="MONTHLY">Bulanan</SelectItem>
                  <SelectItem value="YEARLY">Tahunan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Tanggal Perpanjangan Berikutnya</Label>
            <Popover open={dateOpen} onOpenChange={setDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-start gap-2 font-normal"
                >
                  <CalendarDays className="h-4 w-4" />
                  {nextBilling ? formatDate(nextBilling) : "Pilih tanggal"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={nextBilling ? parseDateLocal(nextBilling) : undefined}
                  onSelect={(d) => {
                    if (d) {
                      setNextBilling(formatDateInput(d));
                      setDateOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-category">Kategori</Label>
            <Input
              id="sub-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="cth. Hiburan, Software, Keanggotaan"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Ikon</Label>
            <div className="grid max-h-32 grid-cols-8 gap-1.5 overflow-y-auto custom-scrollbar rounded-lg border border-border/60 p-2">
              {SUBSCRIPTION_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    icon === ic
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent"
                  )}
                  aria-label={ic}
                  aria-pressed={icon === ic}
                >
                  <LucideIcon name={ic} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Warna</Label>
            <div className="flex flex-wrap gap-2">
              {SUBSCRIPTION_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Warna ${c}`}
                  aria-pressed={color === c}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-note">Catatan</Label>
            <Textarea
              id="sub-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="cth. Akun keluarga, tagihan kartu kredit..."
              className="resize-none"
              rows={2}
            />
          </div>

          <DialogFooter className="pt-1">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={createMut.isPending} className="gap-1.5">
              {createMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Tambah Langganan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// =================== SHARED ===================

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
}

function SummaryCard({
  label,
  value,
  icon,
  tone = "default",
}: SummaryCardProps) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
      : tone === "warning"
      ? "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
      : tone === "danger"
      ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
      : "bg-primary/10 text-primary";
  return (
    <Card className="p-3.5">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md",
            toneClass
          )}
        >
          {icon}
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="mt-2 truncate text-base font-bold tabular-nums">{value}</p>
    </Card>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <ReceiptText className="h-6 w-6" />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mt-1 gap-1.5">
          <Plus className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </Card>
  );
}
