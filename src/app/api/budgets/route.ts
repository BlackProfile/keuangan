import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BudgetPeriod } from "@/lib/types";

const VALID_PERIODS: BudgetPeriod[] = ["WEEKLY", "MONTHLY", "YEARLY"];

// GET /api/budgets
export async function GET() {
  try {
    const budgets = await db.budget.findMany({
      include: { category: true },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(budgets);
  } catch (err) {
    console.error("[GET /api/budgets]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar anggaran." },
      { status: 500 }
    );
  }
}

// POST /api/budgets
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, amount, period } = body ?? {};

    if (!categoryId) {
      return NextResponse.json(
        { error: "Kategori wajib dipilih." },
        { status: 400 }
      );
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah anggaran harus berupa angka positif." },
        { status: 400 }
      );
    }
    const periodValue = (period ?? "MONTHLY") as BudgetPeriod;
    if (!VALID_PERIODS.includes(periodValue)) {
      return NextResponse.json(
        { error: "Periode anggaran tidak valid." },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    // Prevent duplicate budget for the same category
    const existing = await db.budget.findFirst({ where: { categoryId } });
    if (existing) {
      return NextResponse.json(
        { error: "Anggaran untuk kategori ini sudah ada." },
        { status: 400 }
      );
    }

    const budget = await db.budget.create({
      data: {
        categoryId,
        amount: amt,
        period: periodValue,
      },
      include: { category: true },
    });

    return NextResponse.json(budget, { status: 201 });
  } catch (err) {
    console.error("[POST /api/budgets]", err);
    return NextResponse.json(
      { error: "Gagal menambah anggaran." },
      { status: 500 }
    );
  }
}
