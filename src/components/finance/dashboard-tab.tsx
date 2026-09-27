"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
  Coins,
  Flame,
  GraduationCap,
  Leaf,
  ListOrdered,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from "@/components/lucide-icon";
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

const HEMAT_KEY = "dompetku:modeHemat";
const ACADEMIC_KEY = "dompetku:academicMode";
type AcademicMode = "OFF" | "UTS" | "UAS";

export function DashboardTab({ onAdd, onEdit, onViewAll }: Props) {
  // Avoid hydration mismatch — compute greeting on client only.
  const [greeting, setGreeting] = React.useState<string>("");
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  // --- Mode Hemat (persisted to localStorage) ---
  const [modeHemat, setModeHemat] = React.useState(false);
  React.useEffect(() => {
    try {
      setModeHemat(localStorage.getItem(HEMAT_KEY) === "true");
    } catch {
      // ignore — localStorage may be unavailable (SSR / privacy mode)
    }
  }, []);
  const toggleModeHemat = React.useCallback((v: boolean) => {
    setModeHemat(v);
    try {
      localStorage.setItem(HEMAT_KEY, String(v));
    } catch {
      // ignore
    }
  }, []);

  // --- Mode UTS/UAS (persisted, visual indicator only) ---
  const [academicMode, setAcademicMode] = React.useState<AcademicMode>("OFF");
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(ACADEMIC_KEY) as AcademicMode | null;
      if (saved === "UTS" || saved === "UAS" || saved === "OFF") {
        setAcademicMode(saved);
      }
    } catch {
      // ignore
    }
  }, []);
  const cycleAcademicMode = React.useCallback(() => {
    setAcademicMode((prev) => {
      const next: AcademicMode =
        prev === "OFF" ? "UTS" : prev === "UTS" ? "UAS" : "OFF";
      try {
        localStorage.setItem(ACADEMIC_KEY, next);
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

  // ---- Derived: comparison bulan lalu (from analytics) ----
  const monthComparison = analytics?.monthComparison;

  // Top budget (most at-risk) — hide "Hiburan" if Mode Hemat is ON
  const topBudget = React.useMemo(() => {
    const list = modeHemat
      ? budgets.filter((b) => b.category?.name !== "Hiburan")
      : budgets.slice();
    return list.slice().sort((a, b) => b.percentage - a.percentage)[0];
  }, [budgets, modeHemat]);

  const topGoal = React.useMemo(() => {
    return goals
      .slice()
      .sort(
        (a, b) =>
          b.currentAmount / Math.max(b.targetAmount, 1) -
          a.currentAmount / Math.max(a.targetAmount, 1),
      )[0];
  }, [goals]);

  // Academic mode label & color
  const academicBadge = React.useMemo(() => {
    if (academicMode === "UTS")
      return { label: "Mode UTS", color: "bg-amber-500 text-white" };
    if (academicMode === "UAS")
      return { label: "Mode UAS", color: "bg-rose-500 text-white" };
    return null;
  }, [academicMode]);

  return (
    <div className="space-y-4">
      {/* Mode toggles row — Hemat switch + Mode UTS/UAS button */}
      <div className="flex flex-wrap items-center gap-2">
        <Card
          className={cn(
            "flex items-center gap-2 px-3 py-2 transition-colors",
            modeHemat
              ? "border-emerald-500/40 bg-emerald-500/10"
              : "bg-card",
          )}
        >
          <Leaf
            className={cn(
              "h-4 w-4 shrink-0",
              modeHemat ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
            )}
          />
          <span className="text-xs font-medium">Mode Hemat</span>
          <Switch checked={modeHemat} onCheckedChange={toggleModeHemat} aria-label="Mode Hemat" />
        </Card>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={cycleAcademicMode}
          className={cn(
            "h-9 gap-1.5 px-3 text-xs font-medium",
            academicMode === "UTS" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300",
            academicMode === "UAS" && "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
          aria-label="Ganti Mode UTS/UAS"
        >
          <GraduationCap className="h-4 w-4" />
          {academicMode === "OFF"
            ? "Mode Kuliah"
            : academicMode === "UTS"
              ? "Mode UTS"
              : "Mode UAS"}
        </Button>

        {academicBadge && (
          <Badge className={cn("gap-1", academicBadge.color)}>
            <GraduationCap className="h-3 w-3" />
            {academicBadge.label}
          </Badge>
        )}

        {modeHemat && (
          <Badge
            variant="outline"
            className="gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          >
            <Leaf className="h-3 w-3" />
            Hemat aktif
          </Badge>
        )}
      </div>

      {/* Hero — big balance + quick add */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-0 p-5 text-white shadow-xl ring-inner-glow gradient-hero sm:p-6">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white/75">
                  {greeting ? `${greeting} 👋` : "Halo"}
                </p>
                <p className="mt-0.5 text-sm font-medium text-white/90">
                  Sisa uang Anda saat ini
                </p>
              </div>
              <Button
                onClick={onAdd}
                size="sm"
                className="shrink-0 border border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah</span>
              </Button>
            </div>

            <p className="mt-4 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
              {isLoading ? "···" : formatCurrency(summary?.balance ?? 0)}
            </p>

            {/* Income / Expense quick stats */}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur sm:px-3 sm:py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/25 sm:h-9 sm:w-9">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-100 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/65 sm:text-[11px]">
                    Pemasukan
                  </p>
                  <p className="truncate text-xs font-semibold text-emerald-50 sm:text-sm">
                    {isLoading
                      ? "—"
                      : formatCurrencyCompact(summary?.monthIncome ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-2 backdrop-blur sm:px-3 sm:py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-400/25 sm:h-9 sm:w-9">
                  <TrendingDown className="h-3.5 w-3.5 text-rose-100 sm:h-4 sm:w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-white/65 sm:text-[11px]">
                    Pengeluaran
                  </p>
                  <p className="truncate text-xs font-semibold text-rose-50 sm:text-sm">
                    {isLoading
                      ? "—"
                      : formatCurrencyCompact(summary?.monthExpense ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Monthly summary — sisa bulan ini + tx count */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Sisa bulan ini</p>
            <p className="mt-0.5 text-xl font-bold tabular-nums">
              {isLoading
                ? "···"
                : formatCurrency(summary?.monthBalance ?? 0)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-0.5 rounded-lg bg-muted/40 px-3 py-1.5">
            <p className="text-[10px] text-muted-foreground">Transaksi bulan ini</p>
            <p className="text-sm font-semibold tabular-nums">
              {isLoading ? "—" : summary?.monthTransactionCount ?? 0}
            </p>
          </div>
        </div>
      </Card>

      {/* Counter Jajan Harian + Weekly Summary — 2 col grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <CounterJajanCard
          count={todayExpenses.length}
          avg={avgDailyJajan}
          isLoading={rangeLoading}
          academicMode={academicMode}
        />
        <WeeklySummaryCard summary={weeklySummary} isLoading={rangeLoading} />
      </div>

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
  academicMode,
}: {
  count: number;
  avg: number;
  isLoading: boolean;
  academicMode: AcademicMode;
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
              {academicMode === "UTS" || academicMode === "UAS"
                ? "Jajan hari ini"
                : "Counter jajan"}
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
  isLoading,
}: {
  summary: {
    thisIncome: number;
    thisExpense: number;
    lastExpense: number;
    balance: number;
    trendPct: number;
  };
  isLoading: boolean;
}) {
  // Negative trend (less spending) = good (hemat, green)
  // Positive trend (more spending) = bad (boros, red)
  const trend = summary.trendPct;
  const isHemat = trend < 0;
  const isBoros = trend > 0;
  const trendLabel = isHemat
    ? `hemat ${Math.abs(Math.round(trend))}% vs minggu lalu`
    : isBoros
      ? `boros ${Math.round(trend)}% vs minggu lalu`
      : "sama dengan minggu lalu";
  const trendColor = isHemat
    ? "text-emerald-600 dark:text-emerald-400"
    : isBoros
      ? "text-rose-600 dark:text-rose-400"
      : "text-muted-foreground";
  const TrendIcon = isHemat ? ArrowDownRight : isBoros ? ArrowUpRight : Coins;

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
              Income · expense · sisa
            </p>
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
            {Math.abs(Math.round(trend))}%
          </span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="mt-3 h-8 w-40" />
      ) : (
        <>
          <p className="mt-3 text-lg font-bold tabular-nums">
            Sisa {formatCurrencyCompact(summary.balance)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
            +{formatCurrencyCompact(summary.thisIncome)} · −
            {formatCurrencyCompact(summary.thisExpense)}
          </p>
          <p className={cn("mt-0.5 text-[11px]", trendColor)}>{trendLabel}</p>
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
  const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.count)) : 0;
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
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
          {items.map((item, idx) => {
            const pct =
              maxCount > 0 ? Math.max(8, (item.count / maxCount) * 100) : 0;
            return (
              <div
                key={`${item.description}-${idx}`}
                className="relative overflow-hidden rounded-lg border border-border/50 p-2"
              >
                <div
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${pct}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground tabular-nums">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium capitalize text-foreground">
                      {item.description}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {formatCurrencyCompact(item.total)}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="shrink-0 text-[10px] tabular-nums"
                  >
                    {item.count}x
                  </Badge>
                </div>
              </div>
            );
          })}
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
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", statusColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatCurrencyCompact(budget.spent)} / {formatCurrencyCompact(budget.amount)}
      </p>
    </Card>
  );
}

function GoalMiniCard({ goal }: { goal: Goal }) {
  const pct = Math.min(
    100,
    Math.round((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${goal.color}1a`, color: goal.color }}
          >
            <LucideIcon name={goal.icon || "Target"} className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs text-muted-foreground">Target</p>
            <p className="truncate text-sm font-semibold">{goal.name}</p>
          </div>
        </div>
        <Target className="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {formatCurrencyCompact(goal.currentAmount)} /{" "}
        {formatCurrencyCompact(goal.targetAmount)}
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
