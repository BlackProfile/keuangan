"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Flame,
  Lightbulb,
  Loader2,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Store,
  Tag,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatPercent,
  parseDateLocal,
} from "@/lib/format";
import {
  useAnalytics,
  useBills,
  useCreatePriceTrack,
  useDashboard,
  useFinancialTips,
  usePriceTracks,
  useSubscriptions,
} from "@/lib/hooks";
import type {
  AnalyticsData,
  DashboardData,
  FinancialTip,
  PriceTrack,
} from "@/lib/types";

/** Color per tip category (backend stores categories as lowercase strings). */
const TIP_CATEGORY_COLORS: Record<string, string> = {
  saving: "#10b981",
  budgeting: "#0891b2",
  investing: "#8b5cf6",
  student: "#f97316",
  general: "#6b7280",
};

export function InsightsSection() {
  const { data: dashboard, isLoading: dashLoading } = useDashboard();
  const { data: analytics, isLoading: anLoading } = useAnalytics();

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Insight Cerdas
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Skor kesehatan keuangan, tips harian, dan analisis pola pengeluaran
            Anda.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Health Score (col 1) */}
        <Card className="relative overflow-hidden border-border/60 p-5">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Activity className="h-4 w-4 text-primary" />
            Skor Kesehatan
          </div>
          {dashLoading || anLoading ? (
            <div className="mt-4 flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <HealthScore
              dashboard={dashboard}
              analytics={analytics}
            />
          )}
        </Card>

        {/* Daily Tip (col 2) */}
        <DailyTipCard />

        {/* Smart Insights (col 3) */}
        <SmartInsightsCard
          dashboard={dashboard}
          analytics={analytics}
          loading={dashLoading || anLoading}
        />
      </div>

      {/* Price Tracker (full width below) */}
      <PriceTrackerCard />
    </div>
  );
}

// =================== HEALTH SCORE ===================

interface HealthScoreProps {
  dashboard?: DashboardData;
  analytics?: AnalyticsData;
}

