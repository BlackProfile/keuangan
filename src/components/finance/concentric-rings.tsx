"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Sparkles } from "lucide-react";

import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyCompactHidden,
  getMonthKey,
} from "@/lib/format";
import { useDashboard, useTransactions } from "@/lib/hooks";

/**
 * ConcentricRings — radial data visualization showing 4 metrics in
 * concentric SVG rings, with the total saldo in the center (tap to
 * toggle visibility).
 *
 *  Ring 1 (innermost): Savings rate %        (emerald)
 *  Ring 2:            Budget usage %         (amber)
 *  Ring 3:            Goal progress %        (primary)
 *  Ring 4 (outermost): Transaction count m/m (violet)
 */
export function ConcentricRings() {
  const [showBalance, setShowBalance] = React.useState(true);
  const [activeIdx, setActiveIdx] = React.useState<number | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("dompetku:showBalance");
      if (saved !== null) setShowBalance(saved !== "false");
    } catch {
      // ignore
    }
  }, []);

  function toggleBalance() {
    setShowBalance((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("dompetku:showBalance", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);

  const summary = data?.summary;
  const budgets = data?.budgetStatuses ?? [];
  const goals = data?.goals ?? [];

  // ---- Metric 1: Savings rate % ----
  const savingsRate = (summary?.savingsRate ?? 0) * 100; // hook returns 0..1

  // ---- Metric 2: Budget usage % (avg across budgets) ----
  const budgetUsagePct = React.useMemo(() => {
    if (budgets.length === 0) return 0;
    const total = budgets.reduce((acc, b) => acc + Math.min(b.percentage, 100), 0);
    return total / budgets.length;
  }, [budgets]);

  // ---- Metric 3: Goal progress % (avg) ----
  const goalProgressPct = React.useMemo(() => {
    if (goals.length === 0) return 0;
    const total = goals.reduce(
      (acc, g) => acc + Math.min((g.currentAmount / Math.max(g.targetAmount, 1)) * 100, 100),
      0,
    );
    return total / goals.length;
  }, [goals]);

  // ---- Metric 4: Transaction count this month vs last (relative) ----
  const thisMonthCount = summary?.monthTransactionCount ?? 0;
  const lastMonthCount = Math.max((summary?.transactionCount ?? 0) - thisMonthCount, 0);
  const countPct = React.useMemo(() => {
    const denom = Math.max(thisMonthCount, lastMonthCount, 1);
    return Math.min((thisMonthCount / denom) * 100, 100);
  }, [thisMonthCount, lastMonthCount]);

  // Center saldo value
  const saldo = summary?.balance ?? 0;

  // Ring config — radii & stroke widths
  const SIZE = 240;
  const CENTER = SIZE / 2;
  const RINGS = [
    {
      idx: 0,
      r: 38,
      strokeWidth: 10,
      pct: savingsRate,
      color: "#10b981",
      label: "Tingkat Tabung",
      value: `${Math.round(savingsRate)}%`,
      detail: `Pendapatan − pengeluaran / pendapatan bulan ini`,
    },
    {
      idx: 1,
      r: 56,
      strokeWidth: 10,
      pct: budgetUsagePct,
      color: "#f59e0b",
      label: "Pemakaian Anggaran",
      value: `${Math.round(budgetUsagePct)}%`,
      detail: `Rata-rata ${budgets.length} anggaran kategori`,
    },
    {
      idx: 2,
      r: 74,
      strokeWidth: 10,
      pct: goalProgressPct,
      color: "hsl(var(--primary))",
      label: "Progress Target",
      value: `${Math.round(goalProgressPct)}%`,
      detail: `Rata-rata ${goals.length} target tabungan`,
    },
    {
      idx: 3,
      r: 92,
      strokeWidth: 10,
      pct: countPct,
      color: "#8b5cf6",
      label: "Aktivitas Transaksi",
      value: `${thisMonthCount} / ${Math.max(lastMonthCount, thisMonthCount)}`,
      detail: `Transaksi bulan ini vs bulan lalu`,
    },
  ];

  return (
    <TooltipProvider delayDuration={120}>
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Ring Kesehatan Keuangan</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              4 metrik utama dalam satu lingkaran
            </p>
          </div>
          <button
            type="button"
            onClick={toggleBalance}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
          >
            {showBalance ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>

        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-6">
          {/* SVG rings */}
          <div className="relative flex shrink-0 items-center justify-center">
            <svg
              width={SIZE}
              height={SIZE}
              viewBox={`0 0 ${SIZE} ${SIZE}`}
              className="max-w-full"
              role="img"
              aria-label="Lingkaran konsentris kesehatan keuangan"
            >
              {/* Background track rings */}
              {RINGS.map((ring) => (
                <circle
                  key={`track-${ring.idx}`}
                  cx={CENTER}
                  cy={CENTER}
                  r={ring.r}
                  fill="none"
                  strokeWidth={ring.strokeWidth}
                  className="stroke-muted/40"
                />
              ))}

              {/* Progress rings */}
              {RINGS.map((ring) => {
                const circumference = 2 * Math.PI * ring.r;
                const dashOffset = circumference * (1 - Math.min(ring.pct, 100) / 100);
                return (
                  <motion.circle
                    key={`progress-${ring.idx}`}
                    cx={CENTER}
                    cy={CENTER}
                    r={ring.r}
                    fill="none"
                    stroke={ring.color}
                    strokeWidth={ring.strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{
                      duration: 1.1,
                      delay: 0.15 + ring.idx * 0.18,
                      ease: "easeOut",
                    }}
                    transform={`rotate(-90 ${CENTER} ${CENTER})`}
                    style={{
                      filter: isLoading ? "none" : `drop-shadow(0 0 4px ${ring.color}40)`,
                    }}
                  />
                );
              })}

              {/* Center text (saldo) */}
              <text
                x={CENTER}
                y={CENTER - 8}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 10, fontWeight: 500 }}
              >
                Total Saldo
              </text>
              <text
                x={CENTER}
                y={CENTER + 8}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: 16, fontWeight: 700 }}
              >
                {showBalance
                  ? formatCurrencyCompact(saldo)
                  : "••••"}
              </text>
              <text
                x={CENTER}
                y={CENTER + 24}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: 9 }}
              >
                {isLoading ? "memuat…" : "tap untuk sembunyikan"}
              </text>
            </svg>

            {/* Invisible ring "hit" areas for tap-to-tooltip */}
            {RINGS.map((ring) => (
              <Tooltip key={`tip-${ring.idx}`} open={activeIdx === ring.idx ? undefined : false}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIdx((cur) => (cur === ring.idx ? null : ring.idx))
                    }
                    className="absolute rounded-full"
                    style={{
                      width: (ring.r + ring.strokeWidth / 2) * 2,
                      height: (ring.r + ring.strokeWidth / 2) * 2,
                      left: CENTER - (ring.r + ring.strokeWidth / 2),
                      top: CENTER - (ring.r + ring.strokeWidth / 2),
                      background: "transparent",
                      cursor: "pointer",
                    }}
                    aria-label={`${ring.label}: ${ring.value}`}
                  />
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="border-border bg-popover text-popover-foreground"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ring.color }}
                      />
                      <span className="text-xs font-semibold">{ring.label}</span>
                    </div>
                    <p className="text-sm font-bold tabular-nums">{ring.value}</p>
                    <p className="max-w-[200px] text-[11px] text-muted-foreground">
                      {ring.detail}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Legend */}
          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {RINGS.map((ring) => (
              <button
                key={`legend-${ring.idx}`}
                type="button"
                onClick={() =>
                  setActiveIdx((cur) => (cur === ring.idx ? null : ring.idx))
                }
                className={cn(
                  "flex items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-colors",
                  activeIdx === ring.idx
                    ? "border-primary bg-accent"
                    : "border-border hover:bg-muted/40",
                )}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${ring.color}1a` }}
                >
                  <Sparkles
                    className="h-4 w-4"
                    style={{ color: ring.color }}
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">
                    {ring.label}
                  </p>
                  <p className="text-sm font-bold tabular-nums">{ring.value}</p>
                </div>
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: ring.color }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Footer summary */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3 text-xs sm:grid-cols-4">
          <LegendMetric
            label="Pendapatan"
            value={showBalance ? formatCurrency(summary?.monthIncome ?? 0) : "•••"}
            color="text-income"
          />
          <LegendMetric
            label="Pengeluaran"
            value={showBalance ? formatCurrency(summary?.monthExpense ?? 0) : "•••"}
            color="text-expense"
          />
          <LegendMetric
            label="Selisih"
            value={
              showBalance
                ? `${(summary?.monthBalance ?? 0) >= 0 ? "+" : "−"}${formatCurrency(Math.abs(summary?.monthBalance ?? 0))}`
                : "•••"
            }
            color={(summary?.monthBalance ?? 0) >= 0 ? "text-income" : "text-expense"}
          />
          <LegendMetric
            label="Transaksi"
            value={`${summary?.monthTransactionCount ?? 0}`}
          />
        </div>
      </Card>
    </TooltipProvider>
  );
}

function LegendMetric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 truncate text-sm font-bold tabular-nums",
          color,
        )}
      >
        {value}
      </p>
    </div>
  );
}

// Avoid unused import warning when not used
void formatCurrencyCompactHidden;
