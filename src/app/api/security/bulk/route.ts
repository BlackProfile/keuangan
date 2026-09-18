import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/security/bulk
// Body: { settings: Record<string, string> } — upsert ALL keys at once in a
// single transaction. Returns { message }. Logs to AuditLog with the list of
// keys whose values actually changed.
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const rawSettings: Record<string, string> =
      body?.settings && typeof body.settings === "object" ? body.settings : {};

    // Normalize to trimmed string values
    const settings: Record<string, string> = {};
    for (const [k, v] of Object.entries(rawSettings)) {
      if (typeof k === "string" && k.trim()) {
        settings[k.trim()] = String(v);
      }
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada pengaturan untuk disimpan." },
        { status: 400 }
      );
    }

    // Snapshot current values for the diff
    const existing = await db.securitySetting.findMany({
      where: { id: { in: keys } },
    });
    const existingMap = new Map(existing.map((e) => [e.id, e.value]));

    const changedKeys: string[] = [];
    for (const k of keys) {
      if (existingMap.get(k) !== settings[k]) changedKeys.push(k);
    }

    await db.$transaction(
      keys.map((k) =>
        db.securitySetting.upsert({
          where: { id: k },
          update: { value: settings[k] },
          create: { id: k, value: settings[k] },
        })
      )
    );

    await db.auditLog.create({
      data: {
        action: "SETTING_CHANGE",
        detail: `Bulk update ${keys.length} pengaturan (${changedKeys.join(", ")})`,
        success: true,
      },
    });

    return NextResponse.json({
      message: `${keys.length} pengaturan berhasil disimpan.`,
      saved: keys.length,
      changed: changedKeys,
    });
  } catch (err) {
    console.error("[PUT /api/security/bulk]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan keamanan secara massal." },
      { status: 500 }
    );
  }
}
