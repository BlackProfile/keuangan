import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/split-bills/[id]/settle — mark all participants as paid,
// set the bill as settled=true.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.splitBill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Split bill tidak ditemukan." },
        { status: 404 }
      );
    }

    const now = new Date();
    await db.$transaction([
      db.splitBillParticipant.updateMany({
        where: { splitBillId: id },
        data: { paid: true, paidAt: now },
      }),
      db.splitBill.update({
        where: { id },
        data: { settled: true },
      }),
    ]);

    const bill = await db.splitBill.findUnique({
      where: { id },
      include: { participants: true },
    });
    return NextResponse.json(bill);
  } catch (err) {
    console.error("[POST /api/split-bills/[id]/settle]", err);
    return NextResponse.json(
      { error: "Gagal menyelesaikan split bill." },
      { status: 500 }
    );
  }
}
