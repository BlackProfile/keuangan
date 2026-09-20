import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/split-bills/[id] — cascade delete bill + participants
export async function DELETE(
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

    // Participants cascade via onDelete: Cascade, but explicitly delete to be safe
    await db.splitBillParticipant.deleteMany({ where: { splitBillId: id } });
    await db.splitBill.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/split-bills/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus split bill." },
      { status: 500 }
    );
  }
}
