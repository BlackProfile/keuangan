import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// GET /api/trusted-devices
// List trusted devices whose trustedUntil is in the future, ordered by
// lastSeen desc.
export async function GET() {
  try {
    const now = new Date();
    const devices = await db.trustedDevice.findMany({
      where: { trustedUntil: { gt: now } },
      orderBy: { lastSeen: "desc" },
    });
    const data = devices.map((d) => ({
      ...d,
      trustedUntil: d.trustedUntil.toISOString(),
      lastSeen: d.lastSeen.toISOString(),
      createdAt: d.createdAt.toISOString(),
    }));
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/trusted-devices]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar perangkat terpercaya." },
      { status: 500 }
    );
  }
}

// POST /api/trusted-devices
// Body: { name, fingerprint, trustedDays }
// If a device with the same fingerprint already exists, update it (refresh
// trustedUntil + lastSeen + name). Otherwise create a new one.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, fingerprint, trustedDays } = body ?? {};

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: "Nama perangkat wajib diisi." },
        { status: 400 }
      );
    }
    if (!fingerprint || !String(fingerprint).trim()) {
      return NextResponse.json(
        { error: "Fingerprint perangkat wajib diisi." },
        { status: 400 }
      );
    }

    const fp = String(fingerprint).trim();
    const days =
      trustedDays !== undefined && trustedDays !== null
        ? Math.max(1, Math.floor(Number(trustedDays)) || 1)
        : 30;
    const trustedUntil = new Date(Date.now() + days * MS_PER_DAY);

    const existing = await db.trustedDevice.findUnique({
      where: { fingerprint: fp },
    });

    let device;
    if (existing) {
      device = await db.trustedDevice.update({
        where: { id: existing.id },
        data: {
          name: String(name).trim(),
          trustedUntil,
          lastSeen: new Date(),
        },
      });
    } else {
      device = await db.trustedDevice.create({
        data: {
          name: String(name).trim(),
          fingerprint: fp,
          trustedUntil,
          lastSeen: new Date(),
        },
      });
    }

    await db.auditLog
      .create({
        data: {
          action: "TRUSTED_DEVICE_ADD",
          detail: `${existing ? "Memperbarui" : "Menambahkan"} perangkat terpercaya "${String(name).trim()}"`,
          success: true,
        },
      })
      .catch(() => {
        /* ignore audit-log failure */
      });

    return NextResponse.json(
      {
        ...device,
        trustedUntil: device.trustedUntil.toISOString(),
        lastSeen: device.lastSeen.toISOString(),
        createdAt: device.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/trusted-devices]", err);
    return NextResponse.json(
      { error: "Gagal menambah perangkat terpercaya." },
      { status: 500 }
    );
  }
}
