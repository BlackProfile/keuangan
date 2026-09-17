import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeNextDate } from "@/lib/format";
import type { Frequency, TransactionType } from "@/lib/types";

// POST /api/recurring/run
// Find all active recurring where nextDate <= now (and endDate is null or >= now).
// For each: create a Transaction (date=nextDate), update account balance,
// set lastRunAt=now, compute new nextDate. Return {generated: count}.
export async function POST() {
  try {
    const now = new Date();

    const due = await db.recurringTransaction.findMany({
      where: {
        active: true,
        nextDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      include: { category: true, account: true },
    });

    let generated = 0;

    for (const r of due) {
      // Skip if past end date
      if (r.endDate && r.nextDate.getTime() > r.endDate.getTime()) continue;

      const txDate = r.nextDate;
      const frequency = r.frequency as Frequency;
      const txType = r.type as TransactionType;

      // Create the generated transaction with the recurring nextDate
      await db.transaction.create({
        data: {
          type: txType,
          amount: r.amount,
          description: r.description,
          date: txDate,
          categoryId: r.categoryId,
          accountId: r.accountId || null,
          note: r.note ?? null,
          isRecurringGenerated: true,
        },
      });

      // Update account balance if linked
      if (r.accountId) {
        const delta = txType === "INCOME" ? r.amount : -r.amount;
        await db.account.update({
          where: { id: r.accountId },
          data: { balance: { increment: delta } },
        });
      }

      // Compute the next run date (advance until future if schedule lapsed)
      let newNext = computeNextDate(txDate, frequency, r.interval);
      // Advance while still in the past & within end date
      while (newNext.getTime() <= now.getTime()) {
        if (r.endDate && newNext.getTime() > r.endDate.getTime()) break;
        newNext = computeNextDate(newNext, frequency, r.interval);
      }

      // Stop if new nextDate is beyond endDate — deactivate
      const isPastEnd = r.endDate !== null && newNext.getTime() > r.endDate.getTime();

      await db.recurringTransaction.update({
        where: { id: r.id },
        data: {
          lastRunAt: now,
          nextDate: newNext,
          ...(isPastEnd ? { active: false } : {}),
        },
      });

      generated += 1;
    }

    return NextResponse.json({ generated });
  } catch (err) {
    console.error("[POST /api/recurring/run]", err);
    return NextResponse.json(
      { error: "Gagal menjalankan transaksi berulang." },
      { status: 500 }
    );
  }
}
