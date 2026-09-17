"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Inbox,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateInput,
  formatDateLong,
  getMonthKey,
  getMonthYearLabel,
  getWeekdayMondayFirst,
  parseDateLocal,
  WEEKDAYS_ID,
} from "@/lib/format";
import { useTransactions } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";

// Explicit chart colors (matches analytics/charts pattern)
const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";

interface DayCell {
  date: Date;
  dateKey: string;
}

export function CalendarSection() {
  const now = new Date();
  const [viewDate, setViewDate] = React.useState<Date>(now);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const monthKey = getMonthKey(viewDate);
  const [vy, vm] = monthKey.split("-").map(Number); // vy=YYYY, vm=1-indexed month

  // Compute the calendar grid (leading blanks + days of month + trailing blanks)
  const cells = React.useMemo<(DayCell | null)[]>(() => {
    const firstDay = new Date(vy, vm - 1, 1);
    const daysInMonth = new Date(vy, vm, 0).getDate();
    const leadingBlanks = getWeekdayMondayFirst(firstDay); // 0=Mon
    const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
    const arr: (DayCell | null)[] = [];
    for (let i = 0; i < totalCells; i++) {
      const dayIdx = i - leadingBlanks; // 0-indexed day of month
      if (dayIdx < 0 || dayIdx >= daysInMonth) {
        arr.push(null);
      } else {
        const d = new Date(vy, vm - 1, dayIdx + 1);
        arr.push({ date: d, dateKey: formatDateInput(d) });
      }
    }
    return arr;
  }, [vy, vm]);

  // Fetch all transactions for the viewed month (single network request)
  const monthStart = formatDateInput(new Date(vy, vm - 1, 1));
  const monthEnd = formatDateInput(new Date(vy, vm, 0));
  const { data: monthTransactions, isLoading } = useTransactions({
    from: monthStart,
    to: monthEnd,
  });

  // Group by yyyy-mm-dd for cell summaries
  const byDate = React.useMemo(() => {
    const map = new Map<
      string,
      { income: number; expense: number; count: number }
    >();
    for (const t of monthTransactions ?? []) {
      const key = formatDateInput(parseDateLocal(t.date));
      const entry = map.get(key) ?? { income: 0, expense: 0, count: 0 };
      if (t.type === "INCOME") entry.income += t.amount;
      else entry.expense += t.amount;
      entry.count += 1;
      map.set(key, entry);
    }
    return map;
  }, [monthTransactions]);

  // Max single-day amount for bar scaling
  const maxAmount = React.useMemo(() => {
    let max = 0;
    for (const v of byDate.values()) {
      max = Math.max(max, v.income, v.expense);
    }
    return max;
  }, [byDate]);

  // Month summary
  const monthSummary = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    let count = 0;
    for (const v of byDate.values()) {
      income += v.income;
      expense += v.expense;
      count += v.count;
    }
    return {
      income,
      expense,
      balance: income - expense,
      count,
    };
  }, [byDate]);

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }
  function goToday() {
    setViewDate(new Date());
  }

  const todayKey = formatDateInput(now);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Kalender</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tinjau transaksi harian Anda
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1 self-start sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm font-medium">
            {getMonthYearLabel(viewDate)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToday}
            className="ml-1 h-8 gap-1"
          >
            Hari ini
          </Button>
        </div>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Calendar grid */}
          <Card className="p-3 sm:p-4">
            {/* Weekday header */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS_ID.map((d) => (
                <div
                  key={d}
                  className="py-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {cells.map((cell, idx) => {
                if (!cell) {
                  return (
                    <div
                      key={idx}
                      className="min-h-[72px] sm:min-h-[92px]"
                      aria-hidden
                    />
                  );
                }
                const summary = byDate.get(cell.dateKey) ?? {
                  income: 0,
                  expense: 0,
                  count: 0,
                };
                const isToday = cell.dateKey === todayKey;
                const isSelected = cell.dateKey === selectedDate;
                const hasTx = summary.count > 0;
                const incomeHeight =
                  maxAmount > 0 ? (summary.income / maxAmount) * 100 : 0;
                const expenseHeight =
                  maxAmount > 0 ? (summary.expense / maxAmount) * 100 : 0;
                const net = summary.income - summary.expense;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDate(cell.dateKey)}
                    className={cn(
                      "group flex min-h-[72px] flex-col items-stretch justify-between rounded-lg border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : isToday
                          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                    aria-label={
                      hasTx
                        ? `${cell.dateKey}, ${summary.count} transaksi`
                        : cell.dateKey
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          isToday ? "text-primary" : "text-foreground"
                        )}
                      >
                        {cell.date.getDate()}
                      </span>
                      {hasTx && (
                        <span className="rounded-full bg-muted px-1 text-[9px] font-medium tabular-nums text-muted-foreground">
                          {summary.count}
                        </span>
                      )}
                    </div>

                    {/* Mini bars (income green, expense red) */}
                    {hasTx && (
                      <div className="mt-1 flex h-9 items-end justify-center gap-0.5">
                        {summary.income > 0 && (
                          <div
                            className="w-1.5 rounded-t transition-all sm:w-2"
                            style={{
                              height: `${Math.max(18, incomeHeight)}%`,
                              backgroundColor: INCOME_COLOR,
                            }}
                          />
                        )}
                        {summary.expense > 0 && (
                          <div
                            className="w-1.5 rounded-t transition-all sm:w-2"
                            style={{
                              height: `${Math.max(18, expenseHeight)}%`,
                              backgroundColor: EXPENSE_COLOR,
                            }}
                          />
                        )}
                      </div>
                    )}

                    {/* Compact net amount (hidden if 0) */}
                    {hasTx ? (
                      <p
                        className={cn(
                          "text-center text-[9px] font-medium tabular-nums sm:text-[10px]",
                          net >= 0 ? "text-income" : "text-expense"
                        )}
                      >
                        {net >= 0 ? "+" : "−"}
                        {formatCurrencyCompact(Math.abs(net))}
                      </p>
                    ) : (
                      <div className="h-[9px]" />
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Month summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryStat
              label="Pemasukan"
              value={formatCurrency(monthSummary.income)}
              icon={<TrendingUp className="h-4 w-4" />}
              color="text-income"
            />
            <SummaryStat
              label="Pengeluaran"
              value={formatCurrency(monthSummary.expense)}
              icon={<TrendingDown className="h-4 w-4" />}
              color="text-expense"
            />
            <SummaryStat
              label="Selisih"
              value={formatCurrency(monthSummary.balance)}
              icon={<Wallet className="h-4 w-4" />}
              color={
                monthSummary.balance >= 0 ? "text-income" : "text-expense"
              }
            />
            <SummaryStat
              label="Transaksi"
              value={String(monthSummary.count)}
              icon={<CalendarDays className="h-4 w-4" />}
              color="text-primary"
            />
          </div>
        </motion.div>
      )}

      {/* Day transactions dialog */}
      {selectedDate && (
        <DayTransactionsDialog
          key={selectedDate}
          dateKey={selectedDate}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary stat card (below calendar)
// ---------------------------------------------------------------------------

function SummaryStat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card className="p-3 sm:p-4">
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "mt-1.5 text-sm font-bold tabular-nums sm:text-base",
          color
        )}
      >
        {value}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Day transactions dialog (uses useTransactions with from=to=that day)
// ---------------------------------------------------------------------------

function DayTransactionsDialog({
  dateKey,
  onClose,
}: {
  dateKey: string;
  onClose: () => void;
}) {
  const { data: transactions, isLoading } = useTransactions({
    from: dateKey,
    to: dateKey,
  });

  const list = transactions ?? [];
  const dayIncome = list
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const dayExpense = list
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <Dialog open={true} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {formatDateLong(dateKey)}
          </DialogTitle>
          <DialogDescription>
            {list.length > 0
              ? `${list.length} transaksi pada hari ini`
              : "Tidak ada transaksi pada hari ini"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <Inbox className="h-5 w-5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                Belum ada transaksi
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Hari ini libur transaksi.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Day totals strip */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-income-soft p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Pemasukan
                </p>
                <p className="text-sm font-semibold tabular-nums text-income">
                  {formatCurrency(dayIncome)}
                </p>
              </div>
              <div className="rounded-lg bg-expense-soft p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Pengeluaran
                </p>
                <p className="text-sm font-semibold tabular-nums text-expense">
                  {formatCurrency(dayExpense)}
                </p>
              </div>
              <div className="rounded-lg bg-muted p-2">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Selisih
                </p>
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    dayIncome - dayExpense >= 0
                      ? "text-income"
                      : "text-expense"
                  )}
                >
                  {formatCurrency(dayIncome - dayExpense)}
                </p>
              </div>
            </div>

            {/* Transaction list */}
            <div className="max-h-72 overflow-y-auto custom-scrollbar">
              <div className="divide-y divide-border">
                {list.map((t) => (
                  <DayTransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DayTransactionRow({ transaction }: { transaction: Transaction }) {
  const isIncome = transaction.type === "INCOME";
  const cat = transaction.category;
  return (
    <div className="flex items-center gap-3 px-1 py-2.5">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: cat ? `${cat.color}1a` : undefined }}
      >
        <LucideIcon
          name={cat?.icon ?? "Circle"}
          className="h-4 w-4"
          style={{ color: cat?.color }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.description}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {cat?.name ?? "Tanpa kategori"}
          {transaction.merchant ? ` · ${transaction.merchant}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-semibold tabular-nums",
          isIncome ? "text-income" : "text-expense"
        )}
      >
        {isIncome ? "+" : "−"}
        {formatCurrency(transaction.amount)}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
          {WEEKDAYS_ID.map((d) => (
            <Skeleton key={d} className="h-6 rounded" />
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-7 gap-1 sm:gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <Skeleton key={i} className="min-h-[72px] sm:min-h-[92px]" />
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
