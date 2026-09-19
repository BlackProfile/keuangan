import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashSecret, constantTimeCompare } from "@/lib/crypto";

// POST /api/shares/[token]/verify
// Body: { password?, email? }
// Verifies password (SHA-256 + salt, constant-time compare) or email match.
// Returns { verified: true } on success, 401 on failure.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    const { password, email } = body ?? {};

    const link = await db.shareLink.findUnique({
      where: { token },
      select: {
        id: true,
        active: true,
        passwordHash: true,
        requireEmail: true,
      },
    });

    if (!link || !link.active) {
      return NextResponse.json(
        { error: "Link tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // Password verification path
    if (link.passwordHash) {
      if (!password || !String(password).trim()) {
        return NextResponse.json(
          { error: "Password salah" },
          { status: 401 }
        );
      }
      const candidateHash = await hashSecret(String(password));
      const ok = constantTimeCompare(candidateHash, link.passwordHash);
      if (!ok) {
        return NextResponse.json(
          { error: "Password salah" },
          { status: 401 }
        );
      }
      return NextResponse.json({ verified: true });
    }

    // Email verification path
    if (link.requireEmail) {
      if (!email || !String(email).trim()) {
        return NextResponse.json(
          { error: "Email tidak cocok" },
          { status: 401 }
        );
      }
      const a = String(email).trim().toLowerCase();
      const b = link.requireEmail.trim().toLowerCase();
      const ok = constantTimeCompare(a, b);
      if (!ok) {
        return NextResponse.json(
          { error: "Email tidak cocok" },
          { status: 401 }
        );
      }
      return NextResponse.json({ verified: true });
    }

    // No password / email gate — already verified
    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("[POST /api/shares/[token]/verify]", err);
    return NextResponse.json(
      { error: "Gagal memverifikasi akses share link." },
      { status: 500 }
    );
  }
}
