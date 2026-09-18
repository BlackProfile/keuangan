import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/transaction-groups — list groups with transaction count
export async function GET() {
  try {
    const groups = await db.transactionGroup.findMany({
      include: {
        _count: { select: { transactions: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(groups);
  } catch (err) {
    console.error("[GET /api/transaction-groups]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar grup transaksi." },
      { status: 500 }
    );
  }
}

// POST /api/transaction-groups — create group
// Body: { name, description?, color?, icon? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, description, color, icon } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama grup wajib diisi." },
        { status: 400 }
      );
    }

    const group = await db.transactionGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || "#10b981",
        icon: icon || "Folder",
      },
      include: {
        _count: { select: { transactions: true } },
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("[POST /api/transaction-groups]", err);
    return NextResponse.json(
      { error: "Gagal menambah grup transaksi." },
      { status: 500 }
    );
  }
}