function HealthScore({ dashboard, analytics }: HealthScoreProps) {
  const { score, breakdown } = React.useMemo(
    () => computeHealthScore(dashboard, analytics),
    [dashboard, analytics]
  );

  const label =
    score >= 70
      ? { text: "Sehat", color: "#10b981" }
      : score >= 40
      ? { text: "Perlu Perhatian", color: "#f59e0b" }
      : { text: "Bahaya", color: "#ef4444" };

  const r = 52;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;

  return (
    <div className="mt-2 flex flex-col items-center">
      <div className="relative flex h-32 w-32 items-center justify-center">
        <svg
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 120 120"
          aria-hidden
        >
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted/30"
          />
          <motion.circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={label.color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${c - dash}`}
            initial={{ strokeDasharray: `0 ${c}` }}
            animate={{ strokeDasharray: `${dash} ${c - dash}` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </svg>
        <div className="flex flex-col items-center">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: label.color }}
          >
            {score}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            dari 100
          </span>
        </div>
      </div>
      <Badge
        className="mt-2 gap-1"
        style={{
          backgroundColor: `${label.color}1a`,
          color: label.color,
        }}
      >
        <Sparkles className="h-3 w-3" />
        {label.text}
      </Badge>

      <div className="mt-4 w-full space-y-2">
        {breakdown.map((b) => (
          <div key={b.label} className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">{b.label}</span>
              <span className="font-medium tabular-nums">
                {b.points.toFixed(0)}/{b.max}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: b.color }}
                initial={{ width: 0 }}
                animate={{ width: `${(b.points / b.max) * 100}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ScoreBreakdown {
  label: string;
  points: number;
  max: number;
  color: string;
}

function computeHealthScore(
  dashboard?: DashboardData,
  analytics?: AnalyticsData
): { score: number; breakdown: ScoreBreakdown[] } {
  const savingsRate = dashboard?.savingsRate ?? 0;
  // Savings: 0-100% → 0-40 points (capped at 50%)
  const savingsPoints = Math.min(40, (savingsRate / 50) * 40);

  // Budget adherence: ratio of safe budgets vs total budgets → 0-30 points
  const budgets = dashboard?.budgetStatuses ?? [];
  let budgetPoints = 0;
  if (budgets.length > 0) {
    const safeCount = budgets.filter(
      (b) => b.status === "safe" || b.status === "warning"
    ).length;
    budgetPoints = (safeCount / budgets.length) * 30;
  }

  // Consistency: monthTransactionCount vs target 15 → 0-30 points
  const monthCount = dashboard?.summary?.monthTransactionCount ?? 0;
  const consistencyPoints = Math.min(30, (monthCount / 15) * 30);

  const score = Math.round(savingsPoints + budgetPoints + consistencyPoints);

  return {
    score,
    breakdown: [
      {
        label: "Rasio Menabung",
        points: savingsPoints,
        max: 40,
        color: "#10b981",
      },
      {
        label: "Disiplin Anggaran",
        points: budgetPoints,
        max: 30,
        color: "#0891b2",
      },
      {
        label: "Konsistensi Pencatatan",
        points: consistencyPoints,
        max: 30,
        color: "#8b5cf6",
      },
    ],
  };
}

// =================== DAILY TIP ===================

function DailyTipCard() {
  const { data: tips, isLoading } = useFinancialTips();
  const [tipIndex, setTipIndex] = React.useState(0);

  // Pick a random tip when tips load
  React.useEffect(() => {
    if (tips && tips.length > 0) {
      setTipIndex(Math.floor(Math.random() * tips.length));
    }
  }, [tips]);

  function handleRefresh() {
    if (!tips || tips.length === 0) return;
    if (tips.length === 1) {
      toast.message("Hanya ada 1 tip tersedia");
      return;
    }
    let next = tipIndex;
    while (next === tipIndex) {
      next = Math.floor(Math.random() * tips.length);
    }
    setTipIndex(next);
  }

  const fallbackTip: FinancialTip = {
    id: "fallback",
    title: "Aturan 50/30/20",
    content:
      "Alokasikan 50% pendapatan untuk kebutuhan, 30% untuk keinginan, dan 20% untuk menabung atau berinvestasi.",
    category: "budgeting",
    icon: "Lightbulb",
    createdAt: new Date().toISOString(),
  };

  const tip = tips && tips.length > 0 ? tips[tipIndex] : fallbackTip;
  const tipColor = TIP_CATEGORY_COLORS[tip.category] ?? "#10b981";

  return (
    <Card className="relative overflow-hidden border-border/60 p-5">
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-10"
        style={{ backgroundColor: tipColor }}
        aria-hidden
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <Lightbulb className="h-4 w-4 text-primary" />
          Tip Hari Ini
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={handleRefresh}
          disabled={isLoading || (tips?.length ?? 0) <= 1}
          aria-label="Tip lain"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      ) : (
        <motion.div
          key={tip.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-3"
        >
          <div className="flex items-start gap-3">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: tipColor }}
            >
              <LucideIcon name={tip.icon || "Lightbulb"} className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{tip.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tip.content}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px] uppercase">
              {tip.category}
            </Badge>
            {(tips?.length ?? 0) > 0 && (
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                {tipIndex + 1} / {tips!.length}
              </Badge>
            )}
          </div>
        </motion.div>
      )}
    </Card>
  );
}

// =================== SMART INSIGHTS ===================

interface SmartInsightsProps {
  dashboard?: DashboardData;
  analytics?: AnalyticsData;
  loading: boolean;
}

