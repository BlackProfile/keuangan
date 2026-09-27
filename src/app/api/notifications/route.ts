import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export interface NotificationPayload {
  type: string;
  title: string;
  body: string;
  icon?: string;
}

// GET /api/notifications — list newest-first, capped at 50.
export async function GET() {
  try {
    const items = await db.notification.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });
    return NextResponse.json(items);
  } catch (err) {
    console.error("[GET /api/notifications]", err);
    return NextResponse.json(
      { error: "Gagal memuat notifikasi." },
      { status: 500 }
    );
  }
}

// POST /api/notifications — create a new notification.
// Idempotent: if the same (type, title) was created in the last 24h, returns the existing one.
// Body: { type, title, body, icon? }
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as NotificationPayload;
    const type = (body.type ?? "").trim();
    const title = (body.title ?? "").trim();
    const text = (body.body ?? "").trim();
    if (!type || !title) {
      return NextResponse.json(
        { error: "type dan title wajib diisi." },
        { status: 400 }
      );
    }
    const icon = (body.icon ?? "Bell").trim();

    // Dedupe: same type+title+body within 24 hours
    // (body is included so we can have per-goal milestone notifications like
    //  "Target 80% Tercapai" with different goal names without false-deduping)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db.notification.findFirst({
      where: { type, title, body: text, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      return NextResponse.json(existing, { status: 200 });
    }

    const created = await db.notification.create({
      data: { type, title, body: text, icon },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/notifications]", err);
    return NextResponse.json(
      { error: "Gagal membuat notifikasi." },
      { status: 500 }
    );
  }
}
