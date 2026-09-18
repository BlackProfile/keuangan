import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isShareExpired, viewsRemaining } from "@/lib/share-helpers";
import { hashSecret } from "@/lib/crypto";

// ---------------------------------------------------------------------------
// Shared helper — look up a ShareLink by either its `id` (cuid) or its
// `token` (short string). Used by PUT/DELETE so the management API can be
// invoked with either identifier from the same /api/shares/[token] route.
// ---------------------------------------------------------------------------
async function findShareLinkByIdentifier(identifier: string) {
  // Try by id first (matches the common case where the frontend sends the
  // share link's cuid). If no match, fall back to looking up by token.
  const byId = await db.shareLink.findUnique({
    where: { id: identifier },
  });
  if (byId) return byId;
  return db.shareLink.findUnique({ where: { token: identifier } });
}

// GET /api/shares/[token] — public endpoint.
// Increments viewCount + creates ShareView record (in a transaction).
// Returns sanitized link data WITHOUT passwordHash.
// Returns { requirePassword: true } if link has a passwordHash set.
// Returns { requireEmailVerification: true } if link has requireEmail set.
// Returns { expired: true, reason } if the link has expired.
// Returns 404 if link doesn't exist or is inactive.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const link = await db.shareLink.findUnique({
      where: { token },
      include: {
        _count: { select: { views: true, comments: true } },
      },
    });

    if (!link || !link.active) {
      return NextResponse.json(
        { error: "Link tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // Check expiry (does not mutate anything). Helper expects ISO strings;
    // Prisma returns Date objects, so we adapt the shape here.
    const expiry = isShareExpired({
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      hoursActive: link.hoursActive,
      createdAt: link.createdAt.toISOString(),
      maxViews: link.maxViews,
      viewCount: link.viewCount,
      oneTime: link.oneTime,
    });
    if (expiry.expired) {
      return NextResponse.json({
        expired: true,
        reason: expiry.reason ?? "Link sudah kadaluarsa.",
      });
    }

    // Capture IP + user-agent
    const ipAddress =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const userAgent =
      req.headers.get("user-agent") ?? req.headers.get("User-Agent") ?? null;

    // Increment viewCount + record ShareView atomically (race-safe)
    const updated = await db.$transaction(async (tx) => {
      const refreshed = await tx.shareLink.update({
        where: { id: link.id },
        data: { viewCount: { increment: 1 } },
        include: {
          _count: { select: { views: true, comments: true } },
        },
      });
      await tx.shareView.create({
        data: {
          shareLinkId: link.id,
          ipAddress,
          userAgent,
        },
      });
      return refreshed;
    });

    // Gate: password
    if (updated.passwordHash) {
      return NextResponse.json({ requirePassword: true });
    }

    // Gate: email verification
    if (updated.requireEmail) {
      return NextResponse.json({ requireEmailVerification: true });
    }

    // Strip sensitive fields before returning
    const sanitized = (({ passwordHash: _ph, ...rest }) => rest)(updated);

    const remaining = viewsRemaining(updated);

    return NextResponse.json({
      link: sanitized,
      expired: false,
      viewsRemaining: remaining,
    });
  } catch (err) {
    console.error("[GET /api/shares/[token]]", err);
    return NextResponse.json(
      { error: "Gagal memuat share link." },
      { status: 500 }
    );
  }
}

// PUT /api/shares/[token] — update a share link by id OR token.
// The frontend typically sends the link's `id` (cuid), but this handler
// accepts either identifier for flexibility.
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: identifier } = await params;
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
      active,
    } = body ?? {};

    const existing = await findShareLinkByIdentifier(identifier);
    if (!existing) {
      return NextResponse.json(
        { error: "Share link tidak ditemukan." },
        { status: 404 }
      );
    }

    // Build dynamic update payload (only defined fields)
    const data: Record<string, unknown> = {};

    if (title !== undefined) data.title = String(title).trim();
    if (message !== undefined) data.message = message ? String(message) : null;
    if (accessLevel !== undefined) data.accessLevel = accessLevel;
    if (scopeType !== undefined) data.scopeType = scopeType;

    if (scopeData !== undefined && scopeData !== null) {
      try {
        data.scopeData = JSON.stringify(scopeData);
      } catch {
        return NextResponse.json(
          { error: "scopeData harus berupa objek JSON yang valid." },
          { status: 400 }
        );
      }
    } else if (scopeData === null) {
      data.scopeData = null;
    }

    if (expiresAt !== undefined) {
      data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    if (maxViews !== undefined) {
      data.maxViews =
        maxViews === null ? null : Math.max(0, Math.floor(Number(maxViews)));
    }
    if (hoursActive !== undefined) {
      data.hoursActive =
        hoursActive === null
          ? null
          : Math.max(0, Math.floor(Number(hoursActive)));
    }
    if (oneTime !== undefined) data.oneTime = !!oneTime;
    if (maxConcurrent !== undefined) {
      data.maxConcurrent =
        maxConcurrent === null
          ? null
          : Math.max(0, Math.floor(Number(maxConcurrent)));
    }
    if (requireEmail !== undefined) {
      data.requireEmail = requireEmail ? String(requireEmail) : null;
    }
    if (ipWhitelist !== undefined) {
      data.ipWhitelist = ipWhitelist ? String(ipWhitelist) : null;
    }
    if (hiddenAmounts !== undefined) data.hiddenAmounts = !!hiddenAmounts;
    if (maskedDesc !== undefined) data.maskedDesc = !!maskedDesc;
    if (customTheme !== undefined) {
      data.customTheme = customTheme ? String(customTheme) : null;
    }
    if (hideBranding !== undefined) data.hideBranding = !!hideBranding;
    if (language !== undefined) data.language = language;
    if (active !== undefined) data.active = !!active;

    // If password provided, hash it. If empty string / null → clear it.
    if (password !== undefined) {
      if (password && String(password).trim()) {
        data.passwordHash = await hashSecret(String(password));
      } else {
        data.passwordHash = null;
      }
    }

    const updated = await db.shareLink.update({
      where: { id: existing.id },
      data,
      include: {
        _count: { select: { views: true, comments: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/shares/[token]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui share link." },
      { status: 500 }
    );
  }
}

// DELETE /api/shares/[token] — delete link + cascade views + comments.
// Accepts either id or token in the URL path.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token: identifier } = await params;

    const existing = await findShareLinkByIdentifier(identifier);
    if (!existing) {
      return NextResponse.json(
        { error: "Share link tidak ditemukan." },
        { status: 404 }
      );
    }

    // Prisma schema defines onDelete: Cascade on ShareView + ShareComment,
    // but we delete them explicitly to be safe (also works if schema changes).
    await db.$transaction([
      db.shareView.deleteMany({ where: { shareLinkId: existing.id } }),
      db.shareComment.deleteMany({ where: { shareLinkId: existing.id } }),
      db.shareLink.delete({ where: { id: existing.id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/shares/[token]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus share link." },
      { status: 500 }
    );
  }
}