function SmartInsightsCard({
  dashboard,
  analytics,
  loading,
}: SmartInsightsProps) {
  const insights = React.useMemo(
    () => buildInsights(dashboard, analytics),
    [dashboard, analytics]
  );

  return (
    <Card className="relative overflow-hidden border-border/60 p-5">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        Insight Otomatis
      </div>
      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 p-4 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Activity className="h-5 w-5" />
          </span>
          <p className="text-xs text-muted-foreground">
            Belum cukup data untuk menghasilkan insight. Catat lebih banyak
            transaksi untuk mendapat analisis otomatis.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {insights.map((ins, i) => (
            <motion.div
              key={`${ins.title}-${i}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-muted/30 p-2.5"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white"
                style={{ backgroundColor: ins.color }}
              >
                <LucideIcon name={ins.icon} className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold">{ins.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  {ins.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

interface InsightItem {
  title: string;
  body: string;
  icon: string;
  color: string;
}

function buildInsights(
  dashboard?: DashboardData,
  analytics?: AnalyticsData
): InsightItem[] {
  const out: InsightItem[] = [];
  if (!dashboard && !analytics) return out;

  // 1. Top spending category
  const topCat = dashboard?.expenseByCategory?.[0];
  if (topCat && topCat.total > 0) {
    out.push({
      title: "Kategori Pengeluaran Tertinggi",
      body: `${topCat.category.name}: ${formatCurrency(topCat.total)} (${formatPercent(
        topCat.percentage
      )} dari total pengeluaran).`,
      icon: topCat.category.icon || "Tag",
      color: topCat.category.color || "#10b981",
    });
  }

  // 2. Comparison vs last month
  if (analytics?.monthComparison) {
    const mc = analytics.monthComparison;
    const change = mc.expenseChange;
    if (Number.isFinite(change) && change !== 0) {
      const isUp = change > 0;
      out.push({
        title: isUp
          ? "Pengeluaran Naik Bulan Ini"
          : "Pengeluaran Berkurang Bulan Ini",
        body: `Bulan ini ${formatCurrency(mc.current.expense)} vs bulan lalu ${formatCurrency(
          mc.previous.expense
        )} (${formatPercent(Math.abs(change), true)}).`,
        icon: isUp ? "TrendingUp" : "TrendingDown",
        color: isUp ? "#ef4444" : "#10b981",
      });
    }
  }

  // 3. Top merchant
  if (analytics?.topMerchants && analytics.topMerchants.length > 0) {
    const top = analytics.topMerchants[0];
    if (top.total > 0) {
      out.push({
        title: "Merchant Paling Sering Dikunjungi",
        body: `${top.merchant}: ${formatCurrency(top.total)} dalam ${top.count} transaksi.`,
        icon: "Store",
        color: "#f97316",
      });
    }
  }

  // 4. Top spending weekday
  if (analytics?.weekdaySpending && analytics.weekdaySpending.length > 0) {
    const top = [...analytics.weekdaySpending].sort(
      (a, b) => b.total - a.total
    )[0];
    if (top.total > 0) {
      out.push({
        title: "Hari Pengeluaran Tertinggi",
        body: `Pengeluaran ${top.day} paling tinggi: ${formatCurrency(
          top.total
        )} (${top.count} transaksi).`,
        icon: "CalendarDays",
        color: "#8b5cf6",
      });
    }
  }

  // 5. Savings rate insight
  const sr = dashboard?.savingsRate ?? 0;
  if (sr > 0) {
    out.push({
      title: sr >= 20 ? "Rasio Menabung Baik" : "Rasio Menabung Rendah",
      body:
        sr >= 20
          ? `Savings rate ${formatPercent(sr)} — pertahankan! Target ideal 20%+.`
          : `Savings rate ${formatPercent(
              sr
            )}. Pertimbangkan menambah porsi menabung ke 20%+ dari pendapatan.`,
      icon: sr >= 20 ? "TrendingUp" : "TrendingDown",
      color: sr >= 20 ? "#10b981" : "#f59e0b",
    });
  }

  return out.slice(0, 5);
}

// =================== PRICE TRACKER ===================

function PriceTrackerCard() {
  const { data: tracksResponse, isLoading } = usePriceTracks();
  const createMut = useCreatePriceTrack();

  const [itemName, setItemName] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [showAll, setShowAll] = React.useState(false);

  // Backend returns { groups: [...], total }. Flatten entries across groups
  // so we can render a single chronological list of price observations.
  const sortedTracks = React.useMemo<PriceTrack[]>(() => {
    const groups = tracksResponse?.groups ?? [];
    const flat: PriceTrack[] = groups.flatMap((g) => g.entries ?? []);
    return flat.sort(
      (a, b) =>
        parseDateLocal(b.date).getTime() - parseDateLocal(a.date).getTime()
    );
  }, [tracksResponse]);

  const visibleTracks = showAll ? sortedTracks : sortedTracks.slice(0, 5);

  // Group by itemName to show "lowest / highest" per item (uses backend's
  // pre-computed minPrice/maxPrice when available).
  const itemStats = React.useMemo(() => {
    const map = new Map<
      string,
      { min: number; max: number; count: number; stores: Set<string> }
    >();
    for (const g of tracksResponse?.groups ?? []) {
      map.set(g.itemName.toLowerCase(), {
        min: g.minPrice,
        max: g.maxPrice,
        count: g.count,
        stores: new Set(g.merchants ?? []),
      });
    }
    return map;
  }, [tracksResponse]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) {
      toast.error("Nama barang wajib diisi");
      return;
    }
    const amt = Number(price);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast.error("Harga harus lebih dari 0");
      return;
    }
    createMut.mutate(
      {
        itemName: itemName.trim(),
        price: amt,
        merchant: merchant.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Harga dicatat", {
            description: `${itemName.trim()}: ${formatCurrency(amt)}`,
          });
          setItemName("");
          setPrice("");
          setMerchant("");
        },
        onError: (e: Error) =>
          toast.error("Gagal menyimpan harga", { description: e.message }),
      }
    );
  }

  return (
    <Card className="border-border/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Pelacak Harga Barang
        </div>
        <Badge variant="outline" className="text-xs">
          {sortedTracks.length} catatan
        </Badge>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px_1fr_auto]"
      >
        <Input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          placeholder="Nama barang (cth. Beras 5kg)"
          aria-label="Nama barang"
          required
        />
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Harga (Rp)"
          aria-label="Harga"
          required
        />
        <Input
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          placeholder="Toko (opsional)"
          aria-label="Toko"
        />
        <Button
          type="submit"
          disabled={createMut.isPending}
          className="gap-1.5"
        >
          {createMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Catat
        </Button>
      </form>

      <Separator className="my-4" />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : sortedTracks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <ShoppingBag className="h-5 w-5" />
          </span>
          <p className="text-xs text-muted-foreground">
            Belum ada catatan harga. Catat harga barang yang sering dibeli untuk
            memantau perubahan harga dari waktu ke waktu.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visibleTracks.map((t) => {
            const stat = itemStats.get(t.itemName.toLowerCase());
            const isLowest = stat && t.price === stat.min;
            const isHighest = stat && t.price === stat.max && stat.min !== stat.max;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-muted/30 p-2.5"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Tag className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.itemName}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>{formatDate(t.date)}</span>
                      {t.merchant && (
                        <>
                          <span aria-hidden>·</span>
                          <span className="inline-flex items-center gap-0.5">
                            <Store className="h-3 w-3" />
                            {t.merchant}
                          </span>
                        </>
                      )}
                      {isLowest && (
                        <Badge className="bg-emerald-100 px-1.5 py-0 text-[10px] text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-400">
                          <TrendingDown className="mr-0.5 h-2.5 w-2.5" />
                          Termurah
                        </Badge>
                      )}
                      {isHighest && (
                        <Badge className="bg-red-100 px-1.5 py-0 text-[10px] text-red-700 hover:bg-red-100 dark:bg-red-500/15 dark:text-red-400">
                          <TrendingUp className="mr-0.5 h-2.5 w-2.5" />
                          Termahal
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums">
                  {formatCurrency(t.price)}
                </p>
              </motion.div>
            );
          })}

          {sortedTracks.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {showAll
                ? "Tampilkan lebih sedikit"
                : `Lihat ${sortedTracks.length - 5} catatan lainnya`}
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  showAll && "rotate-180"
                )}
              />
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
