import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/subscriptions — list active first, ordered by nextBilling
export async function GET() {
  try {
    const subs = await db.subscription.findMany({
      orderBy: [{ active: "desc" }, { nextBilling: "asc" }],
    });
    return NextResponse.json(subs);
  } catch (err) {
    console.error("[GET /api/subscriptions]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar langganan." },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions — create subscription
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      amount,
      billingCycle,
      nextBilling,
      category,
      icon,
      color,
      note,
    } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama langganan wajib diisi." },
        { status: 400 }
      );
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka positif." },
        { status: 400 }
      );
    }
    if (!nextBilling) {
      return NextResponse.json(
        { error: "Tanggal tagihan berikutnya wajib diisi." },
        { status: 400 }
      );
    }

    const sub = await db.subscription.create({
      data: {
        name: name.trim(),
        amount: amt,
        billingCycle: billingCycle || "MONTHLY",
        nextBilling: parseDateLocal(nextBilling),
        category: category?.trim() || "Hiburan",
        icon: icon || "RefreshCw",
        color: color || "#a855f7",
        note: note?.trim() || null,
      },
    });

    return NextResponse.json(sub, { status: 201 });
  } catch (err) {
    console.error("[POST /api/subscriptions]", err);
    return NextResponse.json(
      { error: "Gagal menambah langganan." },
      { status: 500 }
    );
  }
}
