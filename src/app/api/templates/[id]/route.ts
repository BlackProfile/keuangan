import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/templates/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.transactionTemplate.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Template tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.transactionTemplate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/templates/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus template transaksi." },
      { status: 500 }
    );
  }
}
