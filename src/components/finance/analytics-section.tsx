"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  Brain,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Lightbulb,
  Minus,
  PieChart as PieIcon,
  Sparkles,
  Store,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatCurrencyAxis,
  formatPercent,
  getMonthKey,
  getMonthYearLabel,
} from "@/lib/format";
import { useAnalytics } from "@/lib/hooks";
import type { AnalyticsData } from "@/lib/types";

// Explicit chart colors (resolved at render time, no CSS var dependency)
const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";

export function AnalyticsSection() {
  const now = new Date();
  const [viewDate, setViewDate] = React.useState<Date>(now);
  const monthKey = getMonthKey(viewDate);
  const isCurrentMonth =
    viewDate.getFullYear() === now.getFullYear() &&
    viewDate.getMonth() === now.getMonth();

  const { data, isLoading } = useAnalytics(monthKey);

  function prevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }
  function nextMonth() {
    if (isCurrentMonth) return;
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  const comparison = data?.monthComparison;
  const hasData =
    !!data &&
    (!!comparison &&
      (comparison.current.count > 0 || comparison.previous.count > 0)) ||
    (!!data?.monthlyTrend &&
      data.monthlyTrend.some((m) => m.income > 0 || m.expense > 0));

  return (
    <div className="space-y-5">
      {/* Header with month navigation */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <BarChart3 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Analitik</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Wawasan &amp; pola keuangan Anda
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 self-start sm:self-auto">
          <Button
            variant="outline"
            size="icon"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[7rem] text-center text-sm font-medium">
            {getMonthYearLabel(viewDate)}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={nextMonth}
            disabled={isCurrentMonth}
            aria-label="Bulan berikutnya"
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <AnalyticsSkeleton />
      ) : !hasData || !data ? (
        <EmptyAnalytics />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Month comparison cards */}
          <ComparisonRow comparison={comparison!} />

          {/* Insights + Ratios */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <InsightsCard
              insights={data.insights}
              className="lg:col-span-2"
            />
            <RatiosCard ratios={data.ratios} />
          </div>

          {/* Top merchants + Top categories */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopMerchantsCard merchants={data.topMerchants} />
            <TopCategoriesCard categories={data.topCategories} />
          </div>

          {/* Weekday + Monthly trend */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <WeekdaySpendingCard weekday={data.weekdaySpending} />
            <MonthlyTrendCard trend={data.monthlyTrend} />
          </div>

          {/* Forecast */}
          <ForecastCard forecast={data.forecast} viewDate={viewDate} />
        </motion.div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison row — 3 cards: income / expense / balance with MoM change %
// ---------------------------------------------------------------------------

function ComparisonRow({
  comparison,
}: {
  comparison: AnalyticsData["monthComparison"];
}) {
  const { current, previous } = comparison;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ComparisonCard
        title="Pemasukan"
        icon={<TrendingUp className="h-4 w-4" />}
        current={current.income}
        previous={previous.income}
        change={comparison.incomeChange}
        polarity="income"
        accent="bg-income-soft text-income"
      />
      <ComparisonCard
        title="Pengeluaran"
        icon={<TrendingDown className="h-4 w-4" />}
        current={current.expense}
        previous={previous.expense}
        change={comparison.expenseChange}
        polarity="expense"
        accent="bg-expense-soft text-expense"
      />
      <ComparisonCard
        title="Sisa Saldo"
        icon={<Wallet className="h-4 w-4" />}
        current={current.balance}
        previous={previous.balance}
        change={comparison.balanceChange}
        polarity="income"
        accent="bg-accent text-accent-foreground"
      />
    </div>
  );
}

function ComparisonCard({
  title,
  icon,
  current,
  previous,
  change,
  polarity,
  accent,
}: {
  title: string;
  icon: React.ReactNode;
  current: number;
  previous: number;
  change: number;
  polarity: "income" | "expense";
  accent: string;
}) {
  // income/balance: positive change = good (green); expense: negative change = good (green)
  const isImprovement =
    polarity === "income" ? change > 0 : change < 0;
  const isWorsening =
    polarity === "income" ? change < 0 : change > 0;

  const changeColor = isImprovement
    ? "text-income"
    : isWorsening
      ? "text-expense"
      : "text-muted-foreground";

  const ChangeIcon =
    change > 0.05 ? TrendingUp : change < -0.05 ? TrendingDown : Minus;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              accent
            )}
          >
            {icon}
          </span>
          <p className="text-sm font-medium text-foreground">{title}</p>
        </div>
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-semibold tabular-nums",
            changeColor
          )}
        >
          <ChangeIcon className="h-3.5 w-3.5" />
          {formatPercent(change, true)}
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-foreground">
        {formatCurrency(current)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Bulan lalu: {formatCurrency(previous)}
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Insights card — list of strings with lightbulb icons
// ---------------------------------------------------------------------------

function InsightsCard({
  insights,
  className,
}: {
  insights: string[];
  className?: string;
}) {
  return (
    <Card className={cn("p-5", className)}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
          <Lightbulb className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Wawasan</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Catatan otomatis dari pola keuanganmu
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {insights.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <Lightbulb className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Belum ada wawasan untuk bulan ini.
            </p>
          </div>
        ) : (
          <ul className="max-h-72 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
            {insights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span className="text-sm text-foreground">{insight}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Ratios card — savings rate / expense ratio / income-to-expense ratio
// ---------------------------------------------------------------------------

function RatiosCard({ ratios }: { ratios: AnalyticsData["ratios"] }) {
  const savingsRate = ratios.savingsRate; // % ideal >= 20
  const expenseRatio = ratios.expenseRatio; // % ideal < 70
  const itoeRatio = ratios.incomeToExpenseRatio; // ideal >= 1.5

  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Gauge className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Rasio Keuangan</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Indikator kesehatan
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <RatioRow
          label="Savings Rate"
          value={formatPercent(savingsRate)}
          progress={Math.min(100, (savingsRate / 20) * 100)}
          ideal="≥ 20%"
          good={savingsRate >= 20}
          warning={savingsRate >= 10 && savingsRate < 20}
        />
        <RatioRow
          label="Rasio Pengeluaran"
          value={formatPercent(expenseRatio)}
          progress={Math.min(100, ((100 - expenseRatio) / 30) * 100)}
          ideal="< 70%"
          good={expenseRatio < 70}
          warning={expenseRatio >= 70 && expenseRatio < 90}
        />
        <RatioRow
          label="Pemasukan / Pengeluaran"
          value={`${itoeRatio.toFixed(2).replace(".", ",")}×`}
          progress={Math.min(100, (itoeRatio / 1.5) * 100)}
          ideal="≥ 1,5×"
          good={itoeRatio >= 1.5}
          warning={itoeRatio >= 1 && itoeRatio < 1.5}
        />
      </CardContent>
    </Card>
  );
}

function RatioRow({
  label,
  value,
  progress,
  ideal,
  good,
  warning,
}: {
  label: string;
  value: string;
  progress: number;
  ideal: string;
  good: boolean;
  warning: boolean;
}) {
  const barColor = good
    ? "bg-income"
    : warning
      ? "bg-amber-500"
      : "bg-expense";
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{
            width: `${Math.max(0, Math.min(100, progress))}%`,
          }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Ideal: {ideal}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top merchants — horizontal bar list (top 8)
// ---------------------------------------------------------------------------

function TopMerchantsCard({
  merchants,
}: {
  merchants: AnalyticsData["topMerchants"];
}) {
  const maxTotal =
    merchants.length > 0 ? merchants[0]!.total : 0;

  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Store className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Merchant Teratas</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            8 merchant dengan pengeluaran terbesar
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {merchants.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <Store className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Belum ada merchant tercatat bulan ini.
            </p>
          </div>
        ) : (
          <div className="max-h-80 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
            {merchants.map((m, i) => (
              <div key={`${m.merchant}-${i}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-foreground">
                      {m.merchant}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-foreground">
                    {formatCurrencyCompact(m.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${
                          maxTotal > 0 ? (m.total / maxTotal) * 100 : 0
                        }%`,
                        backgroundColor: EXPENSE_COLOR,
                      }}
                    />
                  </div>
                  <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {m.count}×
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Top categories — pie chart of top 5 expense categories
// ---------------------------------------------------------------------------

function TopCategoriesCard({
  categories,
}: {
  categories: AnalyticsData["topCategories"];
}) {
  const total = categories.reduce((s, c) => s + c.total, 0);

  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <PieIcon className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Kategori Teratas</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            5 kategori pengeluaran terbesar bulan ini
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
            <PieIcon className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">
              Belum ada pengeluaran bulan ini.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-36 w-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categories.map((c) => ({
                      name: c.category.name,
                      total: c.total,
                      percentage: c.percentage,
                      color: c.category.color,
                    }))}
                    dataKey="total"
                    nameKey="name"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {categories.map((c) => (
                      <Cell
                        key={c.category.id}
                        fill={c.category.color}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CategoryTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[10px] text-muted-foreground">
                  Total
                </span>
                <span className="text-sm font-bold tabular-nums">
                  {formatCurrencyCompact(total)}
                </span>
              </div>
            </div>
            <div className="max-h-36 w-full flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
              {categories.map((c) => (
                <div key={c.category.id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <LucideIcon
                        name={c.category.icon}
                        className="h-3.5 w-3.5 shrink-0"
                        style={{ color: c.category.color }}
                      />
                      <span className="truncate text-foreground">
                        {c.category.name}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums text-foreground">
                      {formatCurrencyCompact(c.total)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(c.percentage, 100)}%`,
                        backgroundColor: c.category.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: {
      name?: string;
      total?: number;
      percentage?: number;
    };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{d.name}</div>
      <div className="mt-0.5 text-muted-foreground">
        {formatCurrency(d.total ?? 0)}
      </div>
      <div className="text-muted-foreground">
        {d.percentage?.toFixed(1).replace(".", ",")}%
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Weekday spending — bar chart Mon–Sun
// ---------------------------------------------------------------------------

function WeekdaySpendingCard({
  weekday,
}: {
  weekday: AnalyticsData["weekdaySpending"];
}) {
  const hasData = weekday.some((d) => d.total > 0);
  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <CalendarRange className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Pengeluaran per Hari</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Senin–Minggu bulan ini
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasData ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <CalendarRange className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Belum ada pengeluaran bulan ini.
            </p>
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weekday}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrencyAxis(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Tooltip
                  cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                  content={<WeekdayTooltip />}
                />
                <Bar
                  dataKey="total"
                  name="Pengeluaran"
                  fill={EXPENSE_COLOR}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeekdayTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { day?: string; total?: number; count?: number };
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{d.day}</div>
      <div className="mt-0.5 text-muted-foreground">
        {formatCurrency(d.total ?? 0)}
      </div>
      <div className="text-muted-foreground">
        {d.count ?? 0} transaksi
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monthly trend — line chart of last 6 months (income vs expense)
// ---------------------------------------------------------------------------

function MonthlyTrendCard({
  trend,
}: {
  trend: AnalyticsData["monthlyTrend"];
}) {
  // Filter leading zero months (only show from first month with any data)
  const filtered = React.useMemo(() => {
    if (!trend || trend.length === 0) return [];
    const firstWith = trend.findIndex(
      (m) => m.income > 0 || m.expense > 0
    );
    if (firstWith <= 0) return trend;
    return trend.slice(Math.max(0, firstWith));
  }, [trend]);

  const hasData = filtered.length > 0;

  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <TrendingUp className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">Tren Bulanan</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            6 bulan terakhir
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!hasData ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Belum ada data cukup untuk tren.
            </p>
          </div>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filtered}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrencyAxis(Number(v))}
                  tickLine={false}
                  axisLine={false}
                  width={42}
                  tick={{
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <Tooltip content={<TrendTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  iconType="circle"
                />
                <Line
                  type="monotone"
                  name="Pemasukan"
                  dataKey="income"
                  stroke={INCOME_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: INCOME_COLOR }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  name="Pengeluaran"
                  dataKey="expense"
                  stroke={EXPENSE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 3, fill: EXPENSE_COLOR }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number;
    color?: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {formatCurrency(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Forecast — predicted next month income/expense based on 3-month avg
// ---------------------------------------------------------------------------

function ForecastCard({
  forecast,
  viewDate,
}: {
  forecast: AnalyticsData["forecast"];
  viewDate: Date;
}) {
  const nextMonth = new Date(
    viewDate.getFullYear(),
    viewDate.getMonth() + 1,
    1
  );
  const nextMonthLabel = getMonthYearLabel(nextMonth);

  return (
    <Card className="p-5">
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 p-0 pb-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
          <Brain className="h-4 w-4" />
        </span>
        <div>
          <CardTitle className="text-base">
            Prediksi {nextMonthLabel}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Berdasarkan rata-rata 3 bulan terakhir
          </p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ForecastStat
            label="Pemasukan"
            value={formatCurrency(forecast.nextMonthIncome)}
            icon={<TrendingUp className="h-4 w-4" />}
            color="text-income"
            bg="bg-income-soft"
          />
          <ForecastStat
            label="Pengeluaran"
            value={formatCurrency(forecast.nextMonthExpense)}
            icon={<TrendingDown className="h-4 w-4" />}
            color="text-expense"
            bg="bg-expense-soft"
          />
          <ForecastStat
            label="Savings Rate"
            value={formatPercent(forecast.savingsRate)}
            icon={<Target className="h-4 w-4" />}
            color="text-primary"
            bg="bg-accent"
          />
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          * Prediksi memakai rata-rata 3 bulan terakhir (termasuk bulan yang
          sedang dilihat). Hasil aktual dapat berbeda tergantung pola transaksi
          Anda.
        </p>
      </CardContent>
    </Card>
  );
}

function ForecastStat({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border p-3",
        bg
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={color}>{icon}</span>
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
      <p className={cn("mt-2 text-lg font-bold tabular-nums", color)}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeletons & empty states
// ---------------------------------------------------------------------------

function AnalyticsSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-2xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
      <Skeleton className="h-48 rounded-2xl" />
    </div>
  );
}

function EmptyAnalytics() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
        <Sparkles className="h-7 w-7 text-muted-foreground" />
      </span>
      <div>
        <p className="text-base font-medium text-foreground">
          Belum ada data untuk dianalisis
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Mulai catat transaksi untuk melihat wawasan keuangan Anda di sini.
        </p>
      </div>
    </div>
  );
}
