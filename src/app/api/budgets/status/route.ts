import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BudgetStatus } from "@/lib/types";

// GET /api/budgets/status?month=YYYY-MM
// Returns per-budget: { id, categoryId, amount, period, category, spent, remaining, percentage, status }
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

    const budgets = await db.budget.findMany({
      include: { category: true },
      orderBy: [{ createdAt: "desc" }],
    });

    if (budgets.length === 0) {
      return NextResponse.json([]);
    }

    // Aggregate EXPENSE transactions this month per categoryId
    const monthExpenses = await db.transaction.findMany({
      where: {
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
      },
      select: { categoryId: true, amount: true },
    });

    const spentMap = new Map<string, number>();
    for (const t of monthExpenses) {
      spentMap.set(t.categoryId, (spentMap.get(t.categoryId) ?? 0) + t.amount);
    }

    const result: BudgetStatus[] = budgets.map((b) => {
      const spent = spentMap.get(b.categoryId) ?? 0;
      const remaining = b.amount - spent;
      const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      let status: BudgetStatus["status"] = "safe";
      if (percentage >= 100) status = "over";
      else if (percentage >= 80) status = "danger";
      else if (percentage >= 60) status = "warning";
      return {
        id: b.id,
        categoryId: b.categoryId,
        amount: b.amount,
        period: b.period as BudgetStatus["period"],
        category: b.category as unknown as BudgetStatus["category"],
        createdAt: b.createdAt.toISOString(),
        updatedAt: b.updatedAt.toISOString(),
        spent,
        remaining,
        percentage,
        status,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/budgets/status]", err);
    return NextResponse.json(
      { error: "Gagal memuat status anggaran." },
      { status: 500 }
    );
  }
}
