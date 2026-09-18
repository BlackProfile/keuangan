import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { BudgetPeriod } from "@/lib/types";

const VALID_PERIODS: BudgetPeriod[] = ["WEEKLY", "MONTHLY", "YEARLY"];

// PUT /api/budgets/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amount, period } = body ?? {};

    const existing = await db.budget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Anggaran tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (amount !== undefined && amount !== null) {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json(
          { error: "Jumlah anggaran harus berupa angka positif." },
          { status: 400 }
        );
      }
      data.amount = amt;
    }

    if (period !== undefined && period !== null) {
      const periodValue = period as BudgetPeriod;
      if (!VALID_PERIODS.includes(periodValue)) {
        return NextResponse.json(
          { error: "Periode anggaran tidak valid." },
          { status: 400 }
        );
      }
      data.period = periodValue;
    }

    const updated = await db.budget.update({
      where: { id },
      data,
      include: { category: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/budgets/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui anggaran." },
      { status: 500 }
    );
  }
}

// DELETE /api/budgets/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.budget.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Anggaran tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.budget.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/budgets/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus anggaran." },
      { status: 500 }
    );
  }
}
