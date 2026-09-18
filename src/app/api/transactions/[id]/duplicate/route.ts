import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/transactions/[id]/duplicate — duplicate a transaction with its
// splits and receipt items. New transaction has date = today, isPinned=false,
// status="CONFIRMED", and fresh createdAt/updatedAt. Account balance is
// updated if the duplicate references an account.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const original = await db.transaction.findUnique({
      where: { id },
      include: {
        splits: true,
        receiptItems: true,
        category: true,
        account: true,
        group: true,
      },
    });

    if (!original) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    const today = new Date();

    const duplicated = await db.$transaction(async (tx) => {
      // 1. Create the duplicated transaction (new id, date = today,
      //    isPinned=false, status="CONFIRMED", fresh timestamps)
      const created = await tx.transaction.create({
        data: {
          type: original.type,
          amount: original.amount,
          description: original.description,
          date: today,
          categoryId: original.categoryId,
          accountId: original.accountId,
          note: original.note,
          tags: original.tags,
          merchant: original.merchant,
          isRecurringGenerated: false,
          time: original.time,
          photoUrl: original.photoUrl,
          mood: original.mood,
          priority: original.priority,
          paymentStatus: original.paymentStatus,
          paymentMethod: original.paymentMethod,
          recipient: original.recipient,
          currency: original.currency,
          originalAmount: original.originalAmount,
          exchangeRate: original.exchangeRate,
          parentTransactionId: original.parentTransactionId,
          groupId: original.groupId,
          installmentId: original.installmentId,
          isSplit: original.isSplit,
          isDebt: original.isDebt,
          isReimbursable: original.isReimbursable,
          reimbursed: original.reimbursed,
          isSubscription: original.isSubscription,
          isTaxDeductible: original.isTaxDeductible,
          isBusinessExpense: original.isBusinessExpense,
          excludeFromBudget: original.excludeFromBudget,
          excludeFromStats: original.excludeFromStats,
          isPinned: false,
          cashbackAmount: original.cashbackAmount,
          originalPrice: original.originalPrice,
          discountAmount: original.discountAmount,
          debtDueDate: original.debtDueDate,
          creditor: original.creditor,
          goalId: original.goalId,
          assignedTo: original.assignedTo,
          status: "CONFIRMED",
          linkUrl: original.linkUrl,
        },
        include: {
          splits: { include: { category: true } },
          receiptItems: true,
          category: true,
          account: true,
          group: true,
        },
      });

      // 2. Duplicate splits (if any)
      if (original.splits.length > 0) {
        await tx.transactionSplit.createMany({
          data: original.splits.map((s) => ({
            parentTransactionId: created.id,
            amount: s.amount,
            categoryId: s.categoryId,
            note: s.note,
          })),
        });
      }

      // 3. Duplicate receipt items (if any)
      if (original.receiptItems.length > 0) {
        await tx.receiptItem.createMany({
          data: original.receiptItems.map((it) => ({
            transactionId: created.id,
            name: it.name,
            qty: it.qty,
            price: it.price,
            total: it.total,
          })),
        });
      }

      // 4. Update account balance if accountId is set
      if (created.accountId) {
        const delta = created.type === "INCOME" ? created.amount : -created.amount;
        await tx.account.update({
          where: { id: created.accountId },
          data: { balance: { increment: delta } },
        });
      }

      // Refetch with relations so the returned object has splits/receiptItems
      const refreshed = await tx.transaction.findUnique({
        where: { id: created.id },
        include: {
          splits: { include: { category: true } },
          receiptItems: true,
          category: true,
          account: true,
          group: true,
        },
      });

      return refreshed ?? created;
    });

    return NextResponse.json(duplicated, { status: 201 });
  } catch (err) {
    console.error("[POST /api/transactions/[id]/duplicate]", err);
    return NextResponse.json(
      { error: "Gagal menduplikasi transaksi." },
      { status: 500 }
    );
  }
}
