import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// POST /api/accounts/transfer
// Body: { fromAccountId, toAccountId, amount, date, note?, fee? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { fromAccountId, toAccountId, amount, date, note, fee } = body ?? {};

    if (!fromAccountId || !toAccountId) {
      return NextResponse.json(
        { error: "Akun sumber dan tujuan wajib diisi." },
        { status: 400 }
      );
    }
    if (fromAccountId === toAccountId) {
      return NextResponse.json(
        { error: "Akun sumber dan tujuan tidak boleh sama." },
        { status: 400 }
      );
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah transfer harus berupa angka positif." },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { error: "Tanggal transfer wajib diisi." },
        { status: 400 }
      );
    }

    const feeAmt = fee !== undefined && fee !== null ? Number(fee) : 0;
    if (!Number.isFinite(feeAmt) || feeAmt < 0) {
      return NextResponse.json(
        { error: "Biaya transfer tidak valid." },
        { status: 400 }
      );
    }

    const [fromAccount, toAccount] = await Promise.all([
      db.account.findUnique({ where: { id: fromAccountId } }),
      db.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!fromAccount) {
      return NextResponse.json(
        { error: "Akun sumber tidak ditemukan." },
        { status: 404 }
      );
    }
    if (!toAccount) {
      return NextResponse.json(
        { error: "Akun tujuan tidak ditemukan." },
        { status: 404 }
      );
    }

    const parsedDate = parseDateLocal(date);

    const transfer = await db.$transaction(async (tx) => {
      // Create the Transfer record
      const created = await tx.transfer.create({
        data: {
          fromAccountId,
          toAccountId,
          amount: amt,
          date: parsedDate,
          note: note?.trim() || null,
          fee: feeAmt,
        },
      });

      // Decrement source account by (amount + fee)
      await tx.account.update({
        where: { id: fromAccountId },
        data: { balance: { decrement: amt + feeAmt } },
      });

      // Increment destination account by amount
      await tx.account.update({
        where: { id: toAccountId },
        data: { balance: { increment: amt } },
      });

      // Optionally create an EXPENSE transaction for the fee
      if (feeAmt > 0) {
        // Try to find a sensible expense category for the fee
        let feeCategory = await tx.category.findFirst({
          where: { type: "EXPENSE", name: "Lainnya" },
        });
        if (!feeCategory) {
          feeCategory = await tx.category.findFirst({
            where: { type: "EXPENSE" },
          });
        }

        if (feeCategory) {
          await tx.transaction.create({
            data: {
              type: "EXPENSE",
              amount: feeAmt,
              description: `Biaya transfer ke ${toAccount.name}`,
              date: parsedDate,
              categoryId: feeCategory.id,
              accountId: fromAccountId,
              note: note?.trim() || "Biaya transfer antar akun",
            },
          });
        }
      }

      return created;
    });

    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    console.error("[POST /api/accounts/transfer]", err);
    return NextResponse.json(
      { error: "Gagal melakukan transfer antar akun." },
      { status: 500 }
    );
  }
}
