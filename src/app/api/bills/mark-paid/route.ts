import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/bills/mark-paid — body { id } sets paidThisMonth=true, paidAt=now
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id } = body ?? {};

    if (!id) {
      return NextResponse.json(
        { error: "ID tagihan wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await db.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await db.bill.update({
      where: { id },
      data: {
        paidThisMonth: true,
        paidAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/bills/mark-paid]", err);
    return NextResponse.json(
      { error: "Gagal menandai tagihan sebagai lunas." },
      { status: 500 }
    );
  }
}
