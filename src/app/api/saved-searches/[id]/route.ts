import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/saved-searches/[id] — remove a saved search
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.savedSearch.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Pencarian tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.savedSearch.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/saved-searches/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus pencarian." },
      { status: 500 }
    );
  }
}
