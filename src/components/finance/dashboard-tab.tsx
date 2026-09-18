"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  getGreeting,
  getMonthYearLabel,
  relativeDay,
  getMonthKey,
} from "@/lib/format";
import { useDashboard } from "@/lib/hooks";
import { SummaryCards } from "./summary-cards";
import { FinanceCharts } from "./charts";
import type { Transaction } from "@/lib/types";

interface Props {
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onViewAll: () => void;
}

export function DashboardTab({ onAdd, onEdit, onViewAll }: Props) {
  const now = new Date();
  const [viewDate, setViewDate] = React.useState<Date>(now);
  const monthKey = getMonthKey(viewDate);
  const isCurrentMonth =
    viewDate.getFullYear() === now.getFullYear() &&
    viewDate.getMonth() === now.getMonth();

  const { data, isLoading } = useDashboard(monthKey);
  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  return (
    <div className="space-y-5">
      {/* Hero — compact, shows total balance + quick stats + month nav */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-0 p-5 text-white shadow-xl ring-inner-glow gradient-hero sm:p-6">
          <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
          <div className="absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-white/75">
                  {isCurrentMonth ? `${getGreeting()} 👋` : "Ringkasan bulan"}
                </p>
                <p className="mt-0.5 text-base font-semibold text-white/95">
                  {isCurrentMonth
                    ? "Ini ringkasan keuanganmu"
                    : getMonthYearLabel(viewDate)}
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

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-white/60">
                  Total Saldo
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  {isLoading ? "···" : formatCurrency(summary?.balance ?? 0)}
                </p>
              </div>
              {/* Month navigation */}
              <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={prevMonth}
                  className="h-8 w-8 border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[7rem] text-center text-xs font-medium text-white/90">
                  {getMonthYearLabel(viewDate)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="h-8 w-8 border border-white/15 bg-white/10 text-white hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/25">
                  <TrendingUp className="h-4 w-4 text-emerald-100" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-white/65">Total Pemasukan</p>
                  <p className="truncate text-sm font-semibold text-emerald-50">
                    {isLoading ? "—" : formatCurrencyCompact(summary?.totalIncome ?? 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-400/25">
                  <TrendingDown className="h-4 w-4 text-rose-100" />
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] text-white/65">Total Pengeluaran</p>
                  <p className="truncate text-sm font-semibold text-rose-50">
                    {isLoading ? "—" : formatCurrencyCompact(summary?.totalExpense ?? 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary cards — viewed month metrics */}
      <SummaryCards summary={summary} loading={isLoading} viewDate={viewDate} />

      {/* Charts */}
      <FinanceCharts
        monthlyData={data?.monthlyData}
        expenseByCategory={data?.expenseByCategory}
        incomeByCategory={data?.incomeByCategory}
        loading={isLoading}
      />

      {/* Recent transactions */}
      <Card className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">Transaksi Terbaru</h3>
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
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <EmptyTransactions onAdd={onAdd} />
        ) : (
          <div className="-mx-1 divide-y divide-border">
            {recent.map((t) => {
              const isIncome = t.type === "INCOME";
              const cat = t.category;
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="group flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: cat ? `${cat.color}1a` : undefined }}
                  >
                    <LucideIcon
                      name={cat?.icon ?? "Circle"}
                      className="h-5 w-5"
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
                      isIncome ? "text-income" : "text-expense"
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

function EmptyTransactions({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Sparkles className="h-6 w-6 text-muted-foreground" />
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
