import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/transaction-groups/[id] — set groupId=null on linked
// transactions first, then delete the group
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.transactionGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Grup transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.$transaction(async (tx) => {
      // Detach linked transactions (groupId field is nullable, schema onDelete:
      // SetNull, but we do it explicitly for clarity & safety)
      await tx.transaction.updateMany({
        where: { groupId: id },
        data: { groupId: null },
      });
      await tx.transactionGroup.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/transaction-groups/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus grup transaksi." },
      { status: 500 }
    );
  }
}
