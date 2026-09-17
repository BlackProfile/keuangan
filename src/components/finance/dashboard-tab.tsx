"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Plus, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatCurrency, getGreeting, relativeDay } from "@/lib/format";
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
  const { data, isLoading } = useDashboard();
  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];

  return (
    <div className="space-y-5">
      {/* Greeting + balance hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-6 text-white shadow-xl">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 right-20 h-32 w-32 rounded-full bg-white/5" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/80">{getGreeting()}, 👋</p>
                <p className="mt-0.5 text-lg font-semibold">
                  Ini ringkasan keuanganmu
                </p>
              </div>
              <Button
                onClick={onAdd}
                size="sm"
                className="border border-white/20 bg-white/15 text-white backdrop-blur hover:bg-white/25"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Tambah</span>
              </Button>
            </div>

            <div className="mt-5">
              <p className="text-xs text-white/70">Saldo saat ini</p>
              <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                {isLoading
                  ? "Rp ..."
                  : formatCurrency(summary?.balance ?? 0)}
              </p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-[11px] text-white/70">Pemasukan</p>
                <p className="mt-0.5 text-sm font-semibold text-emerald-100">
                  {isLoading ? "—" : formatCurrency(summary?.totalIncome ?? 0)}
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
                <p className="text-[11px] text-white/70">Pengeluaran</p>
                <p className="mt-0.5 text-sm font-semibold text-rose-100">
                  {isLoading ? "—" : formatCurrency(summary?.totalExpense ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Summary cards */}
      <SummaryCards summary={summary} loading={isLoading} />

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
          <div className="divide-y divide-border">
            {recent.map((t) => {
              const isIncome = t.type === "INCOME";
              const cat = t.category;
              return (
                <button
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="group flex w-full items-center gap-3 py-2.5 text-left transition-colors hover:bg-muted/40 sm:px-2"
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
                    <p className="text-xs text-muted-foreground">
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
