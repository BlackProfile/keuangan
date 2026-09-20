import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/challenges/participations/[id] — abandon a challenge participation
// Sets status=ABANDONED instead of hard-deleting (keeps history).
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.challengeParticipation.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Partisipasi tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await db.challengeParticipation.update({
      where: { id },
      data: { status: "ABANDONED", endDate: new Date() },
      include: { challenge: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[DELETE /api/challenges/participations/[id]]", err);
    return NextResponse.json(
      { error: "Gagal meninggalkan tantangan." },
      { status: 500 }
    );
  }
}
