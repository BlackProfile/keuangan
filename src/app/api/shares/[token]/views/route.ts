import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/shares/[token]/views — list all view records for analytics
export async function GET(
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

    const views = await db.shareView.findMany({
      where: { shareLinkId: link.id },
      orderBy: { viewedAt: "desc" },
      select: {
        id: true,
        ipAddress: true,
        location: true,
        viewedAt: true,
      },
    });

    return NextResponse.json(views);
  } catch (err) {
    console.error("[GET /api/shares/[token]/views]", err);
    return NextResponse.json(
      { error: "Gagal memuat data views share link." },
      { status: 500 }
    );
  }
}
