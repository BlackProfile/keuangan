import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/shares/[token]/comments — list comments for a share link
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

    const comments = await db.shareComment.findMany({
      where: { shareLinkId: link.id },
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        transactionId: true,
        author: true,
        content: true,
        isPinned: true,
        createdAt: true,
      },
    });

    return NextResponse.json(comments);
  } catch (err) {
    console.error("[GET /api/shares/[token]/comments]", err);
    return NextResponse.json(
      { error: "Gagal memuat komentar share link." },
      { status: 500 }
    );
  }
}

// POST /api/shares/[token]/comments — add a new comment
// Body: { author, content, transactionId? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json().catch(() => ({}));
    const { author, content, transactionId } = body ?? {};

    if (!author || !String(author).trim()) {
      return NextResponse.json(
        { error: "Nama penulis komentar wajib diisi." },
        { status: 400 }
      );
    }
    if (!content || !String(content).trim()) {
      return NextResponse.json(
        { error: "Konten komentar wajib diisi." },
        { status: 400 }
      );
    }

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

    // If transactionId provided, ensure it exists (don't fail hard if missing)
    if (transactionId) {
      const tx = await db.transaction.findUnique({
        where: { id: String(transactionId) },
        select: { id: true },
      });
      if (!tx) {
        return NextResponse.json(
          { error: "Transaksi tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    const created = await db.shareComment.create({
      data: {
        shareLinkId: link.id,
        transactionId: transactionId ? String(transactionId) : null,
        author: String(author).trim().slice(0, 100),
        content: String(content).trim().slice(0, 2000),
        isPinned: false,
      },
      select: {
        id: true,
        transactionId: true,
        author: true,
        content: true,
        isPinned: true,
        createdAt: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/shares/[token]/comments]", err);
    return NextResponse.json(
      { error: "Gagal menambah komentar share link." },
      { status: 500 }
    );
  }
}
