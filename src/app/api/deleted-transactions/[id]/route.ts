import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/deleted-transactions/[id] — permanently delete a single trash item
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.deletedTransaction.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Item tidak ditemukan di tempat sampah." },
        { status: 404 }
      );
    }
    await db.deletedTransaction.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/deleted-transactions/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus permanen." },
      { status: 500 }
    );
  }
}
