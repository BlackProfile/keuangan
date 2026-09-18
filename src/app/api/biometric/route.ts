import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/biometric
// List all biometric credentials (newest first).
export async function GET() {
  try {
    const creds = await db.biometricCredential.findMany({
      orderBy: { createdAt: "desc" },
    });
    const data = creds.map((c) => ({
      ...c,
      createdAt: c.createdAt.toISOString(),
    }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/biometric]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar kredensial biometrik." },
      { status: 500 }
    );
  }
}

// DELETE /api/biometric
// Delete a biometric credential by id (sent in the request body).
// Body: { id }
export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const { id } = body ?? {};

    if (!id || !String(id).trim()) {
      return NextResponse.json(
        { error: "ID kredensial wajib diisi." },
        { status: 400 }
      );
    }

    const existing = await db.biometricCredential.findUnique({
      where: { id: String(id).trim() },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Kredensial biometrik tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.biometricCredential.delete({ where: { id: existing.id } });

    return NextResponse.json({ deleted: true, id: existing.id });
  } catch (err) {
    console.error("[DELETE /api/biometric]", err);
    return NextResponse.json(
      { error: "Gagal menghapus kredensial biometrik." },
      { status: 500 }
    );
  }
}
