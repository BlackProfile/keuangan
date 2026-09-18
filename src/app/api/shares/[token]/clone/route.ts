import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateShareToken } from "@/lib/share-helpers";

// POST /api/shares/[token]/clone — clone this link's config into a new link
// with a fresh token (active, viewCount=0, fresh timestamps).
// Sensitive fields (passwordHash, requireEmail) are also cloned verbatim —
// caller can update them afterwards if needed.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const original = await db.shareLink.findUnique({
      where: { token },
    });

    if (!original || !original.active) {
      return NextResponse.json(
        { error: "Link tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // Generate a fresh unique token
    let newToken = generateShareToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await db.shareLink.findUnique({
        where: { token: newToken },
        select: { id: true },
      });
      if (!clash) break;
      newToken = generateShareToken();
    }

    const cloned = await db.shareLink.create({
      data: {
        token: newToken,
        title: original.title,
        message: original.message,
        accessLevel: original.accessLevel,
        scopeType: original.scopeType,
        scopeData: original.scopeData,
        // Reset expiry counters: cloned link starts fresh & active
        expiresAt: original.expiresAt,
        maxViews: original.maxViews,
        viewCount: 0,
        hoursActive: original.hoursActive,
        oneTime: original.oneTime,
        maxConcurrent: original.maxConcurrent,
        passwordHash: original.passwordHash,
        requireEmail: original.requireEmail,
        ipWhitelist: original.ipWhitelist,
        hiddenAmounts: original.hiddenAmounts,
        maskedDesc: original.maskedDesc,
        customTheme: original.customTheme,
        hideBranding: original.hideBranding,
        language: original.language,
        active: true,
      },
      include: {
        _count: { select: { views: true, comments: true } },
      },
    });

    return NextResponse.json(cloned, { status: 201 });
  } catch (err) {
    console.error("[POST /api/shares/[token]/clone]", err);
    return NextResponse.json(
      { error: "Gagal mengkloning share link." },
      { status: 500 }
    );
  }
}
