import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// POST /api/deleted-transactions/[id]/restore
// Re-creates the original Transaction from the trash entry and removes it
// from the DeletedTransaction table. Also re-applies the account balance delta.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const trashed = await db.deletedTransaction.findUnique({
      where: { id },
    });
    if (!trashed) {
      return NextResponse.json(
        { error: "Item tidak ditemukan di tempat sampah." },
        { status: 404 }
      );
    }

    // Make sure the category still exists (otherwise we cannot restore)
    const category = await db.category.findUnique({
      where: { id: trashed.categoryId },
    });
    if (!category) {
      return NextResponse.json(
        {
          error:
            "Kategori asli transaksi sudah tidak ada. Hapus permanen atau ubah kategori terlebih dahulu.",
        },
        { status: 400 }
      );
    }

    // If account reference exists, verify it still exists
    let account: Awaited<ReturnType<typeof db.account.findUnique>> = null;
    if (trashed.accountId) {
      account = await db.account.findUnique({
        where: { id: trashed.accountId },
      });
      if (!account) {
        return NextResponse.json(
          {
            error:
              "Akun asli transaksi sudah tidak ada. Hapus permanen atau ubah akun terlebih dahulu.",
          },
          { status: 400 }
        );
      }
    }

    // Re-create the transaction
    const restored = await db.transaction.create({
      data: {
        type: trashed.type,
        amount: trashed.amount,
        description: trashed.description,
        date: parseDateLocal(trashed.date),
        categoryId: trashed.categoryId,
        accountId: trashed.accountId,
        note: trashed.note,
        tags: trashed.tags,
        merchant: trashed.merchant,
        status: "CONFIRMED",
      },
    });

    // Re-apply account balance
    if (restored.accountId) {
      const delta =
        restored.type === "INCOME" ? restored.amount : -restored.amount;
      await db.account.update({
        where: { id: restored.accountId },
        data: { balance: { increment: delta } },
      });
    }

    // Remove from trash
    await db.deletedTransaction.delete({ where: { id } });

    return NextResponse.json({
      ...trashed,
      date: trashed.date.toISOString(),
      deletedAt: trashed.deletedAt.toISOString(),
      expiresAt: trashed.expiresAt.toISOString(),
      restoredId: restored.id,
    });
  } catch (err) {
    console.error("[POST /api/deleted-transactions/[id]/restore]", err);
    return NextResponse.json(
      { error: "Gagal memulihkan transaksi." },
      { status: 500 }
    );
  }
}
