"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarIcon,
  CheckCircle2,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Scale,
  Trash2,
  Users,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
  formatCurrencyCompact,
  formatDateInput,
  formatDateLong,
  parseDateLocal,
  relativeDay,
} from "@/lib/format";
import { DEBT_TYPE_OPTIONS } from "@/lib/constants";
import {
  useCreateDebt,
  useDeleteDebt,
  useDebts,
  useSettleDebt,
  useUpdateDebt,
} from "@/lib/hooks";
import type { Debt, DebtInput, DebtType } from "@/lib/types";

const DEBT_TYPE_LABEL: Record<DebtType, string> = {
  DEBT: "Hutang",
  RECEIVABLE: "Piutang",
};

export function DebtsSection() {
  const { data: debts, isLoading } = useDebts();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editDebt, setEditDebt] = React.useState<Debt | null>(null);
  const [defaultType, setDefaultType] = React.useState<DebtType>("DEBT");
  const [tab, setTab] = React.useState<DebtType>("DEBT");

  const { totalDebt, totalReceivable, totalDebtRemaining, totalReceivableRemaining } =
    React.useMemo(() => {
      const list = debts ?? [];
      let totalDebt = 0;
      let totalReceivable = 0;
      let totalDebtRemaining = 0;
      let totalReceivableRemaining = 0;
      for (const d of list) {
        const remaining = Math.max(0, d.amount - d.paidAmount);
        if (d.type === "DEBT") {
          totalDebt += d.amount;
          totalDebtRemaining += remaining;
        } else {
          totalReceivable += d.amount;
          totalReceivableRemaining += remaining;
        }
      }
      return {
        totalDebt,
        totalReceivable,
        totalDebtRemaining,
        totalReceivableRemaining,
      };
    }, [debts]);

  const net = totalReceivableRemaining - totalDebtRemaining;

  function openCreate(type?: DebtType) {
    setEditDebt(null);
    setDefaultType(type ?? tab);
    setDialogOpen(true);
  }

  function openEdit(d: Debt) {
    setEditDebt(d);
    setDefaultType(d.type);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Hutang & Piutang
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Catat uang yang Anda pinjam atau pinjamkan, dan pantau statusnya.
          </p>
        </div>
        <Button onClick={() => openCreate()} className="gap-1">
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* Summary strip — gradient cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryGradientCard
          label="Total Hutang"
          sublabel="Yang Anda berhutang"
          amount={totalDebtRemaining}
          total={totalDebt}
          tone="debt"
          icon={<ArrowUpRight className="h-4 w-4" />}
        />
        <SummaryGradientCard
          label="Total Piutang"
          sublabel="Yang berhutang ke Anda"
          amount={totalReceivableRemaining}
          total={totalReceivable}
          tone="receivable"
          icon={<ArrowDownLeft className="h-4 w-4" />}
        />
        <SummaryGradientCard
          label="Saldo Bersih"
          sublabel="Piutang - Hutang"
          amount={net}
          tone="balance"
          icon={<Scale className="h-4 w-4" />}
        />
      </div>

      {/* Tabs for Hutang / Piutang */}
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as DebtType)}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="DEBT" className="gap-1">
            <ArrowUpRight className="h-3.5 w-3.5" />
            Hutang Saya
          </TabsTrigger>
          <TabsTrigger value="RECEIVABLE" className="gap-1">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            Piutang Saya
          </TabsTrigger>
        </TabsList>

        {(["DEBT", "RECEIVABLE"] as DebtType[]).map((type) => {
          const list = (debts ?? []).filter((d) => d.type === type);
          return (
            <TabsContent key={type} value={type} className="mt-4">
              {isLoading ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-44 rounded-2xl" />
                  ))}
                </div>
              ) : list.length === 0 ? (
                <EmptyState
                  type={type}
                  onCreate={() => openCreate(type)}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {list.map((d) => (
                    <DebtCard
                      key={d.id}
                      debt={d}
                      onEdit={() => openEdit(d)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      <DebtFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editDebt={editDebt}
        defaultType={defaultType}
      />
    </div>
  );
}

function SummaryGradientCard({
  label,
  sublabel,
  amount,
  total,
  tone,
  icon,
}: {
  label: string;
  sublabel: string;
  amount: number;
  total?: number;
  tone: "debt" | "receivable" | "balance";
  icon?: React.ReactNode;
}) {
  const isPositive = amount > 0;
  return (
    <Card
      className={cn(
        "relative overflow-hidden p-4 text-white shadow-sm",
        tone === "debt" &&
          "bg-gradient-to-br from-rose-500 to-red-600 dark:from-rose-600 dark:to-red-700",
        tone === "receivable" &&
          "bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700",
        tone === "balance" &&
          (amount >= 0
            ? "bg-gradient-to-br from-teal-500 to-emerald-600 dark:from-teal-600 dark:to-emerald-700"
            : "bg-gradient-to-br from-orange-500 to-rose-600 dark:from-orange-600 dark:to-rose-700")
      )}
    >
      {/* Decorative blob */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/10 blur-xl" />
      <div className="relative flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/80">{label}</p>
          <p className="truncate text-[11px] text-white/60">{sublabel}</p>
        </div>
        {icon && (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-xl font-bold tabular-nums text-white">
        {formatCurrency(Math.abs(amount))}
      </p>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-white/70">
        {tone === "balance" ? (
          <span>
            {isPositive ? "Surplus" : amount < 0 ? "Defisit" : "Seimbang"}
          </span>
        ) : (
          <span>
            Sisa dari total {formatCurrencyCompact(total ?? 0)}
          </span>
        )}
      </div>
    </Card>
  );
}

function DebtCard({
  debt,
  onEdit,
}: {
  debt: Debt;
  onEdit: () => void;
}) {
  const deleteMut = useDeleteDebt();
  const settleMut = useSettleDebt();
  const isDebt = debt.type === "DEBT";

  const remaining = Math.max(0, debt.amount - debt.paidAmount);
  const pct =
    debt.amount > 0
      ? Math.min(100, (debt.paidAmount / debt.amount) * 100)
      : 0;
  const isSettled = debt.settled || remaining <= 0;

  const overdue = React.useMemo(() => {
    if (!debt.dueDate || isSettled) return false;
    const due = parseDateLocal(debt.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    return due.getTime() < today.getTime();
  }, [debt.dueDate, isSettled]);

  const toneColor = isDebt ? "#ef4444" : "#10b981";

  function handleSettle() {
    settleMut.mutate(debt.id, {
      onSuccess: () =>
        toast.success(
          `${DEBT_TYPE_LABEL[debt.type]} "${debt.person}" ditandai lunas.`
        ),
      onError: (err) =>
        toast.error(err.message || "Gagal menandai lunas."),
    });
  }

  function handleDelete() {
    deleteMut.mutate(debt.id, {
      onSuccess: () =>
        toast.success(
          `${DEBT_TYPE_LABEL[debt.type]} "${debt.person}" dihapus.`
        ),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus."),
    });
  }

  return (
    <Card
      className={cn(
        "group relative p-4 transition-shadow hover:shadow-md",
        isSettled && "opacity-80"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{
              backgroundColor: isDebt
                ? "#ef44441a"
                : "#10b9811a",
            }}
          >
            <Users
              className="h-5 w-5"
              style={{ color: toneColor }}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {debt.person}
              </p>
              {isSettled && (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                >
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Lunas
                </Badge>
              )}
              {isSettled && debt.settledAt && (
                <span className="text-[11px] text-muted-foreground">
                  Dibayar {relativeDay(debt.settledAt)}
                </span>
              )}
              {overdue && (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                >
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Terlambat
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className={cn(
                  "border-transparent",
                  isDebt
                    ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                )}
              >
                {DEBT_TYPE_LABEL[debt.type]}
              </Badge>
              {debt.dueDate && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  Jatuh tempo {formatDateLong(debt.dueDate)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hover edit/delete */}
        <div className="absolute right-3 top-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                aria-label="Aksi"
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
                    <AlertDialogTitle>
                      Hapus {DEBT_TYPE_LABEL[debt.type].toLowerCase()} ini?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Catatan {DEBT_TYPE_LABEL[debt.type].toLowerCase()} dengan{" "}
                      <strong>{debt.person}</strong> akan dihapus. Tindakan ini
                      tidak dapat dibatalkan.
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
      </div>

      {/* Amounts */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(debt.amount)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/50 p-2">
          <p className="text-[11px] text-muted-foreground">Sisa</p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              isSettled
                ? "text-emerald-600 dark:text-emerald-400"
                : isDebt
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(remaining)}
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
          aria-valuenow={Math.round(pct)}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${pct}%`,
              backgroundColor: toneColor,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            Dibayar {formatCurrencyCompact(debt.paidAmount)}
          </span>
          <span className="font-medium text-muted-foreground">
            {pct.toFixed(0)}% lunas
          </span>
        </div>
      </div>

      {/* Description */}
      {debt.description && (
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground">
          {debt.description}
        </p>
      )}

      {/* Settle action */}
      {!isSettled && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          onClick={handleSettle}
          disabled={settleMut.isPending}
        >
          {settleMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle2 className="h-3.5 w-3.5" />
          )}
          Tandai Lunas
        </Button>
      )}
    </Card>
  );
}

function EmptyState({
  type,
  onCreate,
}: {
  type: DebtType;
  onCreate: () => void;
}) {
  const isDebt = type === "DEBT";
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{
          backgroundColor: isDebt ? "#ef44441a" : "#10b9811a",
        }}
      >
        <Users
          className="h-7 w-7"
          style={{ color: isDebt ? "#ef4444" : "#10b981" }}
        />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada {isDebt ? "hutang" : "piutang"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isDebt
            ? "Catat uang yang Anda pinjam dari orang lain."
            : "Catat uang yang Anda pinjamkan ke orang lain."}
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1">
        <Plus className="h-4 w-4" />
        Tambah {isDebt ? "Hutang" : "Piutang"}
      </Button>
    </Card>
  );
}

function DebtFormDialog({
  open,
  onOpenChange,
  editDebt,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editDebt: Debt | null;
  defaultType: DebtType;
}) {
  const isEdit = !!editDebt;
  const createMut = useCreateDebt();
  const updateMut = useUpdateDebt();

  const [type, setType] = React.useState<DebtType>(defaultType);
  const [person, setPerson] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [paidAmount, setPaidAmount] = React.useState("");
  const [dueDate, setDueDate] = React.useState<Date | undefined>(undefined);
  const [description, setDescription] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (editDebt) {
        setType(editDebt.type);
        setPerson(editDebt.person);
        setAmount(String(editDebt.amount));
        setPaidAmount(String(editDebt.paidAmount));
        setDueDate(editDebt.dueDate ? parseDateLocal(editDebt.dueDate) : undefined);
        setDescription(editDebt.description ?? "");
        setNote(editDebt.note ?? "");
      } else {
        setType(defaultType);
        setPerson("");
        setAmount("");
        setPaidAmount("0");
        setDueDate(undefined);
        setDescription("");
        setNote("");
      }
      setError(null);
    }
  }, [open, editDebt, defaultType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!person.trim()) {
      setError("Nama orang wajib diisi.");
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    const paid = Number(paidAmount || 0);
    if (!Number.isFinite(paid) || paid < 0) {
      setError("Jumlah dibayar tidak valid.");
      return;
    }
    if (paid > amt) {
      setError("Jumlah dibayar tidak boleh melebihi total.");
      return;
    }

    const payload: DebtInput = {
      type,
      person: person.trim(),
      amount: Math.round(amt),
      paidAmount: Math.round(paid),
      dueDate: dueDate ? formatDateInput(dueDate) : undefined,
      description: description.trim() || undefined,
      note: note.trim() || undefined,
    };

    if (isEdit && editDebt) {
      updateMut.mutate(
        { id: editDebt.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Catatan diperbarui.");
            onOpenChange(false);
          },
          onError: (err) =>
            setError(err.message || "Gagal memperbarui catatan."),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(
            `${DEBT_TYPE_LABEL[type]} "${person.trim()}" ditambahkan.`
          );
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menambah catatan."),
      });
    }
  }

  const pending = createMut.isPending || updateMut.isPending;
  const selectedTypeOption = DEBT_TYPE_OPTIONS.find((o) => o.value === type);

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
                {isEdit
                  ? `Ubah ${DEBT_TYPE_LABEL[editDebt?.type ?? type]}`
                  : `Tambah ${DEBT_TYPE_LABEL[type]}`}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Perbarui detail catatan hutang/piutang ini."
                  : "Catat uang yang Anda pinjam atau pinjamkan."}
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
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label>Tipe</Label>
              <div className="grid grid-cols-2 gap-2">
                {DEBT_TYPE_OPTIONS.map((opt) => {
                  const value = opt.value as DebtType;
                  const active = type === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(value)}
                      className={cn(
                        "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                        active
                          ? "border-transparent text-white"
                          : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                      style={
                        active ? { backgroundColor: opt.color } : undefined
                      }
                    >
                      <LucideIcon
                        name={opt.icon}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="leading-tight">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Person */}
            <div className="space-y-1.5">
              <Label htmlFor="dbt-person">
                {type === "DEBT" ? "Kepada Siapa" : "Dari Siapa"}
              </Label>
              <Input
                id="dbt-person"
                placeholder={
                  type === "DEBT"
                    ? "cth. Budi, Bank ABC"
                    : "cth. Andi, Toko Sembako"
                }
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                maxLength={60}
                autoFocus
              />
            </div>

            {/* Amount + paidAmount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dbt-amount">Jumlah (Rp)</Label>
                <Input
                  id="dbt-amount"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  placeholder="cth. 500000"
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
                <Label htmlFor="dbt-paid">Dibayar (Rp)</Label>
                <Input
                  id="dbt-paid"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                />
                {Number(paidAmount || 0) > 0 &&
                  Number(amount || 0) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Sisa {formatCurrency(Math.max(0, Number(amount) - Number(paidAmount)))}
                    </p>
                  )}
              </div>
            </div>

            {/* Due date */}
            <div className="space-y-1.5">
              <Label>Tanggal Jatuh Tempo</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {dueDate
                      ? formatDateLong(dueDate)
                      : "Pilih tanggal (opsional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-fit px-2 text-xs text-muted-foreground"
                  onClick={() => setDueDate(undefined)}
                >
                  Hapus tanggal
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="dbt-desc">Keterangan</Label>
              <Textarea
                id="dbt-desc"
                placeholder="cth. Hutang untuk biaya sekolah anak"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                maxLength={200}
              />
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <Label htmlFor="dbt-note">Catatan (opsional)</Label>
              <Input
                id="dbt-note"
                placeholder="cth. Cicilan ke-2 dari 5"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
              />
            </div>

            {/* Type preview */}
            {selectedTypeOption && (
              <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <LucideIcon
                  name={selectedTypeOption.icon}
                  className="h-3.5 w-3.5"
                  style={{ color: selectedTypeOption.color }}
                />
                <span>
                  {type === "DEBT"
                    ? "Anda berhutang kepada orang ini."
                    : "Orang ini berhutang kepada Anda."}
                </span>
              </div>
            )}

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
              {isEdit ? "Simpan Perubahan" : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
