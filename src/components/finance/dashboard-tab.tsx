"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Coins,
  Eye,
  EyeOff,
  Flame,
  ListOrdered,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import {
  AnimatedNumber,
  DonutChart,
  MiniBarChart,
  ProgressRing,
  Sparkline,
} from "@/components/finance/chart-widgets";
import { cn } from "@/lib/utils";
import {
  addDays,
  formatCurrency,
  formatCurrencyCompact,
  formatDateInput,
  getGreeting,
  getMonthKey,
  parseDateLocal,
  relativeDay,
} from "@/lib/format";
import {
  useAnalytics,
  useDashboard,
  useTransactions,
} from "@/lib/hooks";
import type { BudgetStatus, Goal, Transaction } from "@/lib/types";

interface Props {
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onViewAll: () => void;
}

export function DashboardTab({ onAdd, onEdit, onViewAll }: Props) {
  // Avoid hydration mismatch — compute greeting on client only.
  const [greeting, setGreeting] = React.useState<string>("");
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // Show/hide balance toggle (persisted to localStorage)
  const [showBalance, setShowBalance] = React.useState(true);
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("dompetku:showBalance");
      if (saved !== null) setShowBalance(saved !== "false");
    } catch {
      // ignore
    }
  }, []);
  const toggleBalance = React.useCallback(() => {
    setShowBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dompetku:showBalance", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);
  const { data: analytics } = useAnalytics(monthKey);

  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];
  const budgets = data?.budgetStatuses ?? [];
  const goals = data?.goals ?? [];

  // Fetch current month's transactions for Top 5 jajan + counter jajan today.
  const today = React.useMemo(() => new Date(), []);
  const monthStartStr = React.useMemo(() => {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    return formatDateInput(d);
  }, [today]);
  const todayStr = React.useMemo(() => formatDateInput(today), [today]);

  // For weekly summary trend + last 14-day avg jajan counter:
  // fetch from min(monthStart, lastWeekMonday) to today.
  const lastWeekMondayStr = React.useMemo(() => {
    const dayIdx = (today.getDay() + 6) % 7; // 0 = Monday
    const thisMonday = addDays(today, -dayIdx);
    const lastMonday = addDays(thisMonday, -7);
    return formatDateInput(lastMonday);
  }, [today]);
  const fetchFromStr = monthStartStr < lastWeekMondayStr ? monthStartStr : lastWeekMondayStr;

  const { data: rangeTx, isLoading: rangeLoading } = useTransactions({
    from: fetchFromStr,
    to: todayStr,
    limit: 500,
  });

  // ---- Derived: today's EXPENSE transactions ----
  const todayExpenses = React.useMemo(() => {
    if (!rangeTx) return [];
    return rangeTx.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      const d = parseDateLocal(t.date);
      const td = parseDateLocal(todayStr);
      return (
        d.getFullYear() === td.getFullYear() &&
        d.getMonth() === td.getMonth() &&
        d.getDate() === td.getDate()
      );
    });
  }, [rangeTx, todayStr]);

  // ---- Derived: avg daily jajan count (last 14 days) ----
  const avgDailyJajan = React.useMemo(() => {
    if (!rangeTx) return 0;
    const countsByDay = new Map<string, number>();
    const start = addDays(parseDateLocal(todayStr), -13);
    start.setHours(0, 0, 0, 0);
    for (let i = 0; i < 14; i++) {
      const d = addDays(start, i);
      countsByDay.set(formatDateInput(d), 0);
    }
    for (const t of rangeTx) {
      if (t.type !== "EXPENSE") continue;
      const d = parseDateLocal(t.date);
      if (d < start) continue;
      const key = formatDateInput(d);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
    }
    const total = Array.from(countsByDay.values()).reduce((a, b) => a + b, 0);
    return total / 14;
  }, [rangeTx, todayStr]);

  // ---- Derived: Top 5 jajan favorit (this month) ----
  const top5Jajan = React.useMemo(() => {
    if (!rangeTx) return [] as Array<{ description: string; count: number; total: number }>;
    const monthStart = parseDateLocal(monthStartStr);
    const map = new Map<string, { count: number; total: number }>();
    for (const t of rangeTx) {
      if (t.type !== "EXPENSE") continue;
      const d = parseDateLocal(t.date);
      if (d < monthStart) continue;
      const key = (t.description || "").trim().toLowerCase();
      if (!key) continue;
      const cur = map.get(key) ?? { count: 0, total: 0 };
      cur.count += 1;
      cur.total += t.amount;
      map.set(key, cur);
    }
    return Array.from(map.entries())
      .map(([description, v]) => ({
        description,
        count: v.count,
        total: v.total,
      }))
      .sort((a, b) => b.count - a.count || b.total - a.total)
      .slice(0, 5);
  }, [rangeTx, monthStartStr]);

  // ---- Derived: Weekly summary (this week vs last week) ----
  const weeklySummary = React.useMemo(() => {
    const empty = {
      thisIncome: 0,
      thisExpense: 0,
      lastExpense: 0,
      balance: 0,
      trendPct: 0, // negative = hemat (good), positive = boros (bad)
    };
    if (!rangeTx) return empty;
    const dayIdx = (today.getDay() + 6) % 7; // 0 = Monday
    const thisMonday = addDays(today, -dayIdx);
    thisMonday.setHours(0, 0, 0, 0);
    const lastMonday = addDays(thisMonday, -7);
    const lastSunday = addDays(thisMonday, -1);
    lastSunday.setHours(23, 59, 59, 999);

    let thisIncome = 0;
    let thisExpense = 0;
    let lastExpense = 0;

    for (const t of rangeTx) {
      const d = parseDateLocal(t.date);
      if (d >= thisMonday) {
        if (t.type === "INCOME") thisIncome += t.amount;
        else thisExpense += t.amount;
      } else if (d >= lastMonday && d <= lastSunday) {
        if (t.type === "EXPENSE") lastExpense += t.amount;
      }
    }
    const trendPct =
      lastExpense > 0
        ? ((thisExpense - lastExpense) / lastExpense) * 100
        : thisExpense > 0
          ? -100
          : 0;
    return {
      thisIncome,
      thisExpense,
      lastExpense,
      balance: thisIncome - thisExpense,
      trendPct,
    };
  }, [rangeTx, today]);

  // ---- Derived: 14-day sparkline data (expenses per day) ----
  const sparklineData = React.useMemo(() => {
    if (!rangeTx) return [] as number[];
    const todayDate = parseDateLocal(todayStr);
    const days: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = addDays(todayDate, -i);
      const dStr = formatDateInput(d);
      const total = rangeTx
        .filter((t) => {
          if (t.type !== "EXPENSE") return false;
          return t.date.startsWith(dStr);
        })
        .reduce((s, t) => s + t.amount, 0);
      days.push(total);
    }
    return days;
  }, [rangeTx, todayStr]);

  // ---- Derived: weekly mini bar chart data (7 hari, Sen-Min) ----
  const weeklyBarData = React.useMemo(() => {
    if (!rangeTx) return [];
    const todayDate = parseDateLocal(todayStr);
    const labels = ["Sn", "Sl", "Rb", "Km", "Jm", "Sb", "Mg"];
    const todayDay = (todayDate.getDay() + 6) % 7; // 0=Sen
    const result: { label: string; value: number; isToday?: boolean }[] = [];
    // start from last Monday
    const monday = addDays(todayDate, -todayDay);
    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i);
      const dStr = formatDateInput(d);
      const total = rangeTx
        .filter((t) => {
          if (t.type !== "EXPENSE") return false;
          return t.date.startsWith(dStr);
        })
        .reduce((s, t) => s + t.amount, 0);
      result.push({
        label: labels[i],
        value: total,
        isToday: i === todayDay,
      });
    }
    return result;
  }, [rangeTx, todayStr]);

  // ---- Derived: comparison bulan lalu (from analytics) ----
  const monthComparison = analytics?.monthComparison;

  // Top budget (most at-risk)
  const topBudget = React.useMemo(() => {
    return budgets.slice().sort((a, b) => b.percentage - a.percentage)[0];
  }, [budgets]);

  const topGoal = React.useMemo(() => {
    return goals
      .slice()
      .sort(
        (a, b) =>
          b.currentAmount / Math.max(b.targetAmount, 1) -
          a.currentAmount / Math.max(a.targetAmount, 1),
      )[0];
  }, [goals]);

  return (
    <div className="space-y-4">
      {/* Hero — glassmorphism card with sparkline + hide/show balance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-0 p-5 text-white shadow-2xl shadow-emerald-900/20 gradient-hero sm:p-6">
          {/* Decorative orbs */}
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 right-20 h-40 w-40 rounded-full bg-white/5 blur-xl" />
          {/* Sparkline in background */}
          {sparklineData.length > 0 && !isLoading && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 opacity-70">
              <Sparkline
                data={sparklineData}
                width={400}
                height={100}
                className="h-full w-full"
                strokeClassName="stroke-white/80"
                fillClassName="fill-white/15"
                strokeWidth={2.5}
              />
            </div>
          )}
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/70">
                  {greeting ? `${greeting} 👋` : "Halo"}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-white/90">
                  Total saldo
                  <button
                    onClick={toggleBalance}
                    className="text-white/60 transition-colors hover:text-white"
                    aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
                  >
                    {showBalance ? (
                      <Eye className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff className="h-3.5 w-3.5" />
                    )}
                  </button>
                </p>
              </div>
              <Button
                onClick={onAdd}
                size="sm"
                className="shrink-0 border border-white/20 bg-white/15 text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah</span>
              </Button>
            </div>

            <div className="mt-4">
              {isLoading ? (
                <p className="text-3xl font-bold tracking-tight sm:text-4xl">···</p>
              ) : showBalance ? (
                <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  <span className="text-lg font-semibold text-white/70 sm:text-xl">Rp </span>
                  <AnimatedNumber
                    value={summary?.balance ?? 0}
                    format={(n) => n.toLocaleString("id-ID")}
                  />
                </p>
              ) : (
                <p className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  •••••••
                </p>
              )}
            </div>

            {/* Income / Expense quick stats — glass pills */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-md transition-colors hover:bg-white/15 sm:py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-400/25 sm:h-9 sm:w-9">
                  <TrendingUp className="h-4 w-4 text-emerald-100 sm:h-4.5 sm:w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/65 sm:text-[11px]">
                    Pemasukan
                  </p>
                  <p className="truncate text-xs font-semibold text-emerald-50 sm:text-sm">
                    {isLoading
                      ? "—"
                      : showBalance
                        ? formatCurrencyCompact(summary?.monthIncome ?? 0)
                        : "•••"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-md transition-colors hover:bg-white/15 sm:py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-400/25 sm:h-9 sm:w-9">
                  <TrendingDown className="h-4 w-4 text-rose-100 sm:h-4.5 sm:w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/65 sm:text-[11px]">
                    Pengeluaran
                  </p>
                  <p className="truncate text-xs font-semibold text-rose-50 sm:text-sm">
                    {isLoading
                      ? "—"
                      : showBalance
                        ? formatCurrencyCompact(summary?.monthExpense ?? 0)
                        : "•••"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Bento Grid — Sisa Bulan + Transaksi count + Quick stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="col-span-2 p-4 sm:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Sisa bulan ini</p>
              <p className="mt-0.5 text-xl font-bold tabular-nums sm:text-2xl">
                {isLoading
                  ? "···"
                  : showBalance
                    ? formatCurrency(summary?.monthBalance ?? 0)
                    : "••••••"}
              </p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                Pemasukan − pengeluaran bulan ini
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5 rounded-xl bg-muted/50 px-3 py-2">
              <p className="text-[10px] text-muted-foreground">Transaksi</p>
              <p className="text-base font-bold tabular-nums">
                {isLoading ? "—" : summary?.monthTransactionCount ?? 0}
              </p>
            </div>
          </div>
        </Card>
        {/* Mini stat: avg/day */}
        <Card className="p-3">
          <div className="flex flex-col gap-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10">
              <Flame className="h-3.5 w-3.5 text-orange-500" />
            </span>
            <p className="text-[10px] text-muted-foreground">Rata-rata/hari</p>
            <p className="truncate text-sm font-bold tabular-nums">
              {rangeLoading
                ? "—"
                : showBalance
                  ? formatCurrencyCompact(
                      Math.round(
                        (summary?.monthExpense ?? 0) /
                          Math.max(new Date().getDate(), 1),
                      ),
                    )
                  : "•••"}
            </p>
          </div>
        </Card>
        {/* Mini stat: savings rate */}
        <Card className="p-3">
          <div className="flex flex-col gap-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </span>
            <p className="text-[10px] text-muted-foreground">Tingkat tabung</p>
            <p className="truncate text-sm font-bold tabular-nums">
              {isLoading
                ? "—"
                : `${Math.round((summary?.savingsRate ?? 0) * 100)}%`}
            </p>
          </div>
        </Card>
      </div>

      {/* Counter Jajan Harian + Weekly Summary — 2 col grid */}
      {todayExpenses.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CounterJajanCard
            count={todayExpenses.length}
            avg={avgDailyJajan}
            isLoading={rangeLoading}
          />
          <WeeklySummaryCard
            summary={weeklySummary}
            barData={weeklyBarData}
            isLoading={rangeLoading}
          />
        </div>
      )}
      {todayExpenses.length === 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <WeeklySummaryCard
            summary={weeklySummary}
            barData={weeklyBarData}
            isLoading={rangeLoading}
          />
        </div>
      )}

      {/* Comparison Bulan Lalu + Top 5 Jajan Favorit — 2 col grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ComparisonBulanLaluCard
          current={monthComparison?.current.expense ?? 0}
          previous={monthComparison?.previous.expense ?? 0}
          changePct={monthComparison?.expenseChange ?? 0}
          isLoading={isLoading}
        />
        <Top5JajanCard items={top5Jajan} isLoading={rangeLoading} />
      </div>

      {/* Budget + Goals — conditional, grid layout on sm+ */}
      {(topBudget || topGoal) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topBudget && <BudgetMiniCard budget={topBudget} />}
          {topGoal && <GoalMiniCard goal={topGoal} />}
        </div>
      )}

      {/* Recent transactions */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Transaksi Terbaru</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              6 transaksi terakhir Anda
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onViewAll} className="gap-1">
            Lihat semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyTransactions onAdd={onAdd} />
        ) : (
          <div className="-mx-1">
            {recent.slice(0, 6).map((t, idx) => {
              const isIncome = t.type === "INCOME";
              const cat = t.category;
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className={cn(
                    "group flex w-full items-center gap-3 px-1 py-1 text-left transition-colors hover:bg-muted/50",
                    idx > 0 && "border-t border-border/60",
                  )}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
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
                      {t.description}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {cat?.name} · {relativeDay(t.date)}
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
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Counter Jajan Harian — small card                                */
/* ------------------------------------------------------------------ */

function CounterJajanCard({
  count,
  avg,
  isLoading,
}: {
  count: number;
  avg: number;
  isLoading: boolean;
}) {
  const avgRounded = Math.round(avg * 10) / 10;
  const diff = count - avg;
  const diffLabel =
    Math.abs(diff) < 0.1
      ? "sesuai rata-rata"
      : diff > 0
        ? `+${Math.round(diff)}x dari biasanya`
        : `${Math.round(diff)}x dari biasanya`;
  const diffColor =
    Math.abs(diff) < 0.1
      ? "text-muted-foreground"
      : diff > 0
        ? "text-rose-600 dark:text-rose-400"
        : "text-emerald-600 dark:text-emerald-400";

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
            <Flame className="h-4 w-4 text-orange-500" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              Counter jajan
            </p>
            <p className="text-[11px] text-muted-foreground/70">Hari ini</p>
          </div>
        </div>
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-24" />
      ) : (
        <>
          <p className="mt-3 text-2xl font-bold tabular-nums">
            {count}
            <span className="ml-1 text-sm font-medium text-muted-foreground">x</span>
          </p>
          <p className={cn("mt-0.5 text-[11px] tabular-nums", diffColor)}>
            Biasanya {avgRounded}x/hari · {diffLabel}
          </p>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Weekly Summary — compact card with trend arrow                    */
/* ------------------------------------------------------------------ */

function WeeklySummaryCard({
  summary,
  barData,
  isLoading,
}: {
  summary: {
    thisIncome: number;
    thisExpense: number;
    lastExpense: number;
    balance: number;
    trendPct: number;
  };
  barData: { label: string; value: number; isToday?: boolean }[];
  isLoading: boolean;
}) {
  // Negative trend (less spending) = good (hemat, green)
  // Positive trend (more spending) = bad (boros, red)
  const trend = summary.trendPct;
  const isHemat = trend < 0;
  const isBoros = trend > 0;
  const isBalanceZero = summary.balance <= 0;
  const trendLabel = isHemat
    ? `Hemat ${Math.abs(Math.round(trend))}% vs minggu lalu 🎉`
    : isBoros
      ? `Boros ${Math.round(trend)}% — cek pengeluaran`
      : "Sama dengan minggu lalu";
  // Balance warning overrides trend color when sisa = 0 (or negative)
  const trendColor = isBalanceZero
    ? "text-rose-600 dark:text-rose-400"
    : isHemat
      ? "text-emerald-600 dark:text-emerald-400"
      : isBoros
        ? "text-rose-600 dark:text-rose-400"
        : "text-muted-foreground";
  const TrendIcon = isBalanceZero
    ? TriangleAlert
    : isHemat
      ? ArrowDownRight
      : isBoros
        ? ArrowUpRight
        : Coins;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CalendarRange className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">Minggu ini</p>
            <p className="text-[11px] text-muted-foreground/70">
              Sisa {formatCurrencyCompact(summary.balance)}
            </p>
          </div>
        </div>
        {!isLoading && (isHemat || isBoros || isBalanceZero) && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
              trendColor,
              isHemat && "bg-emerald-500/10",
              isBoros && "bg-rose-500/10",
              isBalanceZero && "bg-rose-500/10",
            )}
          >
            <TrendIcon className="h-3 w-3" />
            {isBalanceZero ? "Rp0" : `${Math.abs(Math.round(trend))}%`}
          </span>
        )}
      </div>
      {isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                isBalanceZero && "text-rose-600 dark:text-rose-400",
              )}
            >
              {formatCurrencyCompact(summary.balance)}
            </p>
            <span className="text-[10px] text-muted-foreground">
              +{formatCurrencyCompact(summary.thisIncome)} · −
              {formatCurrencyCompact(summary.thisExpense)}
            </span>
          </div>
          {/* Mini bar chart — 7 hari */}
          {barData.length > 0 && (
            <div className="mt-3">
              <MiniBarChart
                data={barData}
                height={48}
                barColorActive="bg-primary"
                barColorDim="bg-muted-foreground/25"
              />
            </div>
          )}
          <p className={cn("mt-2 text-[11px] font-medium", trendColor)}>
            {trendLabel}
          </p>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Bulan Lalu — small card                                */
/* ------------------------------------------------------------------ */

function ComparisonBulanLaluCard({
  current,
  previous,
  changePct,
  isLoading,
}: {
  current: number;
  previous: number;
  changePct: number;
  isLoading: boolean;
}) {
  // Negative change = less spending = hemat (green)
  // Positive change = more spending = boros (red)
  const diff = previous - current; // positive = hemat
  const isHemat = diff > 0 && previous > 0;
  const isBoros = diff < 0 && previous > 0;
  const pct = Math.abs(Math.round(changePct));
  const cardClass = isHemat
    ? "border-emerald-500/30 bg-emerald-500/[0.04]"
    : isBoros
      ? "border-rose-500/30 bg-rose-500/[0.04]"
      : "";
  const TrendIcon = isHemat ? ArrowDownRight : isBoros ? ArrowUpRight : Coins;
  const trendColor = isHemat
    ? "text-emerald-600 dark:text-emerald-400"
    : isBoros
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";

  return (
    <Card className={cn("p-4", cardClass)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CalendarRange className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              Bulan ini vs lalu
            </p>
            <p className="text-[11px] text-muted-foreground/70">Pengeluaran</p>
          </div>
        </div>
        {!isLoading && (isHemat || isBoros) && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-0.5 text-xs font-medium tabular-nums",
              trendColor,
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {pct}%
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-44" />
      ) : (
        <>
          <p
            className={cn(
              "mt-3 text-sm font-semibold tabular-nums",
              isHemat && "text-emerald-600 dark:text-emerald-400",
              isBoros && "text-rose-600 dark:text-rose-400",
            )}
          >
            {isHemat
              ? `Hemat ${formatCurrencyCompact(diff)}`
              : isBoros
                ? `Boros ${formatCurrencyCompact(Math.abs(diff))}`
                : "Sama dengan bulan lalu"}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            {formatCurrencyCompact(current)} vs{" "}
            {formatCurrencyCompact(previous)}
          </p>
        </>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Top 5 Jajan Favorit — mini list                                   */
/* ------------------------------------------------------------------ */

function Top5JajanCard({
  items,
  isLoading,
}: {
  items: Array<{ description: string; count: number; total: number }>;
  isLoading: boolean;
}) {
  // Colors for donut slices
  const sliceColors = [
    "#10b981", // emerald-500
    "#3b82f6", // blue-500
    "#f59e0b", // amber-500
    "#ec4899", // pink-500
    "#8b5cf6", // violet-500
  ];
  const donutData = items.slice(0, 5).map((item, i) => ({
    label: item.description,
    value: item.total,
    color: sliceColors[i % sliceColors.length],
  }));
  const totalSpent = donutData.reduce((s, d) => s + d.value, 0);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <ListOrdered className="h-4 w-4 text-primary" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">
              Top 5 jajan favorit
            </p>
            <p className="text-[11px] text-muted-foreground/70">Bulan ini</p>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Belum ada jajan bulan ini.
          </p>
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Donut chart */}
          <div className="flex flex-col items-center gap-2">
            <DonutChart
              data={donutData}
              size={96}
              strokeWidth={14}
              centerValue={formatCurrencyCompact(totalSpent)}
              centerLabel="total"
            />
          </div>
          {/* List compact */}
          <div className="flex-1 space-y-1.5">
            {items.slice(0, 5).map((item, idx) => (
              <div key={`${item.description}-${idx}`} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: sliceColors[idx % sliceColors.length] }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium capitalize text-foreground">
                    {item.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatCurrencyCompact(item.total)} · {item.count}x
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Existing mini cards (kept)                                        */
/* ------------------------------------------------------------------ */

function BudgetMiniCard({ budget }: { budget: BudgetStatus }) {
  const pct = Math.min(100, Math.round(budget.percentage));
  const statusColor =
    budget.status === "over"
      ? "bg-rose-500"
      : budget.status === "danger"
        ? "bg-rose-400"
        : budget.status === "warning"
          ? "bg-amber-400"
          : "bg-emerald-500";
  // Proyeksi pace: linear extrapolation sampai akhir bulan
  const today = new Date();
  const dayOfMonth = today.getDate();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const projectedPct = Math.min(150, Math.round((budget.spent / Math.max(budget.amount, 1)) * (daysInMonth / Math.max(dayOfMonth, 1)) * 100));
  const projectedSpent = Math.round((budget.spent / Math.max(dayOfMonth, 1)) * daysInMonth);
  const willExceed = projectedSpent > budget.amount;
  const daysLeft = daysInMonth - dayOfMonth;
  const remainingAmount = Math.max(0, budget.amount - budget.spent);

  // Smart label
  let smartLabel = "";
  if (budget.status === "over") {
    smartLabel = `⚠️ Lewat ${formatCurrencyCompact(budget.spent - budget.amount)}`;
  } else if (willExceed) {
    smartLabel = `⚠️ Proyeksi: habis ${formatCurrencyCompact(projectedSpent - budget.amount)} lebih`;
  } else if (daysLeft > 0) {
    smartLabel = `Sisa ${formatCurrencyCompact(remainingAmount)} untuk ${daysLeft} hari`;
  } else {
    smartLabel = `Aman sampai akhir bulan`;
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${budget.category.color}1a`,
              color: budget.category.color,
            }}
          >
            <LucideIcon name={budget.category.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">Anggaran</p>
            <p className="truncate text-sm font-semibold">
              {budget.category.name}
            </p>
          </div>
        </div>
        <ProgressRing
          percentage={pct}
          size={36}
          strokeWidth={3}
          color={
            budget.status === "over" || budget.status === "danger"
              ? "stroke-rose-500"
              : budget.status === "warning"
                ? "stroke-amber-400"
                : "stroke-emerald-500"
          }
        >
          <span className="text-[10px] font-bold tabular-nums">{pct}%</span>
        </ProgressRing>
      </div>
      <div className="mt-3 space-y-1">
        {/* Actual bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className={cn("h-full rounded-full", statusColor)}
          />
        </div>
        {/* Projection ghost bar */}
        <div className="h-0.5 w-full overflow-hidden rounded-full bg-muted/30">
          <div
            className={cn("h-full rounded-full opacity-40", willExceed ? "bg-rose-400" : "bg-emerald-400")}
            style={{ width: `${Math.min(projectedPct, 100)}%` }}
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {formatCurrencyCompact(budget.spent)} / {formatCurrencyCompact(budget.amount)}
        </p>
        <p
          className={cn(
            "text-[10px] font-medium",
            willExceed || budget.status === "over"
              ? "text-rose-600 dark:text-rose-400"
              : "text-muted-foreground",
          )}
        >
          {smartLabel}
        </p>
      </div>
    </Card>
  );
}

function GoalMiniCard({ goal }: { goal: Goal }) {
  const pct = Math.min(
    100,
    Math.round((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const isCompleted = goal.completed || pct >= 100;
  // Gamified badge level
  const level =
    pct >= 100 ? "🏆" : pct >= 75 ? "🥇" : pct >= 50 ? "🥈" : pct >= 25 ? "🥉" : "🌱";

  return (
    <Card className="relative overflow-hidden p-4">
      {isCompleted && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent" />
      )}
      <div className="relative flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
          >
            <LucideIcon name={goal.icon || "Target"} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <span>{level}</span>
              <span>Target</span>
            </p>
            <p className="truncate text-sm font-semibold">{goal.name}</p>
          </div>
        </div>
        <ProgressRing
          percentage={pct}
          size={36}
          strokeWidth={3}
          color="stroke-primary"
        >
          <span className="text-[10px] font-bold tabular-nums">{pct}%</span>
        </ProgressRing>
      </div>
      <div className="relative mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full bg-primary"
        />
      </div>
      <p className="relative mt-2 text-[10px] font-medium text-muted-foreground">
        {isCompleted
          ? "🎉 Target tercapai!"
          : `Sisa ${formatCurrencyCompact(remaining)} lagi`}
      </p>
    </Card>
  );
}

function EmptyTransactions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Sparkles className="h-5 w-5 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium">Belum ada transaksi</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Mulai catat pemasukan & pengeluaran pertama Anda.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-1 gap-1">
        <Plus className="h-4 w-4" />
        Tambah Transaksi
      </Button>
    </div>
  );
}
