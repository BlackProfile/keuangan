import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/friend-debts/[id] — hard delete a friend debt record
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.friendDebt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Hutang/piutang tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.friendDebt.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/friend-debts/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus hutang/piutang teman." },
      { status: 500 }
    );
  }
}
