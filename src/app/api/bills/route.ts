import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/bills — list all bills, ordered by dueDay
export async function GET() {
  try {
    const bills = await db.bill.findMany({
      orderBy: [{ paidThisMonth: "asc" }, { dueDay: "asc" }],
    });
    return NextResponse.json(bills);
  } catch (err) {
    console.error("[GET /api/bills]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar tagihan." },
      { status: 500 }
    );
  }
}

// POST /api/bills — create bill
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, amount, dueDay, category, accountId, recurring, note } =
      body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama tagihan wajib diisi." },
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
    const day = Number(dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return NextResponse.json(
        { error: "Tanggal jatuh tempo harus antara 1-31." },
        { status: 400 }
      );
    }

    const bill = await db.bill.create({
      data: {
        name: name.trim(),
        amount: amt,
        dueDay: day,
        category: category?.trim() || "Tagihan",
        accountId: accountId || null,
        recurring: recurring !== undefined ? Boolean(recurring) : true,
        note: note?.trim() || null,
      },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (err) {
    console.error("[POST /api/bills]", err);
    return NextResponse.json(
      { error: "Gagal menambah tagihan." },
      { status: 500 }
    );
  }
}
