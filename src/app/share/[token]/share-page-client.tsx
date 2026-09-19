"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Clock,
  Download,
  Eye,
  Hash,
  Layers,
  Loader2,
  Lock,
  MessageCircle,
  MessagesSquare,
  Pin,
  Printer,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyAxis,
  formatCurrencyCompact,
  formatDate,
  formatDateLong,
  getMonthLabel,
  parseDateLocal,
  relativeDay,
} from "@/lib/format";
import type {
  CategoryBreakdown,
  MonthlyData,
  ShareComment,
  ShareLink,
  Transaction,
} from "@/lib/types";
import { SHARE_ACCESS_LEVELS, viewsRemaining } from "@/lib/share-helpers";

interface Props {
  token: string;
  link: ShareLink;
  data: {
    transactions: Transaction[];
    summary: {
      totalIncome: number;
      totalExpense: number;
      balance: number;
      count: number;
    };
    categoryBreakdown: CategoryBreakdown[];
    expired: boolean;
  };
  comments: ShareComment[];
  viewsRemaining: number | null;
  viewCount: number;
}

const INCOME_COLOR = "#10b981";
const EXPENSE_COLOR = "#f43f5e";

export function SharePageClient({
  token,
  link,
  data,
  comments: initialComments,
  viewsRemaining,
  viewCount,
}: Props) {
  const themeColor = link.customTheme || "#10b981";
  const canComment =
    link.accessLevel === "COMMENT" ||
    link.accessLevel === "WRITE" ||
    link.accessLevel === "ADMIN";
  const canExport =
    link.accessLevel === "VIEW" ||
    link.accessLevel === "COMMENT" ||
    link.accessLevel === "WRITE" ||
    link.accessLevel === "ADMIN";

  // Apply custom theme as a CSS variable on the root wrapper
  const themeStyle = React.useMemo(
    () =>
      ({
        ["--share-theme" as string]: themeColor,
      }) as React.CSSProperties,
    [themeColor],
  );

  // State for the "reply-to-transaction" workflow: when the user clicks the
  // comment button on a transaction row, this gets set; the comments section
  // reads it to pre-select that transaction in the form.
  const [replyToTransaction, setReplyToTransaction] =
    React.useState<Transaction | null>(null);

  return (
    <div
      style={themeStyle}
      className="flex min-h-screen flex-col bg-gradient-to-b from-background to-muted/30"
    >
      <ShareHeader
        link={link}
        viewsRemaining={viewsRemaining}
        viewCount={viewCount}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="space-y-5">
          {/* Hero summary */}
          <SummaryHero link={link} data={data} />

          {/* Hidden amounts banner */}
          {link.hiddenAmounts && <HiddenAmountsBanner />}

          {/* Charts */}
          {data.summary.count > 1 && (
            <ShareCharts
              link={link}
              transactions={data.transactions}
              categoryBreakdown={data.categoryBreakdown}
            />
          )}

          {/* Transactions list */}
          <ShareTransactionList
            link={link}
            transactions={data.transactions}
            canComment={canComment}
            onComment={(t) => {
              setReplyToTransaction(t);
              // Scroll to the comments form after a tick.
              setTimeout(() => {
                const el = document.getElementById("share-comments-section");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 50);
            }}
          />

          {/* Comments section */}
          {canComment && (
            <ShareComments
              token={token}
              transactions={data.transactions}
              initialComments={initialComments}
              replyToTransaction={replyToTransaction}
              onClearReply={() => setReplyToTransaction(null)}
            />
          )}

          {/* Export buttons */}
          {canExport && data.transactions.length > 0 && (
            <ShareExportActions
              link={link}
              transactions={data.transactions}
            />
          )}
        </div>
      </main>

      <ShareFooter link={link} viewCount={viewCount} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function ShareHeader({
  link,
  viewsRemaining,
  viewCount,
}: {
  link: ShareLink;
  viewsRemaining: number | null;
  viewCount: number;
}) {
  const accessMeta =
    SHARE_ACCESS_LEVELS.find((a) => a.value === link.accessLevel) ??
    SHARE_ACCESS_LEVELS[0];

  const expiryLabel = buildExpiryLabel(link);

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          {!link.hideBranding && (
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
              style={{ backgroundColor: "var(--share-theme)" }}
            >
              <Wallet className="h-5 w-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground sm:text-base">
              {link.title}
            </p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {expiryLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1 border-transparent text-[11px] font-medium"
            style={{
              color: accessMeta.color,
              backgroundColor: `${accessMeta.color}1a`,
            }}
          >
            <LucideIcon name={accessMeta.icon} className="h-3 w-3" />
            {accessMeta.label}
          </Badge>
          <span className="hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex">
            <Eye className="h-3 w-3" />
            {viewCount}x dilihat
          </span>
        </div>
      </div>
      {/* Mobile expiry line */}
      <div className="px-4 pb-2 sm:hidden">
        <p className="text-[11px] text-muted-foreground">{expiryLabel}</p>
      </div>
    </header>
  );
}

function buildExpiryLabel(link: ShareLink): string {
  if (link.expiresAt) {
    return `Berlaku hingga ${formatDate(link.expiresAt)}`;
  }
  if (link.hoursActive) {
    return `Aktif ${link.hoursActive} jam`;
  }
  const remaining = viewsRemaining({ maxViews: link.maxViews, viewCount: link.viewCount });
  if (link.oneTime) return "Link sekali pakai";
  if (remaining !== null) return `${remaining}x tersisa`;
  return "Aktif tanpa batas waktu";
}

// ---------------------------------------------------------------------------
// Hero summary card
// ---------------------------------------------------------------------------
function SummaryHero({ link, data }: { link: ShareLink; data: Props["data"] }) {
  const hidden = link.hiddenAmounts;
  const themeColor = link.customTheme || "#10b981";
  const summary = data.summary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="relative overflow-hidden border-0 p-5 text-white shadow-xl sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${themeColor} 0%, ${darken(themeColor, 0.18)} 100%)`,
        }}
      >
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute -bottom-16 right-24 h-32 w-32 rounded-full bg-white/5" />

        <div className="relative">
          {/* Title + message */}
          <div className="flex flex-col gap-1">
            <p className="text-xs uppercase tracking-wide text-white/70">
              Data Keuangan
            </p>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {link.title}
            </h1>
            {link.message && (
              <p className="mt-1 max-w-2xl text-sm text-white/85">
                {link.message}
              </p>
            )}
          </div>

          {/* Total saldo */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Total Saldo
              </p>
              <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                {hidden ? "Rp••••••" : formatCurrency(summary.balance)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 self-end rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
              <Hash className="h-3.5 w-3.5" />
              {summary.count} transaksi
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/25">
                <TrendingUp className="h-4 w-4 text-emerald-50" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-white/65">Pemasukan</p>
                <p className="truncate text-sm font-semibold text-emerald-50">
                  {hidden ? "Rp••••" : formatCurrencyCompact(summary.totalIncome)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2.5 backdrop-blur">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-400/25">
                <TrendingDown className="h-4 w-4 text-rose-50" />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-white/65">Pengeluaran</p>
                <p className="truncate text-sm font-semibold text-rose-50">
                  {hidden ? "Rp••••" : formatCurrencyCompact(summary.totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function HiddenAmountsBanner() {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
      <Lock className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">Nominal disembunyikan</p>
        <p className="mt-0.5 text-xs text-amber-700 dark:text-amber-300/80">
          Atas permintaan pemilik data, nominal transaksi disembunyikan pada
          tampilan ini.
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Charts
// ---------------------------------------------------------------------------
function ShareCharts({
  link,
  transactions,
  categoryBreakdown,
}: {
  link: ShareLink;
  transactions: Transaction[];
  categoryBreakdown: CategoryBreakdown[];
}) {
  const hidden = link.hiddenAmounts;

  // Compute monthly trend (last 6 months of shared data)
  const monthlyTrend = React.useMemo(() => {
    const buckets = new Map<
      string,
      { month: string; label: string; income: number; expense: number }
    >();
    for (const t of transactions) {
      const d = parseDateLocal(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const existing = buckets.get(key);
      if (existing) {
        if (t.type === "INCOME") existing.income += t.amount ?? 0;
        else existing.expense += t.amount ?? 0;
      } else {
        buckets.set(key, {
          month: key,
          label: getMonthLabel(key),
          income: t.type === "INCOME" ? (t.amount ?? 0) : 0,
          expense: t.type === "EXPENSE" ? (t.amount ?? 0) : 0,
        });
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    // Last 6 months with data
    return sorted.slice(-6);
  }, [transactions]);

  // Filter to expense categories only for pie (mirror dashboard)
  const expenseBreakdown = React.useMemo(
    () =>
      categoryBreakdown.filter((c) => c.category.type === "EXPENSE" && c.total > 0),
    [categoryBreakdown],
  );

  if (expenseBreakdown.length === 0 && monthlyTrend.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Monthly trend */}
      {monthlyTrend.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Arus Kas Bulanan</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hidden
                  ? "Nominal disembunyikan"
                  : "Perbandingan pemasukan & pengeluaran"}
              </p>
            </div>
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
              <TrendingDown className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyTrend}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  barGap={4}
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
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis
                    tickFormatter={(v) =>
                      hidden ? "•••" : formatCurrencyAxis(Number(v))
                    }
                    tickLine={false}
                    axisLine={false}
                    width={48}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.5 }}
                    content={
                      <ChartTooltipContent hidden={hidden} />
                    }
                  />
                  <Bar
                    name="Pemasukan"
                    dataKey="income"
                    fill={INCOME_COLOR}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    name="Pengeluaran"
                    dataKey="expense"
                    fill={EXPENSE_COLOR}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pie chart — expense by category */}
      {expenseBreakdown.length > 0 && (
        <Card className={monthlyTrend.length > 0 ? "lg:col-span-2" : "lg:col-span-5"}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {hidden ? "Nominal disembunyikan" : "Distribusi pengeluaran"}
              </p>
            </div>
            <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
              <Layers className="h-4 w-4" />
            </span>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseBreakdown.map((c) => ({
                        name: c.category.name,
                        total: hidden ? 1 : c.total,
                        percentage: c.percentage,
                        color: c.category.color,
                      }))}
                      dataKey="total"
                      nameKey="name"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="none"
                    >
                      {expenseBreakdown.map((c) => (
                        <Cell key={c.category.id} fill={c.category.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<CategoryTooltipContent hidden={hidden} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">Total</span>
                  <span className="text-sm font-bold tabular-nums">
                    {hidden ? "Rp•••" : formatCurrencyCompact(
                      expenseBreakdown.reduce((s, c) => s + c.total, 0),
                    )}
                  </span>
                </div>
              </div>
              <div className="max-h-40 w-full flex-1 space-y-2.5 overflow-y-auto custom-scrollbar pr-1">
                {expenseBreakdown.slice(0, 6).map((c) => (
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
                        {hidden ? "•••" : formatCurrencyCompact(c.total)}
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChartTooltipContent({
  active,
  payload,
  label,
  hidden,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  hidden?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium text-foreground">{label}</div>}
      <div className="space-y-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">
              {hidden ? "Rp••••" : formatCurrency(entry.value ?? 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryTooltipContent({
  active,
  payload,
  hidden,
}: {
  active?: boolean;
  payload?: Array<{
    payload?: { name?: string; total?: number; percentage?: number };
  }>;
  hidden?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{d.name}</div>
      <div className="mt-0.5 text-muted-foreground">
        {hidden ? "Rp••••" : formatCurrency(d.total ?? 0)}
      </div>
      <div className="text-muted-foreground">{d.percentage?.toFixed(1)}%</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Transaction list (grouped by day)
// ---------------------------------------------------------------------------
function ShareTransactionList({
  link,
  transactions,
  canComment,
  onComment,
}: {
  link: ShareLink;
  transactions: Transaction[];
  canComment: boolean;
  onComment: (t: Transaction) => void;
}) {
  const grouped = React.useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const key = relativeDay(t.date);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Tidak ada transaksi
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pemilik belum membagikan transaksi apa pun dalam cakupan ini.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Daftar Transaksi
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {transactions.length} transaksi dibagikan
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {grouped.map(([day, items]) => {
          const dayIncome = items
            .filter((t) => t.type === "INCOME")
            .reduce((s, t) => s + (t.amount ?? 0), 0);
          const dayExpense = items
            .filter((t) => t.type === "EXPENSE")
            .reduce((s, t) => s + (t.amount ?? 0), 0);
          const hidden = link.hiddenAmounts;

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {day}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  {dayIncome > 0 && !hidden && (
                    <span className="font-medium text-income">
                      +{formatCurrency(dayIncome)}
                    </span>
                  )}
                  {dayExpense > 0 && !hidden && (
                    <span className="font-medium text-expense">
                      −{formatCurrency(dayExpense)}
                    </span>
                  )}
                  <Badge variant="secondary" className="text-[10px] font-normal">
                    {items.length}
                  </Badge>
                </div>
              </div>
              <Card className="divide-y divide-border overflow-hidden p-0">
                {items.map((t) => (
                  <ShareTransactionRow
                    key={t.id}
                    transaction={t}
                    link={link}
                    canComment={canComment}
                    onComment={onComment}
                  />
                ))}
              </Card>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ShareTransactionRow({
  transaction,
  link,
  canComment,
  onComment,
}: {
  transaction: Transaction;
  link: ShareLink;
  canComment: boolean;
  onComment: (t: Transaction) => void;
}) {
  const isIncome = transaction.type === "INCOME";
  const cat = transaction.category;
  const hidden = link.hiddenAmounts;
  const masked = link.maskedDesc;

  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
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
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-medium text-foreground">
            {transaction.description}
          </p>
          {masked && (
            <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {cat?.name ?? "Tanpa kategori"}
          <span className="mx-1 text-border">·</span>
          {formatDateLong(transaction.date)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              isIncome ? "text-income" : "text-expense",
            )}
          >
            {hidden
              ? "Rp••••"
              : `${isIncome ? "+" : "−"}${formatCurrency(transaction.amount ?? 0)}`}
          </div>
        </div>
        {canComment && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0 text-muted-foreground opacity-60 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Tambah komentar"
            onClick={() => onComment(transaction)}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments section
// ---------------------------------------------------------------------------
function ShareComments({
  token,
  transactions,
  initialComments,
  replyToTransaction,
  onClearReply,
}: {
  token: string;
  transactions: Transaction[];
  initialComments: ShareComment[];
  replyToTransaction: Transaction | null;
  onClearReply: () => void;
}) {
  const [comments, setComments] = React.useState<ShareComment[]>(initialComments);
  const [author, setAuthor] = React.useState("");
  const [content, setContent] = React.useState("");
  const [transactionId, setTransactionId] = React.useState<string>("");
  const [submitting, setSubmitting] = React.useState(false);

  // Sync the "reply-to" state to the form's selected transactionId.
  React.useEffect(() => {
    if (replyToTransaction) {
      setTransactionId(replyToTransaction.id);
    }
  }, [replyToTransaction]);

  // Map of transactionId -> { description, date } for lookup when displaying
  // comments and populating the picker.
  const txLookup = React.useMemo(() => {
    const m = new Map<string, { description: string; date: string }>();
    for (const t of transactions) {
      m.set(t.id, { description: t.description, date: t.date });
    }
    return m;
  }, [transactions]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!author.trim()) {
      toast.error("Masukkan nama Anda.");
      return;
    }
    if (!content.trim()) {
      toast.error("Tulis komentar terlebih dahulu.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shares/${token}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: author.trim(),
          content: content.trim(),
          transactionId: transactionId || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error ?? "Gagal menambah komentar.");
        return;
      }
      const created: ShareComment = await res.json();
      setComments((prev) =>
        [created, ...prev.filter((c) => c.id !== created.id)].sort((a, b) => {
          if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
          return b.createdAt.localeCompare(a.createdAt);
        }),
      );
      setContent("");
      setTransactionId("");
      onClearReply();
      toast.success("Komentar berhasil ditambahkan.");
    } catch {
      toast.error("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-4 sm:p-5" id="share-comments-section">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessagesSquare className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-foreground">Komentar</h3>
          <p className="text-xs text-muted-foreground">
            {comments.length} komentar pada data ini
          </p>
        </div>
      </div>

      {/* Add comment form */}
      <form
        onSubmit={handleSubmit}
        className="mb-5 space-y-3 rounded-xl border border-border bg-muted/30 p-4"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="comment-author" className="text-xs font-medium">
              Nama Anda
            </Label>
            <Input
              id="comment-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Masukkan nama"
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="comment-transaction" className="text-xs font-medium">
              Komentar untuk transaksi (opsional)
            </Label>
            <select
              id="comment-transaction"
              value={transactionId}
              onChange={(e) => {
                setTransactionId(e.target.value);
                if (!e.target.value) onClearReply();
              }}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            >
              <option value="">— Komentar umum —</option>
              {transactions.slice(0, 50).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.description.slice(0, 40)}
                  {t.description.length > 40 ? "…" : ""}
                  {" · "}
                  {formatDate(t.date)}
                </option>
              ))}
            </select>
          </div>
        </div>
        {replyToTransaction && (
          <div className="flex items-center justify-between gap-2 rounded-md bg-primary/8 px-3 py-1.5 text-xs">
            <span className="text-primary">
              Membalas transaksi:{" "}
              <span className="font-medium">
                {replyToTransaction.description}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                setTransactionId("");
                onClearReply();
              }}
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Hapus
            </button>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="comment-content" className="text-xs font-medium">
            Komentar
          </Label>
          <Textarea
            id="comment-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tulis komentar atau pertanyaan Anda..."
            maxLength={2000}
            rows={3}
            required
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <MessageCircle className="h-4 w-4" />
                Kirim Komentar
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-8 text-center">
          <MessageCircle className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            Belum ada komentar. Jadi yang pertama mengomentari data ini.
          </p>
        </div>
      ) : (
        <ul className="max-h-96 space-y-3 overflow-y-auto custom-scrollbar pr-1">
          {comments.map((c) => {
            const linked = c.transactionId
              ? txLookup.get(c.transactionId)
              : null;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-border bg-card p-3 transition-shadow"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {c.author.slice(0, 1).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {c.author}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateLong(c.createdAt)}
                      </p>
                    </div>
                  </div>
                  {c.isPinned && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-transparent bg-primary/10 text-[10px] font-medium text-primary"
                    >
                      <Pin className="h-2.5 w-2.5" />
                      Disematkan
                    </Badge>
                  )}
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-foreground">
                  {c.content}
                </p>
                {linked && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-[11px] text-muted-foreground">
                    <MessageCircle className="h-3 w-3 shrink-0" />
                    <span className="truncate">
                      Pada transaksi:{" "}
                      <span className="font-medium text-foreground">
                        {linked.description}
                      </span>
                      <span className="mx-1 text-border">·</span>
                      {formatDate(linked.date)}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Export actions (CSV + Print)
// ---------------------------------------------------------------------------
function ShareExportActions({
  link,
  transactions,
}: {
  link: ShareLink;
  transactions: Transaction[];
}) {
  const hidden = link.hiddenAmounts;

  function exportCSV() {
    const headers = ["Tanggal", "Tipe", "Kategori", "Keterangan", "Jumlah"];
    const rows = transactions.map((t) => [
      formatDate(t.date),
      t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
      t.category?.name ?? "—",
      t.description,
      hidden ? "••••" : String(t.amount ?? 0),
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => {
            const s = String(cell ?? "");
            return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dompetku-${link.token}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV berhasil diunduh.");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">
            Ekspor Data
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Unduh data transaksi yang dibagikan dalam format CSV atau cetak
            sebagai PDF.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-3.5 w-3.5" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5" />
            Cetak / PDF
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Footer
// ---------------------------------------------------------------------------
function ShareFooter({ link, viewCount }: { link: ShareLink; viewCount: number }) {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex flex-col items-center gap-1.5 text-center sm:flex-row sm:text-left">
            {!link.hideBranding && (
              <>
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Wallet className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">
                    Dibuat dengan DompetKu
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Aplikasi pengelola keuangan pribadi
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Dilihat {viewCount}x
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(link.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              Akses {link.accessLevel}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------
function darken(hex: string, amount: number): string {
  // Parse #rrggbb
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const num = parseInt(m[1], 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;
  r = Math.max(0, Math.round(r * (1 - amount)));
  g = Math.max(0, Math.round(g * (1 - amount)));
  b = Math.max(0, Math.round(b * (1 - amount)));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Suppress unused import for MonthlyData (kept for type reference)
type _Unused = MonthlyData | typeof ArrowDownLeft | typeof ArrowUpRight;
