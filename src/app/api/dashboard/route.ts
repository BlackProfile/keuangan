import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  calculateStreak,
  getMonthKey,
  getMonthLabel,
  parseDateLocal,
} from "@/lib/format";
import type {
  BudgetStatus,
  CategoryBreakdown,
  DashboardData,
  MonthlyData,
  Summary,
} from "@/lib/types";

// GET /api/dashboard?month=YYYY-MM
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

    const [
      allTransactions,
      monthTransactions,
      recentTransactions,
      budgets,
      goals,
      accounts,
    ] = await Promise.all([
      db.transaction.findMany({
        select: { type: true, amount: true, date: true },
      }),
      db.transaction.findMany({
        where: { date: { gte: monthStart, lte: monthEnd } },
        select: { type: true, amount: true, categoryId: true },
      }),
      db.transaction.findMany({
        include: { category: true, account: true },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 6,
      }),
      db.budget.findMany({ include: { category: true } }),
      db.goal.findMany({ orderBy: { createdAt: "desc" } }),
      db.account.findMany({ orderBy: { isDefault: "desc" } }),
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

    // Monthly data for the last 6 months ending at the viewed month
    const monthsToShow = 6;
    const monthlyMap = new Map<string, MonthlyData>();
    for (let i = monthsToShow - 1; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - i, 1);
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

    // Budget statuses for viewed month
    const budgetStatuses: BudgetStatus[] = budgets.map((b) => {
      const spent = monthTransactions
        .filter(
          (t) => t.type === "EXPENSE" && t.categoryId === b.categoryId
        )
        .reduce((s, t) => s + t.amount, 0);
      const percentage =
        b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const status: BudgetStatus["status"] =
        percentage >= 100
          ? "over"
          : percentage >= 80
          ? "danger"
          : percentage >= 60
          ? "warning"
          : "safe";
      return {
        ...b,
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        category: {
          ...b.category,
          createdAt: b.category.createdAt.toISOString(),
          updatedAt: b.category.updatedAt.toISOString(),
        },
        spent,
        remaining: b.amount - spent,
        percentage,
        status,
      };
    });

    // Streak calculation
    const streak = calculateStreak(
      allTransactions.map((t) => t.date)
    );

    // Savings rate
    const savingsRate =
      monthIncome > 0
        ? Math.round(
            ((monthIncome - monthExpense) / monthIncome) * 100
          )
        : 0;

    const data: DashboardData = {
      summary,
      monthlyData,
      expenseByCategory,
      incomeByCategory,
      recentTransactions: recentTransactions.map((t) => ({
        ...t,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        date: t.date.toISOString(),
        category: {
          ...t.category,
          createdAt: t.category.createdAt.toISOString(),
          updatedAt: t.category.updatedAt.toISOString(),
        },
        account: t.account
          ? {
              ...t.account,
              createdAt: t.account.createdAt.toISOString(),
              updatedAt: t.account.updatedAt.toISOString(),
            }
          : null,
      })),
      budgetStatuses,
      goals: goals.map((g) => ({
        ...g,
        targetDate: g.targetDate?.toISOString() ?? null,
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      })),
      accounts: accounts.map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
      streak,
      savingsRate,
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
