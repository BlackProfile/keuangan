import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/debts/[id]/settle — mark debt as settled
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const updated = await db.$transaction(async (tx) => {
      const existing = await tx.debt.findUnique({ where: { id } });
      if (!existing) {
        throw new Error("NOT_FOUND");
      }
      return tx.debt.update({
        where: { id },
        data: {
          settled: true,
          paidAmount: existing.amount,
          settledAt: new Date(),
        },
      });
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "NOT_FOUND") {
      return NextResponse.json(
        { error: "Utang/piutang tidak ditemukan." },
        { status: 404 }
      );
    }
    console.error("[POST /api/debts/[id]/settle]", err);
    return NextResponse.json(
      { error: "Gagal menyelesaikan utang/piutang." },
      { status: 500 }
    );
  }
}
