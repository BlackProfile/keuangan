import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DEFAULT_SECURITY_CONFIG,
  SECURITY_KEYS,
} from "@/lib/security-defaults";

// GET /api/security
// Return all security settings as a key-value object, merged with
// DEFAULT_SECURITY_CONFIG so unset keys get defaults. Any custom keys
// stored outside the default set are preserved and returned too.
export async function GET() {
  try {
    const rows = await db.securitySetting.findMany();
    const stored: Record<string, string> = {};
    for (const r of rows) stored[r.id] = r.value;

    const merged: Record<string, string> = {};
    // Fill defaults first so all default keys exist
    for (const key of SECURITY_KEYS) {
      merged[key] =
        key in stored
          ? stored[key]
          : String(
              DEFAULT_SECURITY_CONFIG[
                key as keyof typeof DEFAULT_SECURITY_CONFIG
              ]
            );
    }
    // Include any custom (non-default) keys stored in DB
    for (const k of Object.keys(stored)) {
      if (!(k in merged)) merged[k] = stored[k];
    }

    return NextResponse.json(merged);
  } catch (err) {
    console.error("[GET /api/security]", err);
    return NextResponse.json(
      { error: "Gagal memuat pengaturan keamanan." },
      { status: 500 }
    );
  }
}

// PUT /api/security
// Body shapes accepted:
//   { key, value }              — upsert a single key
//   { settings: Record<...> }   — upsert multiple keys
// Writes an AuditLog entry with action "SETTING_CHANGE" and detail listing
// the keys whose values actually changed.
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const settings: Record<string, string> = {};

    if (body?.settings && typeof body.settings === "object") {
      for (const [k, v] of Object.entries(body.settings)) {
        if (typeof k === "string" && k.trim()) {
          settings[k.trim()] = String(v);
        }
      }
    } else if (typeof body?.key === "string" && body.key.trim()) {
      if (body.value === undefined || body.value === null) {
        return NextResponse.json(
          { error: "Nilai pengaturan wajib diisi." },
          { status: 400 }
        );
      }
      settings[body.key.trim()] = String(body.value);
    } else {
      return NextResponse.json(
        { error: "Body harus berisi {key, value} atau {settings: {...}}." },
        { status: 400 }
      );
    }

    const keys = Object.keys(settings);
    if (keys.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada pengaturan untuk disimpan." },
        { status: 400 }
      );
    }

    // Snapshot current values to compute diffs for the audit log
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

    if (changedKeys.length > 0) {
      await db.auditLog.create({
        data: {
          action: "SETTING_CHANGE",
          detail: `Mengubah pengaturan: ${changedKeys.join(", ")}`,
          success: true,
        },
      });
    }

    return NextResponse.json({ settings, changed: changedKeys });
  } catch (err) {
    console.error("[PUT /api/security]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pengaturan keamanan." },
      { status: 500 }
    );
  }
}
