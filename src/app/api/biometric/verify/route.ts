import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/biometric/verify
// Verify a biometric credential and update its stored counter.
// Body: { credentialId, counter }
// Returns { verified: true } on success.
// 404 if credentialId not found.
// 401 if the provided counter is <= the stored counter (replay detected).
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credentialId, counter } = body ?? {};

    if (!credentialId || !String(credentialId).trim()) {
      return NextResponse.json(
        { error: "credentialId wajib diisi." },
        { status: 400 }
      );
    }

    const cred = await db.biometricCredential.findUnique({
      where: { credentialId: String(credentialId).trim() },
    });
    if (!cred) {
      return NextResponse.json(
        { error: "Kredensial biometrik tidak ditemukan." },
        { status: 404 }
      );
    }

    const newCounter =
      counter !== undefined && counter !== null
        ? Math.floor(Number(counter))
        : NaN;

    if (Number.isFinite(newCounter)) {
      if (newCounter <= cred.counter) {
        // Replay attack suspected — log failure
        await db.auditLog
          .create({
            data: {
              action: "BIOMETRIC_LOGIN",
              detail: `Replay terdeteksi pada kredensial "${cred.name}" (stored=${cred.counter}, received=${newCounter})`,
              success: false,
            },
          })
          .catch(() => {
            /* ignore audit-log failure */
          });

        return NextResponse.json(
          { error: "Replay terdeteksi. Verifikasi gagal." },
          { status: 401 }
        );
      }

      await db.biometricCredential.update({
        where: { id: cred.id },
        data: { counter: newCounter },
      });
    }

    await db.auditLog
      .create({
        data: {
          action: "BIOMETRIC_LOGIN",
          detail: `Login biometrik berhasil untuk "${cred.name}"`,
          success: true,
        },
      })
      .catch(() => {
        /* ignore audit-log failure */
      });

    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("[POST /api/biometric/verify]", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi kredensial biometrik." },
      { status: 500 }
    );
  }
}
