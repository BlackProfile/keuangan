"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarRange,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  getGreeting,
  getMonthKey,
  relativeDay,
} from "@/lib/format";
import { useAnalytics, useDashboard } from "@/lib/hooks";
import type { BudgetStatus, Goal, Transaction } from "@/lib/types";

interface Props {
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onViewAll: () => void;
}

const HARD_SHADOW = "shadow-[6px_6px_0_0_#000]";
const HARD_SHADOW_SM = "shadow-[2px_2px_0_0_#000]";

export function DashboardNeobrutalist({ onAdd, onEdit, onViewAll }: Props) {
  const [greeting, setGreeting] = React.useState<string>("");
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);
  const { data: analytics } = useAnalytics(monthKey);

  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];
  const budgets = data?.budgetStatuses ?? [];
  const goals = data?.goals ?? [];
  const monthComparison = analytics?.monthComparison;

  const topBudget = React.useMemo(
    () => budgets.slice().sort((a, b) => b.percentage - a.percentage)[0],
    [budgets],
  );
  const topGoal = React.useMemo(
    () =>
      goals
        .slice()
        .sort(
          (a, b) =>
            b.currentAmount / Math.max(b.targetAmount, 1) -
            a.currentAmount / Math.max(a.targetAmount, 1),
        )[0],
    [goals],
  );

  const accentColors = [
    "bg-yellow-300",
    "bg-pink-400",
    "bg-cyan-300",
    "bg-lime-400",
  ];

  return (
    <div className="space-y-4">
      {/* ============== HERO ============== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={cn(
            "relative border-2 border-black bg-white p-5 sm:p-6",
            HARD_SHADOW,
            "transition-transform duration-150 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_0_#000]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-black uppercase tracking-tight text-black/70 text-xs">
                {greeting ? `${greeting}!` : "Halo!"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 font-black uppercase text-black text-sm">
                Saldo total
                <button
                  onClick={() => {
                    // toggle handled via state below
                  }}
                  className="text-black/60 hover:text-black"
                  aria-label="Toggle saldo"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </p>
            </div>
            <Button
              onClick={onAdd}
              size="sm"
              className={cn(
                "shrink-0 border-2 border-black bg-lime-400 font-black uppercase text-black hover:bg-lime-500",
                HARD_SHADOW_SM,
                "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
              )}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Tambah</span>
            </Button>
          </div>

          <SaldoBigNumber
            amount={summary?.balance ?? 0}
            isLoading={isLoading}
          />

          {/* Income / Expense quick stats — colorful solid boxes */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div
              className={cn(
                "border-2 border-black bg-cyan-300 p-3",
                HARD_SHADOW_SM,
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white">
                  <TrendingUp className="h-4 w-4 text-black" />
                </span>
                <p className="font-black uppercase text-[10px] text-black">
                  Pemasukan
                </p>
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-black">
                {isLoading ? "—" : formatCurrencyCompact(summary?.monthIncome ?? 0)}
              </p>
            </div>
            <div
              className={cn(
                "border-2 border-black bg-pink-400 p-3",
                HARD_SHADOW_SM,
              )}
            >
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-black bg-white">
                  <TrendingDown className="h-4 w-4 text-black" />
                </span>
                <p className="font-black uppercase text-[10px] text-black">
                  Pengeluaran
                </p>
              </div>
              <p className="mt-2 text-xl font-black tabular-nums text-black">
                {isLoading ? "—" : formatCurrencyCompact(summary?.monthExpense ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============== BENTO GRID ============== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className={cn(
            "col-span-2 border-2 border-black bg-yellow-300 p-4 sm:col-span-2",
            HARD_SHADOW,
            "transition-transform duration-150 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_0_#000]",
          )}
        >
          <p className="font-black uppercase text-xs text-black/70">
            Sisa bulan ini
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums text-black sm:text-3xl">
            {isLoading ? "···" : formatCurrency(summary?.monthBalance ?? 0)}
          </p>
          <p className="mt-1 font-bold uppercase text-[10px] text-black/70">
            Pemasukan − pengeluaran bulan ini
          </p>
        </div>

        <NeoStatCard
          label="Rata/hari"
          value={
            isLoading
              ? "—"
              : formatCurrencyCompact(
                  Math.round(
                    (summary?.monthExpense ?? 0) /
                      Math.max(new Date().getDate(), 1),
                  ),
                )
          }
          accent="bg-lime-400"
          icon={<Flame className="h-4 w-4 text-black" />}
        />
        <NeoStatCard
          label="Tingkat tabung"
          value={`${Math.round((summary?.savingsRate ?? 0))}%`}
          accent="bg-cyan-300"
          icon={<Sparkles className="h-4 w-4 text-black" />}
        />
      </div>

      {/* ============== MONTH COMPARISON ============== */}
      <NeoCard accent="bg-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-yellow-300">
              <CalendarRange className="h-4 w-4 text-black" />
            </span>
            <div>
              <p className="font-black uppercase text-xs text-black">
                Bulan ini vs lalu
              </p>
              <p className="font-bold text-[11px] text-black/70">Pengeluaran</p>
            </div>
          </div>
          {monthComparison &&
            monthComparison.expenseChange !== 0 &&
            !isLoading && (
              <span
                className={cn(
                  "flex shrink-0 items-center gap-1 border-2 border-black px-2 py-1 font-black uppercase text-[10px] text-black",
                  monthComparison.expenseChange < 0
                    ? "bg-lime-400"
                    : "bg-pink-400",
                )}
              >
                {monthComparison.expenseChange < 0 ? (
                  <ArrowDownRight className="h-3 w-3" />
                ) : (
                  <ArrowUpRight className="h-3 w-3" />
                )}
                {Math.abs(Math.round(monthComparison.expenseChange))}%
              </span>
            )}
        </div>
        {isLoading ? (
          <Skeleton className="mt-3 h-8 w-44" />
        ) : (
          <>
            <p className="mt-3 text-base font-black tabular-nums text-black">
              {monthComparison && monthComparison.previous.expense > 0
                ? monthComparison.expenseChange < 0
                  ? `HEMAT ${formatCurrencyCompact(
                      monthComparison.previous.expense -
                        monthComparison.current.expense,
                    )}!`
                  : monthComparison.expenseChange > 0
                    ? `BOROS ${formatCurrencyCompact(
                        Math.abs(
                          monthComparison.previous.expense -
                            monthComparison.current.expense,
                        ),
                      )}`
                    : "Sama dengan bulan lalu"
                : "Belum ada data bulan lalu"}
            </p>
            <p className="mt-1 font-bold text-[11px] tabular-nums text-black/70">
              {formatCurrencyCompact(monthComparison?.current.expense ?? 0)} vs{" "}
              {formatCurrencyCompact(monthComparison?.previous.expense ?? 0)}
            </p>
          </>
        )}
      </NeoCard>

      {/* ============== BUDGET + GOAL ============== */}
      {(topBudget || topGoal) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topBudget && <NeoBudgetCard budget={topBudget} />}
          {topGoal && <NeoGoalCard goal={topGoal} />}
        </div>
      )}

      {/* ============== RECENT TRANSACTIONS ============== */}
      <NeoCard accent="bg-white">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-black uppercase text-sm text-black">
              Transaksi Terbaru
            </h3>
            <p className="mt-0.5 font-bold text-[11px] text-black/70">
              6 transaksi terakhir
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onViewAll}
            className={cn(
              "gap-1 border-2 border-black bg-lime-400 font-black uppercase text-black hover:bg-lime-500",
              HARD_SHADOW_SM,
              "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
            )}
          >
            Lihat semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="border-2 border-dashed border-black bg-yellow-300 p-6 text-center">
            <p className="font-black uppercase text-sm text-black">
              Belum ada transaksi
            </p>
            <Button
              onClick={onAdd}
              size="sm"
              className={cn(
                "mt-3 border-2 border-black bg-pink-400 font-black uppercase text-black hover:bg-pink-500",
                HARD_SHADOW_SM,
                "active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
              )}
            >
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </div>
        ) : (
          <div className="-mx-1">
            {recent.slice(0, 6).map((t, idx) => {
              const isIncome = t.type === "INCOME";
              const cat = t.category;
              const accent = accentColors[idx % accentColors.length];
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className={cn(
                    "group flex w-full items-center gap-3 border-t-2 border-black/20 px-1 py-2 text-left transition-colors hover:bg-yellow-300/50",
                    idx === 0 && "border-t-0",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black",
                      accent,
                    )}
                  >
                    <LucideIcon
                      name={cat?.icon ?? "Circle"}
                      className="h-4 w-4 text-black"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black uppercase text-sm text-black">
                      {t.description}
                    </p>
                    <p className="truncate font-bold text-[11px] text-black/70">
                      {cat?.name} · {relativeDay(t.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 border-2 border-black px-2 py-0.5 font-black tabular-nums text-xs",
                      isIncome ? "bg-lime-400 text-black" : "bg-pink-400 text-black",
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
      </NeoCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SaldoBigNumber({
  amount,
  isLoading,
}: {
  amount: number;
  isLoading: boolean;
}) {
  const [show, setShow] = React.useState(true);
  return (
    <div className="mt-4 flex items-center gap-3">
      <div>
        <p className="text-4xl font-black uppercase tabular-nums tracking-tighter text-black sm:text-5xl">
          {isLoading ? "···" : show ? (
            <>
              <span className="text-xl font-black text-black/70 sm:text-2xl">
                Rp{" "}
              </span>
              {amount.toLocaleString("id-ID")}
            </>
          ) : (
            "•••••••"
          )}
        </p>
      </div>
      <button
        onClick={() => setShow((p) => !p)}
        className="flex h-8 w-8 items-center justify-center border-2 border-black bg-yellow-300"
        aria-label={show ? "Sembunyikan saldo" : "Tampilkan saldo"}
      >
        {show ? (
          <Eye className="h-4 w-4 text-black" />
        ) : (
          <EyeOff className="h-4 w-4 text-black" />
        )}
      </button>
    </div>
  );
}

function NeoStatCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-2 border-black p-3",
        accent,
        HARD_SHADOW,
        "transition-transform duration-150 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_0_#000]",
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center border-2 border-black bg-white">
        {icon}
      </span>
      <p className="mt-2 font-black uppercase text-[10px] text-black/70">
        {label}
      </p>
      <p className="truncate text-base font-black tabular-nums text-black">
        {value}
      </p>
    </div>
  );
}

function NeoCard({
  children,
  accent = "bg-white",
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <div
      className={cn(
        "border-2 border-black p-4",
        accent,
        HARD_SHADOW,
        "transition-transform duration-150 active:translate-x-1 active:translate-y-1 active:shadow-[2px_2px_0_0_#000]",
      )}
    >
      {children}
    </div>
  );
}

function NeoBudgetCard({ budget }: { budget: BudgetStatus }) {
  const pct = Math.min(100, Math.round(budget.percentage));
  const barColor =
    budget.status === "over"
      ? "bg-pink-500"
      : budget.status === "danger"
        ? "bg-pink-400"
        : budget.status === "warning"
          ? "bg-yellow-400"
          : "bg-lime-400";

  return (
    <NeoCard accent="bg-yellow-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white">
            <LucideIcon name={budget.category.icon} className="h-4 w-4 text-black" />
          </span>
          <div className="min-w-0">
            <p className="font-black uppercase text-[10px] text-black/70">
              Anggaran
            </p>
            <p className="truncate font-black uppercase text-sm text-black">
              {budget.category.name}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-white font-black tabular-nums text-black",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-4 w-full border-2 border-black bg-white">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={cn("h-full border-r-2 border-black", barColor)}
        />
      </div>
      <p className="mt-2 font-bold tabular-nums text-[10px] text-black/70">
        {formatCurrencyCompact(budget.spent)} / {formatCurrencyCompact(budget.amount)}
      </p>
    </NeoCard>
  );
}

function NeoGoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min(
    100,
    Math.round((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  const level =
    pct >= 100 ? "🏆" : pct >= 75 ? "🥇" : pct >= 50 ? "🥈" : pct >= 25 ? "🥉" : "🌱";
  return (
    <NeoCard accent="bg-cyan-300">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center border-2 border-black bg-white">
            <LucideIcon name={goal.icon || "Target"} className="h-4 w-4 text-black" />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 font-black uppercase text-[10px] text-black/70">
              <span>{level}</span>
              <span>Target</span>
            </p>
            <p className="truncate font-black uppercase text-sm text-black">
              {goal.name}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center border-2 border-black bg-white font-black tabular-nums text-black",
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="mt-3 h-4 w-full border-2 border-black bg-white">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full border-r-2 border-black bg-lime-400"
        />
      </div>
      <p className="mt-2 font-bold tabular-nums text-[10px] text-black/70">
        Sisa {formatCurrencyCompact(Math.max(0, goal.targetAmount - goal.currentAmount))} lagi
      </p>
    </NeoCard>
  );
}
