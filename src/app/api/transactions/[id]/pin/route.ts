import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/transactions/[id]/pin — toggle isPinned field
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await db.transaction.update({
      where: { id },
      data: { isPinned: !existing.isPinned },
      include: {
        category: true,
        account: true,
        splits: { include: { category: true } },
        receiptItems: true,
        group: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/transactions/[id]/pin]", err);
    return NextResponse.json(
      { error: "Gagal mengubah status pin transaksi." },
      { status: 500 }
    );
  }
}
