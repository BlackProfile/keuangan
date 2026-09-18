import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/biometric/register
// Register a new biometric credential.
// Body: { name, credentialId, publicKey, counter }
// Returns 201 with the created credential. 409 if credentialId already exists.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, credentialId, publicKey, counter } = body ?? {};

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Nama kredensial wajib diisi." },
        { status: 400 }
      );
    }
    if (!credentialId || !String(credentialId).trim()) {
      return NextResponse.json(
        { error: "credentialId wajib diisi." },
        { status: 400 }
      );
    }
    if (!publicKey || !String(publicKey).trim()) {
      return NextResponse.json(
        { error: "publicKey wajib diisi." },
        { status: 400 }
      );
    }

    const credId = String(credentialId).trim();
    const existing = await db.biometricCredential.findUnique({
      where: { credentialId: credId },
    });
    if (existing) {
      return NextResponse.json(
        { error: "credentialId sudah terdaftar." },
        { status: 409 }
      );
    }

    const counterNum =
      counter !== undefined && counter !== null
        ? Math.max(0, Math.floor(Number(counter)) || 0)
        : 0;

    const created = await db.biometricCredential.create({
      data: {
        name: String(name).trim(),
        credentialId: credId,
        publicKey: String(publicKey).trim(),
        counter: counterNum,
      },
    });

    // Audit log (best-effort; do not fail the registration if audit logging fails)
    await db.auditLog
      .create({
        data: {
          action: "BIOMETRIC_REGISTER",
          detail: `Mendaftarkan kredensial biometrik "${String(name).trim()}"`,
          success: true,
        },
      })
      .catch(() => {
        /* ignore audit-log failure */
      });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/biometric/register]", err);
    return NextResponse.json(
      { error: "Gagal mendaftarkan kredensial biometrik." },
      { status: 500 }
    );
  }
}
