"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Camera,
  Copy,
  Download,
  Eye,
  EyeOff,
  Inbox,
  Layers,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Pin,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { CardStack } from "@/components/finance/card-stack";
import { FinancialTimeline } from "@/components/finance/financial-timeline";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDateLong,
  parseTags,
  relativeDay,
} from "@/lib/format";
import {
  useCategories,
  useDuplicateTransaction,
  useToggleHideTransaction,
  useTogglePin,
  useTransactions,
} from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";
import {
  MOOD_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PRIORITY_OPTIONS,
} from "@/lib/constants";

interface Props {
  onEdit: (t: Transaction) => void;
  limit?: number;
  showFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

type TypeFilter = "ALL" | TransactionType;
type ViewMode = "list" | "stack" | "timeline";

export function TransactionList({
  onEdit,
  limit,
  showFilters = true,
  emptyTitle = "Belum ada transaksi",
  emptyDescription = "Mulai catat pemasukan dan pengeluaran Anda.",
}: Props) {
  // View mode: list | stack | timeline
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");

  // Existing filters
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<TypeFilter>("ALL");
  const [categoryId, setCategoryId] = React.useState<string>("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  // New filters
  const [mood, setMood] = React.useState<string>("ALL");
  const [priority, setPriority] = React.useState<string>("ALL");
  const [paymentMethod, setPaymentMethod] = React.useState<string>("ALL");

  // "Hanya" toggle chips
  const [onlyLunasPending, setOnlyLunasPending] = React.useState(false);
  const [onlyPinned, setOnlyPinned] = React.useState(false);
  const [onlyReimbursable, setOnlyReimbursable] = React.useState(false);
  const [onlyDebt, setOnlyDebt] = React.useState(false);
  const [onlySubscription, setOnlySubscription] = React.useState(false);
  const [showHidden, setShowHidden] = React.useState(false);

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: categories } = useCategories();

  const params = React.useMemo(
    () => ({
      type: type === "ALL" ? undefined : type,
      categoryId: categoryId === "ALL" ? undefined : categoryId,
      search: debouncedSearch || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      // Client-side filter params (used as cache key + filtered locally)
      mood: mood === "ALL" ? undefined : mood,
      priority: priority === "ALL" ? undefined : priority,
      paymentMethod: paymentMethod === "ALL" ? undefined : paymentMethod,
      pinned: onlyPinned || undefined,
      reimbursable: onlyReimbursable || undefined,
      debt: onlyDebt || undefined,
      subscription: onlySubscription || undefined,
      includeHidden: showHidden ? true : undefined,
    }),
    [
      type,
      categoryId,
      debouncedSearch,
      from,
      to,
      limit,
      mood,
      priority,
      paymentMethod,
      onlyPinned,
      onlyReimbursable,
      onlyDebt,
      onlySubscription,
      showHidden,
    ]
  );

  const { data: rawTransactions, isLoading, isFetching } =
    useTransactions(params);

  // Client-side filtering for new attributes
  const transactions = React.useMemo(() => {
    const list = rawTransactions ?? [];
    if (!onlyLunasPending && mood === "ALL" && priority === "ALL" && paymentMethod === "ALL") {
      return list;
    }
    return list.filter((t) => {
      if (mood !== "ALL" && t.mood !== mood) return false;
      if (priority !== "ALL" && t.priority !== priority) return false;
      if (paymentMethod !== "ALL" && t.paymentMethod !== paymentMethod) return false;
      if (onlyLunasPending) {
        if (t.paymentStatus !== "PAID" && t.paymentStatus !== "PENDING") return false;
      }
      return true;
    });
  }, [
    rawTransactions,
    mood,
    priority,
    paymentMethod,
    onlyLunasPending,
  ]);

  const total = transactions.length;
  const totalIncome = transactions
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const hasActiveFilters =
    !!debouncedSearch ||
    type !== "ALL" ||
    categoryId !== "ALL" ||
    !!from ||
    !!to ||
    mood !== "ALL" ||
    priority !== "ALL" ||
    paymentMethod !== "ALL" ||
    onlyLunasPending ||
    onlyPinned ||
    onlyReimbursable ||
    onlyDebt ||
    onlySubscription;

  function clearFilters() {
    setSearch("");
    setType("ALL");
    setCategoryId("ALL");
    setFrom("");
    setTo("");
    setMood("ALL");
    setPriority("ALL");
    setPaymentMethod("ALL");
    setOnlyLunasPending(false);
    setOnlyPinned(false);
    setOnlyReimbursable(false);
    setOnlyDebt(false);
    setOnlySubscription(false);
  }

  async function handleExport() {
    try {
      const scope: Record<string, unknown> = { type: "ALL" };
      if (type !== "ALL") scope.type = type;
      if (categoryId !== "ALL") scope.categoryId = categoryId;
      if (from) scope.from = from;
      if (to) scope.to = to;
      if (showHidden) scope.includeHidden = true;

      const res = await fetch("/api/export/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, options: { includeHidden: showHidden } }),
      });
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `transaksi-dompetku-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success("CSV berhasil diunduh");
    } catch {
      toast.error("Gagal export CSV");
    }
  }

  return (
    <div className="space-y-4">
      {/* View mode switcher — List | Stack | Timeline */}
      {showFilters && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-muted-foreground">Tampilan</p>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            <ViewModeBtn
              active={viewMode === "list"}
              onClick={() => setViewMode("list")}
              icon={<List className="h-3.5 w-3.5" />}
              label="List"
            />
            <ViewModeBtn
              active={viewMode === "stack"}
              onClick={() => setViewMode("stack")}
              icon={<Layers className="h-3.5 w-3.5" />}
              label="Kartu"
            />
            <ViewModeBtn
              active={viewMode === "timeline"}
              onClick={() => setViewMode("timeline")}
              icon={<TimelineIcon />}
              label="Linimasa"
            />
          </div>
        </div>
      )}

      {/* Stack & Timeline views — render alternative layouts and skip the filter card */}
      {viewMode === "stack" && (
        <>
          {showFilters && total > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat
                label="Pemasukan"
                value={totalIncome}
                variant="income"
                loading={isLoading}
              />
              <SummaryStat
                label="Pengeluaran"
                value={totalExpense}
                variant="expense"
                loading={isLoading}
              />
              <SummaryStat
                label="Selisih"
                value={totalBalance}
                variant={totalBalance >= 0 ? "income" : "expense"}
                loading={isLoading}
              />
              <SummaryCount label="Transaksi" value={total} loading={isLoading} />
            </div>
          )}
          {isLoading ? (
            <Skeleton className="h-[26rem] w-full rounded-2xl" />
          ) : transactions.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <CardStack transactions={transactions} onEdit={onEdit} />
          )}
        </>
      )}

      {viewMode === "timeline" && (
        <>
          {showFilters && total > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat
                label="Pemasukan"
                value={totalIncome}
                variant="income"
                loading={isLoading}
              />
              <SummaryStat
                label="Pengeluaran"
                value={totalExpense}
                variant="expense"
                loading={isLoading}
              />
              <SummaryStat
                label="Selisih"
                value={totalBalance}
                variant={totalBalance >= 0 ? "income" : "expense"}
                loading={isLoading}
              />
              <SummaryCount label="Transaksi" value={total} loading={isLoading} />
            </div>
          )}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <EmptyState title={emptyTitle} description={emptyDescription} />
          ) : (
            <FinancialTimeline transactions={transactions} onEdit={onEdit} />
          )}
        </>
      )}

      {/* List view (default) */}
      {viewMode === "list" && (
        <>
      {/* Summary strip — totals for current filter */}
      {showFilters && total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat
            label="Pemasukan"
            value={totalIncome}
            variant="income"
            loading={isLoading}
          />
          <SummaryStat
            label="Pengeluaran"
            value={totalExpense}
            variant="expense"
            loading={isLoading}
          />
          <SummaryStat
            label="Selisih"
            value={totalBalance}
            variant={totalBalance >= 0 ? "income" : "expense"}
            loading={isLoading}
          />
          <SummaryCount label="Transaksi" value={total} loading={isLoading} />
        </div>
      )}

      {showFilters && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={type}
                onValueChange={(v) => setType(v as TypeFilter)}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="INCOME">Pemasukan</SelectItem>
                  <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">Semua kategori</SelectItem>
                  {(categories ?? []).map((c) => (
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

              <Select value={mood} onValueChange={setMood}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="Mood" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">Semua mood</SelectItem>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        <span aria-hidden>{m.emoji}</span>
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Prioritas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua prioritas</SelectItem>
                  {PRIORITY_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: p.color }}
                          aria-hidden
                        />
                        {p.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Pembayaran" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua pembayaran</SelectItem>
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <SelectItem key={pm.value} value={pm.value}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={pm.icon}
                          className="h-3.5 w-3.5 text-muted-foreground"
                        />
                        {pm.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5",
                      (from || to) && "border-primary text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Tanggal</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Rentang tanggal</div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Dari
                      </label>
                      <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Sampai
                      </label>
                      <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFrom("");
                          setTo("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={total === 0}
                className="h-9 gap-1.5"
                title="Ekspor ke CSV"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">CSV</span>
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* "Hanya" toggle chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="text-xs font-medium text-muted-foreground">
              Hanya:
            </span>
            <ToggleChip
              active={onlyLunasPending}
              onClick={() => setOnlyLunasPending((v) => !v)}
            >
              Lunas/Pending
            </ToggleChip>
            <ToggleChip
              active={onlyPinned}
              onClick={() => setOnlyPinned((v) => !v)}
            >
              <Pin className="h-3 w-3" />
              Disematkan
            </ToggleChip>
            <ToggleChip
              active={onlyReimbursable}
              onClick={() => setOnlyReimbursable((v) => !v)}
            >
              Reimbursable
            </ToggleChip>
            <ToggleChip
              active={onlyDebt}
              onClick={() => setOnlyDebt((v) => !v)}
            >
              Hutang
            </ToggleChip>
            <ToggleChip
              active={onlySubscription}
              onClick={() => setOnlySubscription((v) => !v)}
            >
              Langganan
            </ToggleChip>
            <ToggleChip
              active={showHidden}
              onClick={() => setShowHidden((v) => !v)}
            >
              <EyeOff className="mr-1 h-3 w-3" />
              Tersembunyi
            </ToggleChip>
          </div>

          {/* Result summary */}
          {total > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                {total} transaksi
                {isFetching && " · memperbarui..."}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <Card className="gap-0 overflow-hidden p-0">
          {transactions.map((t, idx) => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onEdit={() => onEdit(t)}
              isFirst={idx === 0}
            />
          ))}
        </Card>
      )}
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Sub-components
// ----------------------------------------------------------------------------

function SummaryStat({
  label,
  value,
  variant,
  loading,
}: {
  label: string;
  value: number;
  variant: "income" | "expense";
  loading?: boolean;
}) {
  const isIncome = variant === "income";
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-20" />
      ) : (
        <p
          className={cn(
            "mt-1 text-sm font-bold tabular-nums sm:text-base",
            isIncome ? "text-income" : "text-expense"
          )}
        >
          {value < 0 && !isIncome ? "−" : ""}
          {value >= 0 && isIncome ? "+" : ""}
          {formatCurrency(Math.abs(value))}
        </p>
      )}
    </Card>
  );
}

function SummaryCount({
  label,
  value,
  loading,
}: {
  label: string;
  value: number;
  loading?: boolean;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
        {label}
      </p>
      {loading ? (
        <Skeleton className="mt-1.5 h-5 w-12" />
      ) : (
        <p className="mt-1 text-sm font-bold tabular-nums text-foreground sm:text-base">
          {value}
        </p>
      )}
    </Card>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "h-7 gap-1 rounded-full px-2.5 text-xs",
        !active && "text-muted-foreground"
      )}
    >
      {children}
    </Button>
  );
}

function TransactionRow({
  transaction,
  onEdit,
  isFirst = false,
}: {
  transaction: Transaction;
  onEdit: () => void;
  isFirst?: boolean;
}) {
  const duplicateMut = useDuplicateTransaction();
  const pinMut = useTogglePin();
  const hideMut = useToggleHideTransaction();

  function handleToggleHide() {
    hideMut.mutate(transaction.id, {
      onSuccess: () => {
        toast.success(transaction.isHidden ? "Transaksi ditampilkan" : "Transaksi disembunyikan");
      },
      onError: () => toast.error("Gagal mengubah status transaksi"),
    });
  }

  const isIncome = transaction.type === "INCOME";
  const cat = transaction.category;

  const moodOpt = transaction.mood
    ? MOOD_OPTIONS.find((o) => o.value === transaction.mood)
    : null;
  const priorityOpt = transaction.priority
    ? PRIORITY_OPTIONS.find((o) => o.value === transaction.priority)
    : null;
  const paymentOpt = transaction.paymentMethod
    ? PAYMENT_METHOD_OPTIONS.find((o) => o.value === transaction.paymentMethod)
    : null;

  const tags = parseTags(transaction.tags);

  const flags: Array<{ label: string; color: string }> = [];
  if (transaction.isDebt) flags.push({ label: "Hutang", color: "#ef4444" });
  if (transaction.isReimbursable)
    flags.push({ label: "Reimbursable", color: "#0891b2" });
  if (transaction.isSubscription)
    flags.push({ label: "Langganan", color: "#a855f7" });
  if (transaction.isBusinessExpense)
    flags.push({ label: "Bisnis", color: "#f97316" });
  if (transaction.isTaxDeductible)
    flags.push({ label: "Pajak", color: "#6b7280" });
  if (transaction.isSplit) flags.push({ label: "Split", color: "#14b8a6" });

  const hasFlagsRow = flags.length > 0 || tags.length > 0 || !!transaction.photoUrl;

  function handleDuplicate() {
    duplicateMut.mutate(transaction.id, {
      onSuccess: () => toast.success("Transaksi berhasil diduplikat."),
      onError: (e) => toast.error(e.message ?? "Gagal menduplikat transaksi."),
    });
  }

  function handleTogglePin() {
    pinMut.mutate(transaction.id, {
      onSuccess: (updated) =>
        toast.success(
          updated.isPinned
            ? "Transaksi disematkan."
            : "Sematan dilepas."
        ),
      onError: (e) =>
        toast.error(e.message ?? "Gagal mengubah sematan transaksi."),
    });
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/40 sm:px-4",
        !isFirst && "border-t border-border/60",
      )}
    >
      {/* Category icon (with optional pinned ring) */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: cat ? `${cat.color}1a` : undefined }}
      >
        <LucideIcon
          name={cat?.icon ?? "Circle"}
          className="h-4.5 w-4.5"
          style={{ color: cat?.color }}
        />
      </span>

      {/* Main content */}
      <div className="min-w-0 flex-1">
        {/* Title row: description + mood emoji + priority dot + payment icon + pin */}
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {transaction.description}
          </p>
          {moodOpt && (
            <span
              className="shrink-0 text-xs"
              title={`Mood: ${moodOpt.label}`}
              aria-label={`Mood: ${moodOpt.label}`}
            >
              {moodOpt.emoji}
            </span>
          )}
          {priorityOpt && (
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: priorityOpt.color }}
              title={`Prioritas: ${priorityOpt.label}`}
              aria-label={`Prioritas: ${priorityOpt.label}`}
            />
          )}
          {paymentOpt && (
            <LucideIcon
              name={paymentOpt.icon}
              className="h-3 w-3 shrink-0 text-muted-foreground"
              aria-label={`Pembayaran: ${paymentOpt.label}`}
            />
          )}
          {transaction.isPinned && (
            <Pin
              className="h-3 w-3 shrink-0 fill-primary text-primary"
              aria-label="Disematkan"
            />
          )}
        </div>

        {/* Category + date row */}
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {cat?.name ?? "Tanpa kategori"}
          <span className="mx-1 text-border">·</span>
          {relativeDay(transaction.date)}
        </p>

        {/* Flags row */}
        {hasFlagsRow && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {flags.map((f) => (
              <span
                key={f.label}
                className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none"
                style={{
                  color: f.color,
                  backgroundColor: `${f.color}1a`,
                }}
              >
                {f.label}
              </span>
            ))}
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
            {transaction.photoUrl && (
              <span
                className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground"
                title="Memiliki foto"
              >
                <Camera className="h-3 w-3" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: amount + actions */}
      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              isIncome ? "text-income" : "text-expense"
            )}
          >
            {isIncome ? "+" : "−"}
            {formatCurrency(transaction.amount)}
          </div>
        </div>
        {/* Actions: combine edit + menu into single dropdown to avoid overlap */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
              aria-label="Aksi transaksi"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              onClick={onEdit}
              className="gap-2"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDuplicate}
              disabled={duplicateMut.isPending}
            >
              {duplicateMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              Duplikat
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleTogglePin}
              disabled={pinMut.isPending}
            >
              {pinMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pin className="h-4 w-4" />
              )}
              {transaction.isPinned ? "Lepas Sematan" : "Sematkan"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleToggleHide}
              disabled={hideMut.isPending}
            >
              {hideMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : transaction.isHidden ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {transaction.isHidden ? "Tampilkan" : "Sembunyikan"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast("Detail transaksi")}>
              <Eye className="h-4 w-4" />
              Lihat Detail
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ------------------------------------------------------------------ */
/*  View-mode toggle helpers                                          */
/* ------------------------------------------------------------------ */

function ViewModeBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function TimelineIcon() {
  // Small custom timeline icon (dot + line + dot)
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="4" cy="3" r="1.5" />
      <circle cx="4" cy="11" r="1.5" />
      <line x1="4" y1="4.5" x2="4" y2="9.5" />
      <line x1="6.5" y1="3" x2="11" y2="3" />
      <line x1="6.5" y1="11" x2="11" y2="11" />
    </svg>
  );
}
