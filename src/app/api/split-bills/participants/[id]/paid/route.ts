import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/split-bills/participants/[id]/paid — toggle paid status of a participant
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.splitBillParticipant.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Peserta tidak ditemukan." },
        { status: 404 }
      );
    }

    const newPaid = !existing.paid;
    const updated = await db.splitBillParticipant.update({
      where: { id },
      data: { paid: newPaid, paidAt: newPaid ? new Date() : null },
    });

    // Re-fetch all participants (after update) and sync the bill's settled flag:
    // settled=true only if every participant is paid.
    const allParticipants = await db.splitBillParticipant.findMany({
      where: { splitBillId: existing.splitBillId },
      select: { paid: true },
    });
    const allPaid =
      allParticipants.length > 0 && allParticipants.every((p) => p.paid);
    await db.splitBill.update({
      where: { id: existing.splitBillId },
      data: { settled: allPaid },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/split-bills/participants/[id]/paid]", err);
    return NextResponse.json(
      { error: "Gagal mengubah status pembayaran peserta." },
      { status: 500 }
    );
  }
}
