import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings
// Returns all settings as a flat key-value object.
export async function GET() {
  try {
    const settings = await db.setting.findMany();
    const result: Record<string, string> = {};
    for (const s of settings) {
      result[s.id] = s.value;
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/settings]", err);
    return NextResponse.json(
      { error: "Gagal memuat pengaturan." },
      { status: 500 }
    );
  }
}

// PUT /api/settings
// Body: { key, value } — upserts a setting.
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { key, value } = body ?? {};

    if (!key || typeof key !== "string" || !key.trim()) {
      return NextResponse.json(
        { error: "Kunci pengaturan wajib diisi." },
        { status: 400 }
      );
    }
    if (value === undefined || value === null) {
      return NextResponse.json(
        { error: "Nilai pengaturan wajib diisi." },
        { status: 400 }
      );
    }

    const setting = await db.setting.upsert({
      where: { id: key.trim() },
      update: { value: String(value) },
      create: { id: key.trim(), value: String(value) },
    });

    return NextResponse.json(setting);
  } catch (err) {
    console.error("[PUT /api/settings]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan." },
      { status: 500 }
    );
  }
}
