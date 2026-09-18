import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateShareToken } from "@/lib/share-helpers";
import { hashSecret } from "@/lib/crypto";

// GET /api/shares — list all share links (with view + comment counts),
// newest first.
export async function GET() {
  try {
    const links = await db.shareLink.findMany({
      include: {
        _count: {
          select: { views: true, comments: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(links);
  } catch (err) {
    console.error("[GET /api/shares]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar share link." },
      { status: 500 }
    );
  }
}

// POST /api/shares — create a new share link
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      accessLevel,
      scopeType,
      scopeData,
      expiresAt,
      maxViews,
      hoursActive,
      oneTime,
      maxConcurrent,
      password,
      requireEmail,
      ipWhitelist,
      hiddenAmounts,
      maskedDesc,
      customTheme,
      hideBranding,
      language,
    } = body ?? {};

    if (!title || !String(title).trim()) {
      return NextResponse.json(
        { error: "Judul share link wajib diisi." },
        { status: 400 }
      );
    }

    // Serialize scopeData JSON object → string
    let scopeDataStr: string | null = null;
    if (scopeData !== undefined && scopeData !== null) {
      try {
        scopeDataStr = JSON.stringify(scopeData);
      } catch {
        return NextResponse.json(
          { error: "scopeData harus berupa objek JSON yang valid." },
          { status: 400 }
        );
      }
    }

    // Hash password if provided (server-side: zero device salt fallback)
    let passwordHash: string | null = null;
    if (password && String(password).trim()) {
      passwordHash = await hashSecret(String(password));
    }

    // Generate fresh token (ensure uniqueness with retry)
    let token = generateShareToken();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db.shareLink.findUnique({
        where: { token },
        select: { id: true },
      });
      if (!existing) break;
      token = generateShareToken();
    }

    const created = await db.shareLink.create({
      data: {
        token,
        title: String(title).trim(),
        message: message ? String(message) : null,
        accessLevel: accessLevel || "VIEW",
        scopeType: scopeType || "ALL",
        scopeData: scopeDataStr,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxViews:
          maxViews !== undefined && maxViews !== null
            ? Math.max(0, Math.floor(Number(maxViews)))
            : null,
        hoursActive:
          hoursActive !== undefined && hoursActive !== null
            ? Math.max(0, Math.floor(Number(hoursActive)))
            : null,
        oneTime: !!oneTime,
        maxConcurrent:
          maxConcurrent !== undefined && maxConcurrent !== null
            ? Math.max(0, Math.floor(Number(maxConcurrent)))
            : null,
        passwordHash,
        requireEmail: requireEmail ? String(requireEmail) : null,
        ipWhitelist: ipWhitelist ? String(ipWhitelist) : null,
        hiddenAmounts: !!hiddenAmounts,
        maskedDesc: !!maskedDesc,
        customTheme: customTheme ? String(customTheme) : null,
        hideBranding: !!hideBranding,
        language: language || "id",
        active: true,
      },
      include: {
        _count: { select: { views: true, comments: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/shares]", err);
    return NextResponse.json(
      { error: "Gagal membuat share link." },
      { status: 500 }
    );
  }
}
