import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getMonthKey,
  getMonthLabel,
  parseDateLocal,
  formatDateInput,
  WEEKDAYS_ID,
  getWeekdayMondayFirst,
} from "@/lib/format";
import type {
  AnalyticsData,
  CategoryBreakdown,
  MonthlyData,
} from "@/lib/types";

// GET /api/analytics?month=YYYY-MM
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");

    const now = new Date();
    let viewYear = now.getFullYear();
    let viewMonth = now.getMonth();
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      viewYear = y;
      viewMonth = m - 1;
    }

    const monthStart = new Date(viewYear, viewMonth, 1);
    const monthEnd = new Date(
      viewYear,
      viewMonth + 1,
      0,
      23,
      59,
      59,
      999
    );
    const prevMonthStart = new Date(viewYear, viewMonth - 1, 1);
    const prevMonthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59, 999);

    // Fetch all transactions for trend + analytics (last ~9 months is enough
    // for 6-month trend + 3-month forecast + 1 previous month, but we use all)
    const allTransactions = await db.transaction.findMany({
      select: {
        type: true,
        amount: true,
        date: true,
        merchant: true,
        categoryId: true,
        description: true,
      },
    });

    // Fetch current month transactions with category for breakdown
    const monthTransactions = await db.transaction.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    });
    const prevMonthTransactions = allTransactions.filter((t) => {
      const d = parseDateLocal(t.date);
      return d >= prevMonthStart && d <= prevMonthEnd;
    });

    // --- Month comparison ---
    function summarize(txs: typeof allTransactions) {
      let income = 0;
      let expense = 0;
      let count = 0;
      for (const t of txs) {
        if (t.type === "INCOME") income += t.amount;
        else expense += t.amount;
        count += 1;
      }
      return { income, expense, balance: income - expense, count };
    }

    const current = summarize(monthTransactions);
    const previous = summarize(prevMonthTransactions);

    const pctChange = (cur: number, prev: number) => {
      if (prev === 0) return cur === 0 ? 0 : 100;
      return ((cur - prev) / Math.abs(prev)) * 100;
    };

    const monthComparison = {
      current,
      previous,
      incomeChange: pctChange(current.income, previous.income),
      expenseChange: pctChange(current.expense, previous.expense),
      balanceChange: pctChange(current.balance, previous.balance),
    };

    // --- Top merchants (top 8 by total expense, current month) ---
    const merchantMap = new Map<
      string,
      { total: number; count: number }
    >();
    for (const t of monthTransactions) {
      if (t.type !== "EXPENSE") continue;
      if (!t.merchant || !t.merchant.trim()) continue;
      const key = t.merchant.trim();
      const entry = merchantMap.get(key);
      if (entry) {
        entry.total += t.amount;
        entry.count += 1;
      } else {
        merchantMap.set(key, { total: t.amount, count: 1 });
      }
    }
    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, v]) => ({ merchant, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    // --- Top categories (top 5 expense, current month) ---
    const catMap = new Map<
      string,
      {
        total: number;
        count: number;
        category: NonNullable<(typeof monthTransactions)[number]["category"]>;
      }
    >();
    let expenseTotal = 0;
    for (const t of monthTransactions) {
      if (t.type !== "EXPENSE") continue;
      if (!t.category) continue;
      expenseTotal += t.amount;
      const existing = catMap.get(t.categoryId);
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        catMap.set(t.categoryId, {
          total: t.amount,
          count: 1,
          category: t.category,
        });
      }
    }
    const topCategories = Array.from(catMap.values())
      .map((v) => ({
        category: v.category,
        total: v.total,
        count: v.count,
        percentage: expenseTotal > 0 ? (v.total / expenseTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5) as unknown as CategoryBreakdown[];

    // --- Heatmap (per day, current month) ---
    const heatmapMap = new Map<
      string,
      { count: number; amount: number }
    >();
    // Pre-fill all days in the month so heatmap is continuous
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      heatmapMap.set(formatDateInput(date), { count: 0, amount: 0 });
    }
    for (const t of monthTransactions) {
      const key = formatDateInput(parseDateLocal(t.date));
      const entry = heatmapMap.get(key);
      if (entry) {
        entry.count += 1;
        entry.amount += t.amount;
      }
    }
    const heatmap = Array.from(heatmapMap.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      amount: v.amount,
    }));

    // --- Forecast (average of last 3 months ending at viewed month) ---
    const forecastMonths: MonthlyData[] = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - i, 1);
      const key = getMonthKey(d);
      forecastMonths.push({
        month: key,
        label: getMonthLabel(key),
        income: 0,
        expense: 0,
      });
    }
    const forecastMap = new Map(forecastMonths.map((m) => [m.month, m]));
    for (const t of allTransactions) {
      const key = getMonthKey(parseDateLocal(t.date));
      const entry = forecastMap.get(key);
      if (entry) {
        if (t.type === "INCOME") entry.income += t.amount;
        else entry.expense += t.amount;
      }
    }
    const avgIncome =
      forecastMonths.reduce((s, m) => s + m.income, 0) / forecastMonths.length;
    const avgExpense =
      forecastMonths.reduce((s, m) => s + m.expense, 0) / forecastMonths.length;
    const forecastSavingsRate =
      avgIncome > 0 ? ((avgIncome - avgExpense) / avgIncome) * 100 : 0;
    const forecast = {
      nextMonthIncome: avgIncome,
      nextMonthExpense: avgExpense,
      avgIncome,
      avgExpense,
      savingsRate: forecastSavingsRate,
    };

    // --- Ratios ---
    const savingsRate =
      current.income > 0 ? (current.balance / current.income) * 100 : 0;
    const expenseRatio =
      current.income > 0 ? (current.expense / current.income) * 100 : 0;
    const incomeToExpenseRatio =
      current.expense > 0 ? current.income / current.expense : 0;
    const ratios = {
      savingsRate,
      expenseRatio,
      incomeToExpenseRatio,
    };

    // --- Monthly trend (last 6 months ending at viewed month) ---
    const trendMonths: MonthlyData[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - i, 1);
      const key = getMonthKey(d);
      trendMonths.push({
        month: key,
        label: getMonthLabel(key),
        income: 0,
        expense: 0,
      });
    }
    const trendMap = new Map(trendMonths.map((m) => [m.month, m]));
    for (const t of allTransactions) {
      const key = getMonthKey(parseDateLocal(t.date));
      const entry = trendMap.get(key);
      if (entry) {
        if (t.type === "INCOME") entry.income += t.amount;
        else entry.expense += t.amount;
      }
    }
    const monthlyTrend = trendMonths;

    // --- Weekday spending (Monday-first) ---
    const weekdayTotals = Array.from({ length: 7 }, (_, i) => ({
      day: WEEKDAYS_ID[i],
      total: 0,
      count: 0,
    }));
    for (const t of monthTransactions) {
      if (t.type !== "EXPENSE") continue;
      const idx = getWeekdayMondayFirst(parseDateLocal(t.date));
      weekdayTotals[idx].total += t.amount;
      weekdayTotals[idx].count += 1;
    }
    const weekdaySpending = weekdayTotals;

    // --- Insights ---
    const insights: string[] = [];
    if (previous.expense > 0 && current.expense !== previous.expense) {
      const change = pctChange(current.expense, previous.expense);
      if (change > 0) {
        insights.push(
          `Pengeluaranmu naik ${change.toFixed(1).replace(".", ",")}% dari bulan lalu.`
        );
      } else if (change < 0) {
        insights.push(
          `Pengeluaranmu turun ${Math.abs(change).toFixed(1).replace(".", ",")}% dari bulan lalu. Mantap!`
        );
      }
    }
    if (topCategories.length > 0) {
      const top = topCategories[0]!;
      insights.push(
        `Kategori ${top.category.name} adalah pengeluaran terbesarmu bulan ini.`
      );
    }
    insights.push(
      `Savings rate kamu ${savingsRate.toFixed(1).replace(".", ",")}%, target ideal 20%+.`
    );
    insights.push(`Kamu mencatat ${current.count} transaksi bulan ini.`);
    if (incomeToExpenseRatio < 1 && current.income > 0) {
      insights.push(
        `Pengeluaran melebihi pemasukan bulan ini. Pertimbangkan untuk memangkas pengeluaran.`
      );
    }
    if (topMerchants.length > 0) {
      const top = topMerchants[0]!;
      insights.push(
        `Merchant paling sering: ${top.merchant} (${top.count}x transaksi).`
      );
    }

    const data: AnalyticsData = {
      monthComparison,
      topMerchants,
      topCategories,
      heatmap,
      forecast,
      ratios,
      insights,
      monthlyTrend,
      weekdaySpending,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/analytics]", err);
    return NextResponse.json(
      { error: "Gagal memuat analitik." },
      { status: 500 }
    );
  }
}
