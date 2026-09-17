import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getMonthKey,
  getMonthLabel,
  parseDateLocal,
} from "@/lib/format";
import type {
  CategoryBreakdown,
  DashboardData,
  MonthlyData,
  Summary,
} from "@/lib/types";

// GET /api/dashboard
export async function GET() {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    const [
      allTransactions,
      monthTransactions,
      recentTransactions,
    ] = await Promise.all([
      db.transaction.findMany({
        select: { type: true, amount: true, date: true },
      }),
      db.transaction.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { type: true, amount: true },
      }),
      db.transaction.findMany({
        include: { category: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
    ]);

    const totalIncome = allTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = allTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);

    const monthIncome = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const monthExpense = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);

    const summary: Summary = {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      monthIncome,
      monthExpense,
      monthBalance: monthIncome - monthExpense,
      transactionCount: allTransactions.length,
      monthTransactionCount: monthTransactions.length,
    };

    // Monthly data for the last 6 months
    const monthsToShow = 6;
    const monthlyMap = new Map<string, MonthlyData>();
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = getMonthKey(d);
      monthlyMap.set(key, {
        month: key,
        label: getMonthLabel(key),
        income: 0,
        expense: 0,
      });
    }
    for (const t of allTransactions) {
      const key = getMonthKey(parseDateLocal(t.date));
      const entry = monthlyMap.get(key);
      if (entry) {
        if (t.type === "INCOME") entry.income += t.amount;
        else entry.expense += t.amount;
      }
    }
    const monthlyData = Array.from(monthlyMap.values());

    // Category breakdown for current month
    const monthTransactionsWithCat = await db.transaction.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: { category: true },
    });

    function buildBreakdown(type: "INCOME" | "EXPENSE"): CategoryBreakdown[] {
      const map = new Map<
        string,
        { total: number; count: number; category: NonNullable<(typeof monthTransactionsWithCat)[number]["category"]> }
      >();
      for (const t of monthTransactionsWithCat) {
        if (t.type !== type) continue;
        if (!t.category) continue;
        const existing = map.get(t.categoryId);
        if (existing) {
          existing.total += t.amount;
          existing.count += 1;
        } else {
          map.set(t.categoryId, {
            total: t.amount,
            count: 1,
            category: t.category,
          });
        }
      }
      const total = Array.from(map.values()).reduce((s, v) => s + v.total, 0);
      return Array.from(map.values())
        .map((v) => ({
          category: v.category,
          total: v.total,
          count: v.count,
          percentage: total > 0 ? (v.total / total) * 100 : 0,
        }))
        .sort((a, b) => b.total - a.total);
    }

    const expenseByCategory = buildBreakdown("EXPENSE");
    const incomeByCategory = buildBreakdown("INCOME");

    const data: DashboardData = {
      summary,
      monthlyData,
      expenseByCategory,
      incomeByCategory,
      recentTransactions: recentTransactions,
    };

    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json(
      { error: "Gagal memuat ringkasan dashboard." },
      { status: 500 }
    );
  }
}
