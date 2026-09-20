import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/transactions/[id]/hide — toggle isHidden field
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
      data: { isHidden: !existing.isHidden },
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
    console.error("[POST /api/transactions/[id]/hide]", err);
    return NextResponse.json(
      { error: "Gagal mengubah status sembunyi transaksi." },
      { status: 500 }
    );
  }
}
