import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/trusted-devices/[id]
// Revoke (delete) a trusted device by id.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.trustedDevice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Perangkat terpercaya tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.trustedDevice.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    console.error("[DELETE /api/trusted-devices/[id]]", err);
    return NextResponse.json(
      { error: "Gagal mencabut perangkat terpercaya." },
      { status: 500 }
    );
  }
}
