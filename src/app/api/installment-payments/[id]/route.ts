import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/installment-payments/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.installmentPayment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pembayaran tidak ditemukan." }, { status: 404 });
    }

    // Revert parent entity paidAmount
    if (existing.entityType === "DEBT") {
      const debt = await db.debt.findUnique({ where: { id: existing.entityId } });
      if (debt) {
        const newPaid = Math.max(0, debt.paidAmount - existing.amount);
        await db.debt.update({
          where: { id: existing.entityId },
          data: { paidAmount: newPaid, settled: false, settledAt: null },
        });
      }
    } else if (existing.entityType === "GOAL") {
      const goal = await db.goal.findUnique({ where: { id: existing.entityId } });
      if (goal) {
        const newCurrent = Math.max(0, goal.currentAmount - existing.amount);
        await db.goal.update({
          where: { id: existing.entityId },
          data: { currentAmount: newCurrent, completed: false },
        });
      }
    }

    await db.installmentPayment.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/installment-payments/[id]]", err);
    return NextResponse.json({ error: "Gagal menghapus pembayaran." }, { status: 500 });
  }
}
