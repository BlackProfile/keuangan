import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/notifications/[id] — remove a single notification.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[DELETE /api/notifications/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus notifikasi." },
      { status: 500 }
    );
  }
}
