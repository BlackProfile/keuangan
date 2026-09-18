import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/shares/[token]/revoke — set active=false on a share link
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const link = await db.shareLink.findUnique({
      where: { token },
      select: { id: true, active: true },
    });

    if (!link || !link.active) {
      return NextResponse.json(
        { error: "Link tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    await db.shareLink.update({
      where: { id: link.id },
      data: { active: false },
    });

    return NextResponse.json({
      message: "Share link berhasil dicabut.",
    });
  } catch (err) {
    console.error("[POST /api/shares/[token]/revoke]", err);
    return NextResponse.json(
      { error: "Gagal mencabut share link." },
      { status: 500 }
    );
  }
}
