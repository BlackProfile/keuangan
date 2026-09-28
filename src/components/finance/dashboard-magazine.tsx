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
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  getGreeting,
  getMonthKey,
  relativeDay,
} from "@/lib/format";
import { useAnalytics, useDashboard } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";

interface Props {
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onViewAll: () => void;
}

// Magazine palette
const TERRACOTTA = "#E07A5F";
const SAGE = "#81B29A";
const CREAM = "#F4F1DE";
const SLATE = "#3D405B";
const STONE_BG = "#FAF8F3";

export function DashboardMagazine({ onAdd, onEdit, onViewAll }: Props) {
  const [greeting, setGreeting] = React.useState<string>("");
  React.useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);
  const { data: analytics } = useAnalytics(monthKey);

  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];
  const expenseByCategory = data?.expenseByCategory ?? [];
  const monthComparison = analytics?.monthComparison;

  // Feature story narrative based on month comparison
  const featureNarrative = React.useMemo(() => {
    if (!monthComparison || isLoading) return null;
    if (monthComparison.previous.expense === 0) {
      return "Bulan ini menjadi awal baru catatan keuanganmu — belum ada pembanding dari bulan lalu, jadi setiap rupiah yang kamu catat akan jadi baseline untuk cerita ke depan.";
    }
    const diff = monthComparison.previous.expense - monthComparison.current.expense;
    const pct = Math.abs(Math.round(monthComparison.expenseChange));
    if (diff > 0) {
      return `Kamu menabung ${pct}% lebih banyak dari bulan lalu — pengeluaran turun ${formatCurrencyCompact(diff)}. Pertahankan ritme ini, dan biarkan tabungan yang berbicara.`;
    }
    if (diff < 0) {
      return `Pengeluaran naik ${pct}% dari bulan lalu — tambahan ${formatCurrencyCompact(Math.abs(diff))}. Cek kategori yang paling banyak naik, mungkin ada jajan tak terduga yang bisa diperhalus bulan depan.`;
    }
    return "Pengeluaranmu stabil dibanding bulan lalu — konsistensi yang bagus untuk dibanggana.";
  }, [monthComparison, isLoading]);

  // For top expense bar chart
  const topCategories = expenseByCategory.slice(0, 5);
  const maxCat = topCategories[0]?.total ?? 1;

  return (
    <div
      className="min-h-screen space-y-6 px-1 py-2 sm:px-2"
      style={{ backgroundColor: STONE_BG, fontFamily: "Georgia, serif" }}
    >
      {/* ============== EDITORIAL HEADER ============== */}
      <header className="border-b pb-6" style={{ borderColor: `${SLATE}30` }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="text-[10px] uppercase tracking-[0.3em]"
              style={{ color: TERRACOTTA, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
            >
              {greeting || "Halo"} · Edisi Bulan Ini
            </p>
            <h1
              className="mt-1 text-4xl font-bold tracking-tight sm:text-5xl"
              style={{ color: SLATE, fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              DompetKu
            </h1>
            <p
              className="mt-2 text-sm italic"
              style={{ color: SLATE, opacity: 0.7 }}
            >
              “Uang yang dicatat akan tumbuh. Uang yang dilupakan, menguap.”
            </p>
          </div>
          <Button
            onClick={onAdd}
            size="sm"
            className="shrink-0 gap-1.5 border-2"
            style={{
              backgroundColor: CREAM,
              color: SLATE,
              borderColor: SLATE,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Tulis</span>
          </Button>
        </div>
      </header>

      {/* ============== HERO — Big Saldo ============== */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <article
          className="sm:col-span-2 rounded-lg p-6"
          style={{
            backgroundColor: "white",
            border: `1px solid ${SLATE}25`,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: TERRACOTTA, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            Saldo Saat Ini
          </p>
          <SaldoDisplay
            amount={summary?.balance ?? 0}
            isLoading={isLoading}
          />
          <div className="mt-6 grid grid-cols-2 gap-4 border-t pt-4" style={{ borderColor: `${SLATE}20` }}>
            <StatBox
              label="Pemasukan Bulan Ini"
              value={isLoading ? "—" : formatCurrencyCompact(summary?.monthIncome ?? 0)}
              color={SAGE}
              icon={<TrendingUp className="h-3 w-3" />}
            />
            <StatBox
              label="Pengeluaran Bulan Ini"
              value={isLoading ? "—" : formatCurrencyCompact(summary?.monthExpense ?? 0)}
              color={TERRACOTTA}
              icon={<TrendingDown className="h-3 w-3" />}
            />
          </div>
        </article>

        {/* Side editorial quote card */}
        <aside
          className="rounded-lg p-6"
          style={{
            backgroundColor: SLATE,
            color: CREAM,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-[0.25em]"
            style={{ color: SAGE, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
          >
            Tingkat Tabung
          </p>
          <p
            className="mt-3 text-5xl font-bold tabular-nums"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {isLoading ? "—" : `${Math.round(summary?.savingsRate ?? 0)}%`}
          </p>
          <p className="mt-3 text-xs italic leading-relaxed" style={{ opacity: 0.8 }}>
            “Setiap persen yang kamu simpan adalah pilihan tenang di tengah
            riuhnya godaan jajan.”
          </p>
        </aside>
      </section>

      {/* ============== FEATURE STORY ============== */}
      {featureNarrative && (
        <section
          className="rounded-lg p-6"
          style={{
            backgroundColor: CREAM,
            border: `1px solid ${SLATE}20`,
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="flex h-1 w-12"
              style={{ backgroundColor: TERRACOTTA }}
            />
            <p
              className="text-[10px] uppercase tracking-[0.25em]"
              style={{
                color: TERRACOTTA,
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Laporan Bulan Ini
            </p>
          </div>
          <h2
            className="mt-3 text-2xl font-bold leading-tight"
            style={{ color: SLATE, fontFamily: "Georgia, serif" }}
          >
            {monthComparison && monthComparison.expenseChange < 0
              ? "Bulan yang Lebih Hemat"
              : monthComparison && monthComparison.expenseChange > 0
                ? "Bulan yang Lebih Boros"
                : "Bulan yang Stabil"}
          </h2>
          <p
            className="mt-3 text-[15px] leading-relaxed"
            style={{ color: SLATE, fontFamily: "Georgia, serif", lineHeight: 1.7 }}
          >
            {featureNarrative}
          </p>
          {monthComparison && (
            <div className="mt-5 flex items-center gap-6 border-t pt-4" style={{ borderColor: `${SLATE}20` }}>
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: SLATE, opacity: 0.6, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                  Bulan Ini
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: SLATE, fontFamily: "Georgia, serif" }}>
                  {formatCurrencyCompact(monthComparison.current.expense)}
                </p>
              </div>
              <ArrowRight className="h-4 w-4" style={{ color: TERRACOTTA }} />
              <div>
                <p className="text-[10px] uppercase tracking-widest" style={{ color: SLATE, opacity: 0.6, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
                  Bulan Lalu
                </p>
                <p className="mt-1 text-lg font-semibold tabular-nums" style={{ color: SLATE, opacity: 0.7, fontFamily: "Georgia, serif" }}>
                  {formatCurrencyCompact(monthComparison.previous.expense)}
                </p>
              </div>
              <div className="ml-auto">
                {monthComparison.expenseChange < 0 ? (
                  <span
                    className="flex items-center gap-1 text-sm font-medium"
                    style={{ color: SAGE, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    {Math.abs(Math.round(monthComparison.expenseChange))}%
                  </span>
                ) : monthComparison.expenseChange > 0 ? (
                  <span
                    className="flex items-center gap-1 text-sm font-medium"
                    style={{ color: TERRACOTTA, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    {Math.round(monthComparison.expenseChange)}%
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ============== TOP EXPENSES — Bar visualization ============== */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <span className="h-1 w-12" style={{ backgroundColor: SAGE }} />
          <h3
            className="text-xl font-bold"
            style={{ color: SLATE, fontFamily: "Georgia, serif" }}
          >
            Pengeluaran Teratas
          </h3>
        </div>
        {isLoading ? (
          <Skeleton className="h-32 w-full rounded-lg" />
        ) : topCategories.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-6 text-center"
            style={{ borderColor: `${SLATE}30`, color: SLATE, opacity: 0.6 }}
          >
            Belum ada pengeluaran bulan ini.
          </div>
        ) : (
          <div
            className="space-y-3 rounded-lg p-6"
            style={{
              backgroundColor: "white",
              border: `1px solid ${SLATE}20`,
            }}
          >
            {topCategories.map((cat, idx) => {
              const pct = Math.round((cat.total / maxCat) * 100);
              const color = [TERRACOTTA, SAGE, SLATE, "#C9A87C", "#A5A5A5"][idx % 5];
              return (
                <div key={cat.category.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <p
                      className="truncate text-sm font-medium"
                      style={{ color: SLATE, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                    >
                      {cat.category.name}
                    </p>
                    <p
                      className="shrink-0 text-xs tabular-nums"
                      style={{ color: SLATE, opacity: 0.7, fontFamily: "ui-sans-serif, system-ui, sans-serif" }}
                    >
                      {formatCurrencyCompact(cat.total)} ·{" "}
                      <span style={{ color }}>{Math.round(cat.percentage)}%</span>
                    </p>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full"
                    style={{ backgroundColor: `${SLATE}10` }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: idx * 0.08, ease: "easeOut" }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ============== TRANSACTIONS — Two-column masonry ============== */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-1 w-12" style={{ backgroundColor: TERRACOTTA }} />
            <h3
              className="text-xl font-bold"
              style={{ color: SLATE, fontFamily: "Georgia, serif" }}
            >
              Catatan Terbaru
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="gap-1 text-xs"
            style={{
              color: TERRACOTTA,
              fontFamily: "ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Lihat Semua
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="columns-1 gap-4 sm:columns-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="mb-4 h-24 w-full break-inside-avoid rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div
            className="rounded-lg border border-dashed p-8 text-center"
            style={{ borderColor: `${SLATE}30` }}
          >
            <p
              className="text-sm italic"
              style={{ color: SLATE, opacity: 0.6 }}
            >
              Halaman ini menunggu catatan pertamamu.
            </p>
            <Button
              onClick={onAdd}
              size="sm"
              className="mt-4 gap-1"
              style={{
                backgroundColor: TERRACOTTA,
                color: "white",
                fontFamily: "ui-sans-serif, system-ui, sans-serif",
              }}
            >
              <Plus className="h-4 w-4" />
              Tulis Catatan
            </Button>
          </div>
        ) : (
          <div className="columns-1 gap-4 sm:columns-2">
            {recent.slice(0, 6).map((t, idx) => (
              <MagazineTxnCard
                key={t.id}
                t={t}
                idx={idx}
                onClick={() => onEdit(t)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SaldoDisplay({
  amount,
  isLoading,
}: {
  amount: number;
  isLoading: boolean;
}) {
  const [show, setShow] = React.useState(true);
  return (
    <div className="mt-3 flex items-center gap-3">
      <p
        className="text-4xl font-bold tabular-nums sm:text-5xl"
        style={{ color: SLATE, fontFamily: "Georgia, serif", letterSpacing: "-0.02em" }}
      >
        {isLoading ? (
          "···"
        ) : show ? (
          <>
            <span style={{ fontSize: "1.5rem", opacity: 0.6 }}>Rp</span>{" "}
            {Math.round(amount).toLocaleString("id-ID")}
          </>
        ) : (
          "•••••••"
        )}
      </p>
      <button
        onClick={() => setShow((p) => !p)}
        aria-label={show ? "Sembunyikan saldo" : "Tampilkan saldo"}
        className="text-stone/60 hover:text-stone"
        style={{ color: SLATE, opacity: 0.5 }}
      >
        {show ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ color: SLATE, opacity: 0.6 }}
        >
          {label}
        </p>
      </div>
      <p
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{ color: SLATE, fontFamily: "Georgia, serif" }}
      >
        {value}
      </p>
    </div>
  );
}

function MagazineTxnCard({
  t,
  idx,
  onClick,
}: {
  t: Transaction;
  idx: number;
  onClick: () => void;
}) {
  const isIncome = t.type === "INCOME";
  const cat = t.category;
  // Vary card style by parity (so masonry looks editorial, not uniform)
  const accent = idx % 2 === 0 ? TERRACOTTA : SAGE;
  return (
    <button
      onClick={onClick}
      className="mb-4 block w-full break-inside-avoid rounded-lg p-4 text-left transition-transform hover:scale-[1.01]"
      style={{
        backgroundColor: "white",
        border: `1px solid ${SLATE}20`,
        borderLeft: `3px solid ${accent}`,
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ color: accent }}
        >
          {cat?.name ?? "Tanpa Kategori"}
        </p>
        <p className="text-[10px] tabular-nums" style={{ color: SLATE, opacity: 0.5 }}>
          {relativeDay(t.date)}
        </p>
      </div>
      <h4
        className="mt-2 text-base font-bold leading-snug"
        style={{ color: SLATE, fontFamily: "Georgia, serif" }}
      >
        {t.description}
      </h4>
      <div className="mt-3 flex items-center justify-between border-t pt-2" style={{ borderColor: `${SLATE}15` }}>
        <span
          className="flex items-center gap-1 text-[10px]"
          style={{ color: SLATE, opacity: 0.6 }}
        >
          <LucideIcon
            name={cat?.icon ?? "Circle"}
            className="h-3 w-3"
            style={{ color: cat?.color ?? SLATE }}
          />
          {formatDate(t.date)}
        </span>
        <p
          className="text-base font-bold tabular-nums"
          style={{
            color: isIncome ? SAGE : TERRACOTTA,
            fontFamily: "Georgia, serif",
          }}
        >
          {isIncome ? "+" : "−"}
          {formatCurrency(t.amount)}
        </p>
      </div>
    </button>
  );
}
