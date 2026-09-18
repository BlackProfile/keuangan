import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/audit
// List audit logs, paginated: ?limit=100&offset=0&action=LOGIN_FAILED
// Ordered by createdAt desc, includes count.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action") ?? undefined;
    const rawLimit = Number(searchParams.get("limit") ?? "100");
    const rawOffset = Number(searchParams.get("offset") ?? "0");
    const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? Math.floor(rawLimit) : 100, 1), 500);
    const offset = Math.max(Number.isFinite(rawOffset) ? Math.floor(rawOffset) : 0, 0);

    const where = action ? { action } : {};
    const [rows, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      db.auditLog.count({ where }),
    ]);

    // Format dates to ISO strings explicitly
    const data = rows.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ data, total, limit, offset });
  } catch (err) {
    console.error("[GET /api/audit]", err);
    return NextResponse.json(
      { error: "Gagal memuat log audit." },
      { status: 500 }
    );
  }
}

// POST /api/audit
// Create an audit log entry.
// Body: { action, detail?, success?, fingerprint?, userAgent? }
// (AuditLog schema has no `fingerprint` field — the device fingerprint is
// stored in `ipAddress`, which is the closest available string field for
// identifying the originating client in this local-only app.)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, detail, success, fingerprint, userAgent } = body ?? {};

    if (!action || typeof action !== "string" || !action.trim()) {
      return NextResponse.json(
        { error: "Aksi wajib diisi." },
        { status: 400 }
      );
    }

    const entry = await db.auditLog.create({
      data: {
        action: action.trim(),
        detail: detail !== undefined && detail !== null ? String(detail) : null,
        success: success !== undefined ? Boolean(success) : true,
        ipAddress: fingerprint ? String(fingerprint) : null,
        userAgent: userAgent ? String(userAgent) : null,
      },
    });

    return NextResponse.json(
      { ...entry, createdAt: entry.createdAt.toISOString() },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/audit]", err);
    return NextResponse.json(
      { error: "Gagal membuat log audit." },
      { status: 500 }
    );
  }
}
