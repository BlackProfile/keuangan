"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Inbox, Pencil } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDateLong,
  parseDateLocal,
  relativeDay,
} from "@/lib/format";
import type { Transaction } from "@/lib/types";

export interface FinancialTimelineProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
}

interface DayGroup {
  dateKey: string;
  date: Date;
  transactions: Transaction[];
  income: number;
  expense: number;
}

/**
 * FinancialTimeline — storytelling vertical timeline.
 *
 * Layout:
 *  - Vertical line down the center-left (24px from left edge)
 *  - Each transaction = a node (dot) on the line
 *  - Green dot = income, red dot = expense
 *  - Grouped by day with a "chapter" header (larger node + date label)
 *  - Line color shifts per day-segment: green if profit, red if deficit
 *  - Top: monthly summary
 *  - Animated entrance with stagger
 */
export function FinancialTimeline({ transactions, onEdit }: FinancialTimelineProps) {
  const groups = React.useMemo<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const t of transactions) {
      const d = parseDateLocal(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const grp =
        map.get(key) ?? {
          dateKey: key,
          date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
          transactions: [],
          income: 0,
          expense: 0,
        };
      if (t.type === "INCOME") grp.income += t.amount;
      else grp.expense += t.amount;
      grp.transactions.push(t);
      map.set(key, grp);
    }
    return Array.from(map.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  const totals = React.useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const g of groups) {
      income += g.income;
      expense += g.expense;
    }
    return { income, expense, balance: income - expense };
  }, [groups]);

  if (transactions.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Inbox className="h-6 w-6 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-medium">Belum ada transaksi</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Catat transaksi untuk melihatnya di linimasa.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top summary */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarDays className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Bulan ini</p>
              <p className="text-sm font-semibold">
                <span className="text-income">+{formatCurrency(totals.income)}</span>
                <span className="mx-1.5 text-muted-foreground">·</span>
                <span className="text-expense">−{formatCurrency(totals.expense)}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Selisih</p>
            <p
              className={cn(
                "text-sm font-bold tabular-nums",
                totals.balance >= 0 ? "text-income" : "text-expense",
              )}
            >
              {totals.balance >= 0 ? "+" : "−"}
              {formatCurrency(Math.abs(totals.balance))}
            </p>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line — starts after first chapter dot */}
        <div
          className="absolute bottom-0 top-2 w-px bg-border"
          style={{ left: "11px" }}
          aria-hidden
        />
        <div className="space-y-6">
          {groups.map((g, gi) => {
            const isProfit = g.income - g.expense >= 0;
            return (
              <motion.section
                key={g.dateKey}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.35, delay: Math.min(gi * 0.04, 0.4) }}
                className="relative"
              >
                {/* Chapter node (large dot on the line) */}
                <div
                  className={cn(
                    "absolute -left-[22px] top-0 z-10 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-sm",
                    isProfit
                      ? "bg-emerald-500"
                      : "bg-rose-500",
                  )}
                  aria-hidden
                >
                  <span className="h-2 w-2 rounded-full bg-white" />
                </div>

                {/* Chapter label */}
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold tracking-tight">
                      {relativeDay(g.date)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateLong(g.date)}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      isProfit
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
                    )}
                  >
                    {isProfit ? "Surplus" : "Defisit"} ·{" "}
                    {formatCurrency(Math.abs(g.income - g.expense))}
                  </span>
                </div>

                {/* Day summary line */}
                <div className="mb-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <ArrowDownLeft className="h-3 w-3 text-emerald-500" />
                    {formatCurrency(g.income)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <ArrowUpRight className="h-3 w-3 text-rose-500" />
                    {formatCurrency(g.expense)}
                  </span>
                  <span className="text-muted-foreground/70">
                    · {g.transactions.length} transaksi
                  </span>
                </div>

                {/* Transaction cards (right of the line) */}
                <div className="relative space-y-2">
                  {/* Per-day segment color overlay on the line */}
                  <div
                    className={cn(
                      "absolute -left-[22px] top-0 w-px",
                      isProfit ? "bg-emerald-500/60" : "bg-rose-500/60",
                    )}
                    style={{
                      height: `calc(100% - 4px)`,
                      left: "-21px",
                      width: "2px",
                    }}
                    aria-hidden
                  />

                  {g.transactions.map((t, ti) => {
                    const isIncome = t.type === "INCOME";
                    const cat = t.category;
                    return (
                      <motion.div
                        key={t.id}
                        initial={{ opacity: 0, x: -6 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(gi * 0.04 + ti * 0.05, 0.6),
                          type: "spring",
                          stiffness: 260,
                          damping: 22,
                        }}
                        className="relative"
                      >
                        {/* Per-transaction dot on the line */}
                        <span
                          className={cn(
                            "absolute -left-[26px] top-4 z-10 h-3 w-3 rounded-full border-2 border-background",
                            isIncome ? "bg-emerald-500" : "bg-rose-500",
                          )}
                          aria-hidden
                        />
                        <Card
                          className="group cursor-pointer p-3 transition-colors hover:bg-muted/40"
                          role="button"
                          tabIndex={0}
                          onClick={() => onEdit(t)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onEdit(t);
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                backgroundColor: cat
                                  ? `${cat.color}1a`
                                  : undefined,
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
                                {cat?.name ?? "Tanpa kategori"}
                                {t.time ? ` · ${t.time}` : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <span
                                className={cn(
                                  "text-sm font-semibold tabular-nums",
                                  isIncome ? "text-income" : "text-expense",
                                )}
                              >
                                {isIncome ? "+" : "−"}
                                {formatCurrency(t.amount)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground opacity-50 transition-opacity hover:opacity-100 group-hover:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEdit(t);
                                }}
                                aria-label="Edit transaksi"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
