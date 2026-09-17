"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, getMonthYearLabel } from "@/lib/format";
import type { Summary } from "@/lib/types";

interface Props {
  summary?: Summary;
  loading?: boolean;
}

export function SummaryCards({ summary, loading }: Props) {
  const now = new Date();
  const monthLabel = getMonthYearLabel(now);

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    );
  }

  const savingsRate =
    summary.monthIncome > 0
      ? Math.round((summary.monthBalance / summary.monthIncome) * 100)
      : 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <StatCard
        label="Pemasukan"
        sublabel={monthLabel}
        value={summary.monthIncome}
        sign="+"
        icon={<ArrowDownLeft className="h-5 w-5" />}
        gradient="gradient-income"
        extra={`${summary.monthTransactionCount} transaksi bulan ini`}
      />
      <StatCard
        label="Pengeluaran"
        sublabel={monthLabel}
        value={summary.monthExpense}
        sign="−"
        icon={<ArrowUpRight className="h-5 w-5" />}
        gradient="gradient-expense"
        extra={
          summary.monthIncome > 0
            ? `${Math.round((summary.monthExpense / summary.monthIncome) * 100)}% dari pemasukan`
            : "—"
        }
      />
      <StatCard
        label="Sisa Bulan Ini"
        sublabel={savingsRate >= 0 ? "Sedang positif" : "Defisit"}
        value={summary.monthBalance}
        sign={summary.monthBalance >= 0 ? "+" : "−"}
        icon={<PiggyBank className="h-5 w-5" />}
        gradient="gradient-balance"
        extra={
          summary.monthIncome > 0
            ? `${Math.abs(savingsRate)}% dari pemasukan`
            : "Belum ada pemasukan"
        }
      />
    </div>
  );
}

function StatCard({
  label,
  sublabel,
  value,
  sign,
  icon,
  gradient,
  extra,
}: {
  label: string;
  sublabel: string;
  value: number;
  sign: string;
  icon: React.ReactNode;
  gradient: "gradient-income" | "gradient-expense" | "gradient-balance";
  extra: string;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-0 p-5 text-white shadow-lg ring-inner-glow",
        gradient
      )}
    >
      <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/10 transition-transform duration-300 group-hover:scale-110" />
      <div className="relative">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-white/85">{label}</p>
            <p className="mt-0.5 text-xs text-white/60">{sublabel}</p>
          </div>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            {icon}
          </span>
        </div>
        <div className="mt-4 text-2xl font-bold tracking-tight tabular-nums">
          {sign + formatCurrency(value)}
        </div>
        <div className="mt-1.5 text-xs text-white/70">{extra}</div>
      </div>
    </Card>
  );
}
