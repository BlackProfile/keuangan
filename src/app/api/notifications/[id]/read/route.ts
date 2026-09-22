import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/notifications/[id]/read — mark a single notification as read.
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updated = await db.notification.update({
      where: { id },
      data: { read: true },
    });
    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("[PATCH /api/notifications/[id]/read]", err);
    return NextResponse.json(
      { error: "Gagal menandai notifikasi." },
      { status: 500 }
    );
  }
}

// POST /api/notifications/[id]/read — alias for PATCH (some clients prefer POST).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return PATCH(_req, { params });
}
