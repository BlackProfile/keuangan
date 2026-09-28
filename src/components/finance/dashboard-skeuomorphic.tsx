"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
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

// Leather palette
const LEATHER_BG = "linear-gradient(135deg, #3D2914 0%, #5C3A1E 100%)";
const GOLD = "#D4AF37";
const CREAM = "#F5F5DC";

export function DashboardSkeuomorphic({ onAdd, onEdit, onViewAll }: Props) {
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

  return (
    <div
      className="space-y-4 p-1"
      style={{
        background: LEATHER_BG,
        // Subtle noise texture via repeating gradient
        backgroundImage: `${LEATHER_BG}, repeating-linear-gradient(45deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 3px)`,
        backgroundBlendMode: "multiply",
        margin: "-4px -4px",
        padding: "16px 4px",
        borderRadius: 12,
      }}
    >
      {/* ============== HERO — Credit Card (flip) ============== */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="px-0"
      >
        <CreditCard
          balance={summary?.balance ?? 0}
          monthIncome={summary?.monthIncome ?? 0}
          monthExpense={summary?.monthExpense ?? 0}
          monthBalance={summary?.monthBalance ?? 0}
          greeting={greeting}
          isLoading={isLoading}
          onAdd={onAdd}
        />
      </motion.div>

      {/* ============== Budget / Goal speedometers ============== */}
      {(topBudget || topGoal) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {topBudget && <LeatherBudgetCard budget={topBudget} />}
          {topGoal && <LeatherGoalCard goal={topGoal} />}
        </div>
      )}

      {/* ============== Month Comparison ============== */}
      <LeatherCard>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{
                backgroundColor: "rgba(212,175,55,0.15)",
                border: `1px solid ${GOLD}40`,
              }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: GOLD }} />
            </span>
            <div>
              <p className="text-xs" style={{ color: CREAM, opacity: 0.7 }}>
                Bulan ini vs lalu
              </p>
              <p className="text-[11px]" style={{ color: CREAM, opacity: 0.5 }}>
                Pengeluaran
              </p>
            </div>
          </div>
          {monthComparison && monthComparison.expenseChange !== 0 && !isLoading && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{
                color: monthComparison.expenseChange < 0 ? "#81B29A" : "#E07A5F",
                backgroundColor:
                  monthComparison.expenseChange < 0
                    ? "rgba(129,178,154,0.15)"
                    : "rgba(224,122,95,0.15)",
              }}
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
            <p
              className="mt-3 text-sm font-semibold tabular-nums"
              style={{
                color:
                  monthComparison && monthComparison.expenseChange < 0
                    ? "#81B29A"
                    : monthComparison && monthComparison.expenseChange > 0
                      ? "#E07A5F"
                      : CREAM,
              }}
            >
              {monthComparison && monthComparison.previous.expense > 0
                ? monthComparison.expenseChange < 0
                  ? `Hemat ${formatCurrencyCompact(
                      monthComparison.previous.expense -
                        monthComparison.current.expense,
                    )}`
                  : monthComparison.expenseChange > 0
                    ? `Boros ${formatCurrencyCompact(
                        Math.abs(
                          monthComparison.previous.expense -
                            monthComparison.current.expense,
                        ),
                      )}`
                    : "Sama dengan bulan lalu"
                : "Belum ada data bulan lalu"}
            </p>
            <p
              className="mt-0.5 text-[11px] tabular-nums"
              style={{ color: CREAM, opacity: 0.6 }}
            >
              {formatCurrencyCompact(monthComparison?.current.expense ?? 0)} vs{" "}
              {formatCurrencyCompact(monthComparison?.previous.expense ?? 0)}
            </p>
          </>
        )}
      </LeatherCard>

      {/* ============== Recent Transactions ============== */}
      <LeatherCard>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3
              className="text-sm font-semibold"
              style={{ color: CREAM, fontFamily: "Georgia, serif" }}
            >
              Transaksi Terbaru
            </h3>
            <p className="mt-0.5 text-xs" style={{ color: CREAM, opacity: 0.5 }}>
              6 transaksi terakhir
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="gap-1"
            style={{ color: GOLD }}
          >
            Lihat semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div
            className="rounded-lg border border-dashed py-6 text-center"
            style={{ borderColor: `${GOLD}40` }}
          >
            <p className="text-xs" style={{ color: CREAM, opacity: 0.7 }}>
              Belum ada transaksi.
            </p>
            <Button
              onClick={onAdd}
              size="sm"
              className="mt-3 gap-1"
              style={{
                backgroundColor: GOLD,
                color: "#3D2914",
              }}
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
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className={cn(
                    "group flex w-full items-center gap-3 px-1 py-2 text-left transition-colors",
                    idx > 0 && "border-t",
                  )}
                  style={{
                    borderColor: `${GOLD}20`,
                  }}
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: cat ? `${cat.color}25` : `${GOLD}20`,
                      border: `1px solid ${GOLD}30`,
                    }}
                  >
                    <LucideIcon
                      name={cat?.icon ?? "Circle"}
                      className="h-4 w-4"
                      style={{ color: cat?.color ?? GOLD }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: CREAM }}
                    >
                      {t.description}
                    </p>
                    <p
                      className="truncate text-xs"
                      style={{ color: CREAM, opacity: 0.5 }}
                    >
                      {cat?.name} · {relativeDay(t.date)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-sm font-semibold tabular-nums"
                    style={{
                      color: isIncome ? "#81B29A" : "#E07A5F",
                      textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                    }}
                  >
                    {isIncome ? "+" : "−"}
                    {formatCurrency(t.amount)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </LeatherCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Credit Card — flip on click                                       */
/* ------------------------------------------------------------------ */

function CreditCard({
  balance,
  monthIncome,
  monthExpense,
  monthBalance,
  greeting,
  isLoading,
  onAdd,
}: {
  balance: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  greeting: string;
  isLoading: boolean;
  onAdd: () => void;
}) {
  const [flipped, setFlipped] = React.useState(false);
  const [showBalance, setShowBalance] = React.useState(true);

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className="relative w-full max-w-md"
        style={{ perspective: "1200px" }}
      >
        <button
          type="button"
          onClick={() => setFlipped((p) => !p)}
          className="block w-full text-left"
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 0.6s ease",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            position: "relative",
          }}
          aria-label="Putar kartu"
        >
          {/* FRONT */}
          <div
            className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              background:
                "linear-gradient(135deg, #2A1A0A 0%, #4A2D14 50%, #3D2914 100%)",
              border: `2px solid ${GOLD}80`,
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
              minHeight: 200,
            }}
          >
            {/* Decorative gold corners */}
            <div
              className="absolute -right-12 -top-12 h-32 w-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-16 -left-12 h-32 w-32 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
              }}
            />

            {/* Header: greeting + bank logo */}
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-xs uppercase tracking-widest"
                  style={{ color: GOLD, opacity: 0.85, letterSpacing: "0.15em" }}
                >
                  {greeting ? greeting : "Halo"}
                </p>
                <p
                  className="mt-1 text-[11px] uppercase tracking-wider"
                  style={{ color: CREAM, opacity: 0.7 }}
                >
                  Saldo total
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: `${GOLD}25`,
                    border: `1px solid ${GOLD}60`,
                  }}
                >
                  <Wallet className="h-4 w-4" style={{ color: GOLD }} />
                </span>
              </div>
            </div>

            {/* Balance — emboss effect */}
            <div className="relative mt-5 flex items-center gap-2">
              {isLoading ? (
                <p
                  className="text-3xl font-bold tabular-nums sm:text-4xl"
                  style={{
                    color: GOLD,
                    textShadow: "0 2px 0 rgba(0,0,0,0.6), 0 -1px 0 rgba(255,255,255,0.2)",
                  }}
                >
                  ···
                </p>
              ) : (
                <p
                  className="text-3xl font-bold tabular-nums sm:text-4xl"
                  style={{
                    color: showBalance ? GOLD : CREAM,
                    textShadow:
                      "0 2px 0 rgba(0,0,0,0.7), 0 -1px 0 rgba(255,255,255,0.18)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {showBalance ? (
                    <>
                      <span className="text-lg sm:text-xl">Rp </span>
                      {balance.toLocaleString("id-ID")}
                    </>
                  ) : (
                    "••••••••"
                  )}
                </p>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBalance((p) => !p);
                }}
                aria-label={showBalance ? "Sembunyikan" : "Tampilkan"}
                className="text-cream/60 hover:text-cream"
                style={{ color: CREAM, opacity: 0.6 }}
              >
                {showBalance ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* Footer: card number + chip */}
            <div className="relative mt-6 flex items-end justify-between">
              <div className="flex items-center gap-2">
                {/* Gold chip */}
                <span
                  className="flex h-7 w-9 items-center justify-center rounded-sm"
                  style={{
                    background: "linear-gradient(135deg, #D4AF37, #B8941F, #D4AF37)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                  }}
                >
                  <span
                    className="block h-4 w-7 rounded-sm border"
                    style={{
                      borderColor: "rgba(0,0,0,0.3)",
                      backgroundImage:
                        "repeating-linear-gradient(45deg, rgba(0,0,0,0.15) 0, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 3px)",
                    }}
                  />
                </span>
                <p
                  className="font-mono text-[10px] tabular-nums"
                  style={{ color: CREAM, opacity: 0.55, letterSpacing: "0.2em" }}
                >
                  •••• •••• •••• {String(balance).slice(-4) || "0000"}
                </p>
              </div>
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: GOLD, opacity: 0.7, letterSpacing: "0.2em" }}
              >
                DompetKu
              </p>
            </div>

            {/* Flip hint */}
            <p
              className="absolute bottom-2 right-3 text-[9px] uppercase tracking-wider"
              style={{ color: CREAM, opacity: 0.35 }}
            >
              ↻ Ketuk untuk balik
            </p>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 overflow-hidden rounded-2xl p-5"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background:
                "linear-gradient(135deg, #3D2914 0%, #2A1A0A 100%)",
              border: `2px solid ${GOLD}80`,
              boxShadow:
                "0 8px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            {/* Magnetic stripe */}
            <div
              className="absolute left-0 right-0 top-6 h-8"
              style={{
                background: "linear-gradient(180deg, #1a1a1a, #000)",
              }}
            />

            <div className="relative mt-16">
              <p
                className="text-[10px] uppercase tracking-widest"
                style={{ color: GOLD, opacity: 0.7, letterSpacing: "0.2em" }}
              >
                Statistik Bulan Ini
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(212,175,55,0.08)",
                    border: `1px solid ${GOLD}30`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" style={{ color: "#81B29A" }} />
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: CREAM, opacity: 0.7 }}
                    >
                      Masuk
                    </p>
                  </div>
                  <p
                    className="mt-1 text-base font-bold tabular-nums"
                    style={{ color: "#81B29A" }}
                  >
                    {isLoading ? "—" : formatCurrencyCompact(monthIncome)}
                  </p>
                </div>
                <div
                  className="rounded-lg p-3"
                  style={{
                    background: "rgba(212,175,55,0.08)",
                    border: `1px solid ${GOLD}30`,
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <TrendingDown className="h-3.5 w-3.5" style={{ color: "#E07A5F" }} />
                    <p
                      className="text-[10px] uppercase tracking-wider"
                      style={{ color: CREAM, opacity: 0.7 }}
                    >
                      Keluar
                    </p>
                  </div>
                  <p
                    className="mt-1 text-base font-bold tabular-nums"
                    style={{ color: "#E07A5F" }}
                  >
                    {isLoading ? "—" : formatCurrencyCompact(monthExpense)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg p-3" style={{ background: "rgba(212,175,55,0.12)" }}>
                <p
                  className="text-[10px] uppercase tracking-wider"
                  style={{ color: GOLD, opacity: 0.8 }}
                >
                  Sisa bulan ini
                </p>
                <p
                  className="mt-1 text-lg font-bold tabular-nums"
                  style={{ color: CREAM }}
                >
                  {isLoading ? "—" : formatCurrencyCompact(monthBalance)}
                </p>
              </div>
            </div>

            <p
              className="absolute bottom-2 right-3 text-[9px] uppercase tracking-wider"
              style={{ color: CREAM, opacity: 0.35 }}
            >
              ↻ Ketuk untuk balik
            </p>
          </div>
        </button>
      </div>

      {/* Add button */}
      <Button
        onClick={onAdd}
        size="sm"
        className="mt-4 gap-1.5"
        style={{
          backgroundColor: GOLD,
          color: "#3D2914",
          boxShadow: "0 2px 8px rgba(212,175,55,0.4)",
        }}
      >
        <Plus className="h-4 w-4" />
        Tambah Transaksi
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Speedometer arc — half-circle gauge                                */
/* ------------------------------------------------------------------ */

function SpeedometerArc({
  percentage,
  color = GOLD,
  label,
  value,
}: {
  percentage: number;
  color?: string;
  label: string;
  value: string;
}) {
  const pct = Math.min(100, Math.max(0, percentage));
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Half-circle arc from angle 180 to 0 (left to right along the top).
  const startAngle = Math.PI; // 180° (left)
  const endAngle = 0; // 0° (right)
  // Background arc path: M (cx - r) cy A r r 0 0 1 (cx + r) cy
  const bgPath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  // Value arc: from startAngle to angle = PI * (1 - pct/100)
  const valueAngle = startAngle - (startAngle - endAngle) * (pct / 100);
  const valueEndX = cx + radius * Math.cos(valueAngle);
  const valueEndY = cy + radius * Math.sin(valueAngle);
  // sweep flag 1 = clockwise (top arc)
  const valuePath = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${valueEndX} ${valueEndY}`;
  const circumferenceHalf = Math.PI * radius;
  const arcLen = (pct / 100) * circumferenceHalf;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size / 2 + 6 }}>
        <svg
          viewBox={`0 0 ${size} ${size / 2 + 6}`}
          width={size}
          height={size / 2 + 6}
          aria-hidden
        >
          {/* Background arc */}
          <path
            d={bgPath}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <motion.path
            d={valuePath}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              filter: `drop-shadow(0 0 4px ${color}40)`,
            }}
          />
          {/* Needle */}
          <motion.line
            x1={cx}
            y1={cy}
            x2={valueEndX}
            y2={valueEndY}
            stroke={CREAM}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          />
          <circle cx={cx} cy={cy} r={4} fill={color} />
        </svg>
        {/* Center value */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span
            className="text-base font-bold tabular-nums"
            style={{ color: CREAM }}
          >
            {Math.round(pct)}%
          </span>
        </div>
      </div>
      <p
        className="text-[11px] tabular-nums"
        style={{ color: CREAM, opacity: 0.7 }}
      >
        {label}: {value}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Leather card wrapper                                               */
/* ------------------------------------------------------------------ */

function LeatherCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: "rgba(0,0,0,0.25)",
        border: `1px solid ${GOLD}30`,
        backgroundImage:
          "linear-gradient(135deg, rgba(61,41,20,0.6), rgba(92,58,30,0.4))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      {children}
    </div>
  );
}

function LeatherBudgetCard({ budget }: { budget: BudgetStatus }) {
  const pct = Math.min(100, Math.round(budget.percentage));
  const arcColor =
    budget.status === "over" || budget.status === "danger"
      ? "#E07A5F"
      : budget.status === "warning"
        ? "#D4AF37"
        : "#81B29A";

  return (
    <LeatherCard>
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${budget.category.color}25`,
            border: `1px solid ${GOLD}30`,
          }}
        >
          <LucideIcon
            name={budget.category.icon}
            className="h-4 w-4"
            style={{ color: budget.category.color }}
          />
        </span>
        <div className="min-w-0">
          <p className="text-[11px]" style={{ color: CREAM, opacity: 0.7 }}>
            Anggaran
          </p>
          <p
            className="truncate text-sm font-semibold"
            style={{ color: CREAM }}
          >
            {budget.category.name}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <SpeedometerArc
          percentage={pct}
          color={arcColor}
          label="Terpakai"
          value={`${formatCurrencyCompact(budget.spent)} / ${formatCurrencyCompact(budget.amount)}`}
        />
      </div>
    </LeatherCard>
  );
}

function LeatherGoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min(
    100,
    Math.round((goal.currentAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  const level =
    pct >= 100 ? "🏆" : pct >= 75 ? "🥇" : pct >= 50 ? "🥈" : pct >= 25 ? "🥉" : "🌱";
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  return (
    <LeatherCard>
      <div className="flex items-center gap-2">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: `${goal.color}25`,
            border: `1px solid ${GOLD}30`,
          }}
        >
          <LucideIcon
            name={goal.icon || "Target"}
            className="h-4 w-4"
            style={{ color: goal.color }}
          />
        </span>
        <div className="min-w-0">
          <p
            className="flex items-center gap-1 truncate text-[11px]"
            style={{ color: CREAM, opacity: 0.7 }}
          >
            <span>{level}</span>
            <span>Target</span>
          </p>
          <p
            className="truncate text-sm font-semibold"
            style={{ color: CREAM }}
          >
            {goal.name}
          </p>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <SpeedometerArc
          percentage={pct}
          color={GOLD}
          label="Tercapai"
          value={`Sisa ${formatCurrencyCompact(remaining)}`}
        />
      </div>
    </LeatherCard>
  );
}
