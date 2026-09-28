"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDateInput,
  getMonthYearLabel,
  parseDateLocal,
  relativeDay,
  WEEKDAYS_ID,
  getWeekdayMondayFirst,
} from "@/lib/format";
import { useTransactions } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Returns the intensity class based on the day's spending amount (IDR). */
function getIntensityClass(amount: number): string {
  if (amount <= 0) return "bg-muted/40 dark:bg-muted/30";
  if (amount < 20_000) return "bg-emerald-200 dark:bg-emerald-500/50";
  if (amount < 100_000) return "bg-amber-300 dark:bg-amber-500/60";
  if (amount < 500_000) return "bg-orange-400 dark:bg-orange-500/70";
  return "bg-rose-500 dark:bg-rose-600/80";
}

interface DayCell {
  date: Date | null;
  dateKey: string;
}

/** Build calendar cells for a given month. Monday-first. */
function getMonthCells(year: number, month0: number): DayCell[] {
  const firstDay = new Date(year, month0, 1);
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const leadingBlanks = getWeekdayMondayFirst(firstDay); // 0=Monday
  const totalCells = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const arr: DayCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const dayIdx = i - leadingBlanks;
    if (dayIdx < 0 || dayIdx >= daysInMonth) {
      arr.push({ date: null, dateKey: "" });
    } else {
      const d = new Date(year, month0, dayIdx + 1);
      arr.push({ date: d, dateKey: formatDateInput(d) });
    }
  }
  return arr;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function HeatmapCalendar({ onEdit }: { onEdit: (t: Transaction) => void }) {
  const today = React.useMemo(() => new Date(), []);
  const [viewDate, setViewDate] = React.useState<Date>(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);

  const vy = viewDate.getFullYear();
  const vm = viewDate.getMonth();

  // For streak: fetch last 90 days from today (in addition to the viewed month)
  const streakStart = React.useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 89);
    return formatDateInput(d);
  }, [today]);
  const streakEnd = formatDateInput(today);

  // For the current month heatmap
  const monthStart = formatDateInput(new Date(vy, vm, 1));
  const monthEnd = formatDateInput(new Date(vy, vm + 1, 0));

  // Fetch the wider range — covers both streak + viewed month
  const fetchFrom = streakStart < monthStart ? streakStart : monthStart;
  const fetchTo = streakEnd > monthEnd ? streakEnd : monthEnd;

  const { data: allTx, isLoading } = useTransactions({
    from: fetchFrom,
    to: fetchTo,
    limit: 500,
  });

  // Expenses grouped by yyyy-mm-dd (last 90 days — for streak + avg)
  const expensesByDate = React.useMemo(() => {
    const map = new Map<string, number>();
    if (!allTx) return map;
    for (const t of allTx) {
      if (t.type !== "EXPENSE") continue;
      const dStr = formatDateInput(parseDateLocal(t.date));
      map.set(dStr, (map.get(dStr) ?? 0) + t.amount);
    }
    return map;
  }, [allTx]);

  // Average daily expense (over the last 90 days, only counting days with expenses)
  const avgDailyExpense = React.useMemo(() => {
    if (expensesByDate.size === 0) return 0;
    const total = Array.from(expensesByDate.values()).reduce((a, b) => a + b, 0);
    return total / expensesByDate.size;
  }, [expensesByDate]);

  // Streak: consecutive days (from today backwards) where spending < avg (or no expense)
  const hematStreak = React.useMemo(() => {
    if (avgDailyExpense <= 0) return 0;
    let streak = 0;
    const cursor = new Date(today);
    cursor.setHours(0, 0, 0, 0);
    while (true) {
      const key = formatDateInput(cursor);
      const spent = expensesByDate.get(key) ?? 0;
      if (spent <= avgDailyExpense) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }, [avgDailyExpense, expensesByDate, today]);

  const cells = React.useMemo(() => getMonthCells(vy, vm), [vy, vm]);

  const todayStr = formatDateInput(today);

  // Transactions for the selected day
  const selectedDayTx = React.useMemo(() => {
    if (!selectedDate || !allTx) return [];
    return allTx
      .filter((t) => formatDateInput(parseDateLocal(t.date)) === selectedDate)
      .slice()
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [selectedDate, allTx]);

  const selectedDayExpense = React.useMemo(() => {
    return selectedDayTx
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
  }, [selectedDayTx]);

  const selectedDayIncome = React.useMemo(() => {
    return selectedDayTx
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
  }, [selectedDayTx]);

  function goPrevMonth() {
    setViewDate(new Date(vy, vm - 1, 1));
  }
  function goNextMonth() {
    setViewDate(new Date(vy, vm + 1, 1));
  }

  // Whether the "next" button should be disabled (can't go past current month)
  const isAtCurrentMonth =
    vy === today.getFullYear() && vm === today.getMonth();

  return (
    <Card className="p-4">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Flame className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              Heatmap Pengeluaran
            </p>
            <p className="truncate text-sm font-semibold">
              {getMonthYearLabel(viewDate)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={goPrevMonth}
            className="h-7 w-7"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={goNextMonth}
            disabled={isAtCurrentMonth}
            className="h-7 w-7"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Streak counter */}
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-orange-500/5 px-3 py-2">
        <span className="text-base">🔥</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground">
            {hematStreak} hari hemat
          </p>
          <p className="text-[10px] text-muted-foreground">
            Rata-rata harian: {formatCurrency(Math.round(avgDailyExpense))}
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : (
        <>
          {/* Day-of-week header */}
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {WEEKDAYS_ID.map((d) => (
              <div
                key={d}
                className="text-center text-[9px] font-medium text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (!cell.date) {
                return <div key={`empty-${i}`} className="flex justify-center">
                  <div className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </div>;
              }
              const spent = expensesByDate.get(cell.dateKey) ?? 0;
              const isToday = cell.dateKey === todayStr;
              const isSelected = cell.dateKey === selectedDate;
              return (
                <div key={cell.dateKey} className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedDate(cell.dateKey)}
                    className={cn(
                      "h-3.5 w-3.5 rounded-sm transition-all hover:scale-125 hover:ring-2 hover:ring-primary/40 sm:h-4 sm:w-4",
                      getIntensityClass(spent),
                      isToday && "ring-1 ring-primary",
                      isSelected && "ring-2 ring-primary",
                    )}
                    title={`${cell.dateKey}: ${formatCurrency(spent)}`}
                    aria-label={`${cell.dateKey}: ${formatCurrency(spent)}`}
                  />
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
            <span className="font-medium">Hemat</span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-muted/40" />
              <span>Kosong</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" />
              <span>&lt;20rb</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-amber-300" />
              <span>20-100rb</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
              <span>100-500rb</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />
              <span>&gt;500rb</span>
            </span>
          </div>
        </>
      )}

      {/* Bottom sheet for selected day */}
      <Sheet
        open={!!selectedDate}
        onOpenChange={(o) => !o && setSelectedDate(null)}
      >
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-base">
              {selectedDate ? relativeDay(selectedDate) : ""}
            </SheetTitle>
            <SheetDescription>
              {selectedDayTx.length} transaksi ·{" "}
              {selectedDayExpense > 0 && (
                <span className="text-expense">
                  −{formatCurrency(selectedDayExpense)}
                </span>
              )}
              {selectedDayExpense > 0 && selectedDayIncome > 0 && " · "}
              {selectedDayIncome > 0 && (
                <span className="text-income">
                  +{formatCurrency(selectedDayIncome)}
                </span>
              )}
              {selectedDayTx.length === 0 && "Tidak ada transaksi"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-1 px-4 pb-6">
            {selectedDayTx.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                Tidak ada transaksi pada hari ini.
              </p>
            ) : (
              selectedDayTx.map((t) => {
                const isIncome = t.type === "INCOME";
                const cat = t.category;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedDate(null);
                      onEdit(t);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: cat ? `${cat.color}1a` : undefined,
                      }}
                    >
                      <LucideIcon
                        name={cat?.icon ?? "Circle"}
                        className="h-4 w-4"
                        style={{ color: cat?.color }}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.description}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {cat?.name ?? "—"}
                        {t.merchant ? ` · ${t.merchant}` : ""}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 text-sm font-semibold tabular-nums",
                        isIncome ? "text-income" : "text-expense",
                      )}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
