"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CalendarRange,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  formatCurrency,
  formatCurrencyCompact,
  getMonthYearLabel,
} from "@/lib/format";
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    );
  }

  const balance = summary.balance;
  const isPositive = balance >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Balance */}
      <Card className="relative overflow-hidden border-0 p-5 text-white shadow-lg gradient-balance">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/80">
              Saldo Total
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <Wallet className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(balance)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-white/70">
            {isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {isPositive ? "Surplus" : "Defisit"} dari semua transaksi
            </span>
          </div>
        </div>
      </Card>

      {/* Income */}
      <Card className="group relative overflow-hidden border-0 p-5 text-white shadow-lg gradient-income">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/85">
              Total Pemasukan
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ArrowDownLeft className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(summary.totalIncome)}
          </div>
          <div className="mt-1 text-xs text-white/70">
            Dari {summary.transactionCount} transaksi
          </div>
        </div>
      </Card>

      {/* Expense */}
      <Card className="group relative overflow-hidden border-0 p-5 text-white shadow-lg gradient-expense">
        <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white/85">
              Total Pengeluaran
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight">
            {formatCurrency(summary.totalExpense)}
          </div>
          <div className="mt-1 text-xs text-white/70">
            {summary.totalIncome > 0
              ? `${Math.round(
                  (summary.totalExpense / summary.totalIncome) * 100
                )}% dari pemasukan`
              : "Belum ada pemasukan"}
          </div>
        </div>
      </Card>

      {/* This month */}
      <Card className="relative overflow-hidden border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Bulan Ini
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <CalendarRange className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 text-2xl font-bold tracking-tight">
          {formatCurrency(summary.monthBalance)}
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-income">
            <span className="h-1.5 w-1.5 rounded-full bg-income" />+
            {formatCurrencyCompact(summary.monthIncome)}
          </span>
          <span className="inline-flex items-center gap-1 text-expense">
            <span className="h-1.5 w-1.5 rounded-full bg-expense" />-
            {formatCurrencyCompact(summary.monthExpense)}
          </span>
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {monthLabel} · {summary.monthTransactionCount} transaksi
        </div>
      </Card>
    </div>
  );
}
