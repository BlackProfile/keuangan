import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/installments/[id] — delete installment + linked transactions
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.installment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Cicilan tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.$transaction(async (tx) => {
      // Find all transactions linked to this installment
      const linked = await tx.transaction.findMany({
        where: { installmentId: id },
        select: { id: true, accountId: true, type: true, amount: true },
      });

      // Revert account balances for each linked transaction
      for (const t of linked) {
        if (t.accountId) {
          const delta = t.type === "INCOME" ? -t.amount : t.amount;
          await tx.account.update({
            where: { id: t.accountId },
            data: { balance: { increment: delta } },
          });
        }
      }

      // Delete linked transactions (splits & receipt items cascade on delete)
      if (linked.length > 0) {
        await tx.transaction.deleteMany({
          where: { installmentId: id },
        });
      }

      // Finally delete the installment itself
      await tx.installment.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/installments/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus cicilan." },
      { status: 500 }
    );
  }
}
