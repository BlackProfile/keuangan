import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/installment-payments?entityType=DEBT&entityId=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") ?? undefined;
    const entityId = searchParams.get("entityId") ?? undefined;

    const where: Record<string, unknown> = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    const payments = await db.installmentPayment.findMany({
      where,
      orderBy: { date: "asc" },
    });

    return NextResponse.json(payments);
  } catch (err) {
    console.error("[GET /api/installment-payments]", err);
    return NextResponse.json({ error: "Gagal memuat pembayaran cicilan." }, { status: 500 });
  }
}

// POST /api/installment-payments
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { entityType, entityId, amount, date, note } = body ?? {};

    if (!entityType || !entityId) {
      return NextResponse.json({ error: "entityType dan entityId wajib diisi." }, { status: 400 });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json({ error: "Jumlah harus positif." }, { status: 400 });
    }

    const payment = await db.installmentPayment.create({
      data: {
        entityType,
        entityId,
        amount: amt,
        date: date ? parseDateLocal(date) : new Date(),
        note: note?.trim() || null,
      },
    });

    // Update parent entity's paidAmount
    if (entityType === "DEBT") {
      const debt = await db.debt.findUnique({ where: { id: entityId } });
      if (debt) {
        const newPaid = debt.paidAmount + amt;
        const settled = newPaid >= debt.amount;
        await db.debt.update({
          where: { id: entityId },
          data: { paidAmount: newPaid, settled, settledAt: settled ? new Date() : null },
        });
      }
    } else if (entityType === "FRIEND_DEBT") {
      const fd = await db.friendDebt.findUnique({ where: { id: entityId } });
      if (fd) {
        // FriendDebt doesn't have paidAmount, use InstallmentPayment sum
        const allPayments = await db.installmentPayment.findMany({
          where: { entityType: "FRIEND_DEBT", entityId },
        });
        const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0) + amt;
        const settled = totalPaid >= fd.amount;
        await db.friendDebt.update({
          where: { id: entityId },
          data: { settled, settledAt: settled ? new Date() : null },
        });
      }
    } else if (entityType === "SPLIT_BILL") {
      // For split bill, update participant share
      const participantId = body.participantId;
      if (participantId) {
        const p = await db.splitBillParticipant.findUnique({ where: { id: participantId } });
        if (p) {
          const allPayments = await db.installmentPayment.findMany({
            where: { entityType: "SPLIT_BILL", entityId: participantId },
          });
          const totalPaid = allPayments.reduce((s, pm) => s + pm.amount, 0) + amt;
          const fullyPaid = totalPaid >= p.share;
          await db.splitBillParticipant.update({
            where: { id: participantId },
            data: { paid: fullyPaid, paidAt: fullyPaid ? new Date() : p.paidAt },
          });
        }
      }
    } else if (entityType === "GOAL") {
      const goal = await db.goal.findUnique({ where: { id: entityId } });
      if (goal) {
        const newCurrent = goal.currentAmount + amt;
        const completed = newCurrent >= goal.targetAmount;
        await db.goal.update({
          where: { id: entityId },
          data: { currentAmount: newCurrent, completed },
        });
      }
    }

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/installment-payments]", err);
    return NextResponse.json({ error: "Gagal menambah pembayaran cicilan." }, { status: 500 });
  }
}
