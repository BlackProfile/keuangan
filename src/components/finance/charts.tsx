"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import {
  formatCurrency,
  formatCurrencyCompact,
} from "@/lib/format";
import type { CategoryBreakdown, MonthlyData } from "@/lib/types";
import { PieChart as PieIcon, TrendingDown, Wallet } from "lucide-react";

interface Props {
  monthlyData?: MonthlyData[];
  expenseByCategory?: CategoryBreakdown[];
  incomeByCategory?: CategoryBreakdown[];
  loading?: boolean;
}

function ChartTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string; dataKey?: string }>;
  label?: string;
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
              {formatCurrency(entry.value ?? 0)}
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
}: {
  active?: boolean;
  payload?: Array<{ payload?: { name?: string; total?: number; percentage?: number } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const data = payload[0]?.payload;
  if (!data) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{data.name}</div>
      <div className="mt-0.5 text-muted-foreground">
        {formatCurrency(data.total ?? 0)}
      </div>
      <div className="text-muted-foreground">{data.percentage?.toFixed(1)}%</div>
    </div>
  );
}

export function FinanceCharts({
  monthlyData,
  expenseByCategory,
  incomeByCategory,
  loading,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      {/* Monthly chart */}
      <Card className="lg:col-span-3">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Arus Kas 6 Bulan Terakhir</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Perbandingan pemasukan & pengeluaran per bulan
            </p>
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
            <TrendingDown className="h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent className="pl-2">
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 8, right: 12, left: -8, bottom: 0 }}
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
                    tickFormatter={(v) => formatCurrencyCompact(Number(v))}
                    tickLine={false}
                    axisLine={false}
                    width={56}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    content={<ChartTooltipContent />}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    iconType="circle"
                  />
                  <Bar
                    name="Pemasukan"
                    dataKey="income"
                    fill="var(--income)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    name="Pengeluaran"
                    dataKey="expense"
                    fill="var(--expense)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expense by category */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Pengeluaran per Kategori</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Bulan ini
            </p>
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
            <PieIcon className="h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : !expenseByCategory || expenseByCategory.length === 0 ? (
            <EmptyChart label="Belum ada pengeluaran bulan ini" />
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative h-40 w-40 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expenseByCategory.map((c) => ({
                        name: c.category.name,
                        total: c.total,
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
                      {expenseByCategory.map((c) => (
                        <Cell key={c.category.id} fill={c.category.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CategoryTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">
                    Total
                  </span>
                  <span className="text-sm font-bold">
                    {formatCurrencyCompact(
                      expenseByCategory.reduce((s, c) => s + c.total, 0)
                    )}
                  </span>
                </div>
              </div>
              <div className="max-h-40 w-full flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                {expenseByCategory.slice(0, 6).map((c) => (
                  <div key={c.category.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 truncate">
                        <LucideIcon
                          name={c.category.icon}
                          className="h-3.5 w-3.5"
                          style={{ color: c.category.color }}
                        />
                        <span className="truncate text-foreground">
                          {c.category.name}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium text-foreground">
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

      {/* Income by category (full width) */}
      <Card className="lg:col-span-5">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-base">Sumber Pemasukan</CardTitle>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Rincian pemasukan bulan ini per kategori
            </p>
          </div>
          <span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground sm:flex">
            <Wallet className="h-4 w-4" />
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-20 w-full rounded-xl" />
          ) : !incomeByCategory || incomeByCategory.length === 0 ? (
            <EmptyChart label="Belum ada pemasukan bulan ini" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {incomeByCategory.map((c) => (
                <div
                  key={c.category.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${c.category.color}1a` }}
                  >
                    <LucideIcon
                      name={c.category.icon}
                      className="h-5 w-5"
                      style={{ color: c.category.color }}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">
                      {c.category.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {c.count} transaksi · {c.percentage.toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-income">
                    +{formatCurrencyCompact(c.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
      <PieIcon className="h-8 w-8 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
