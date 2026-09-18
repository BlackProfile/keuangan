import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import type { DebtType } from "@/lib/types";

const VALID_DEBT_TYPES: DebtType[] = ["DEBT", "RECEIVABLE"];

// GET /api/debts — list debts ordered by settled asc (unsettled first),
// then dueDate asc (soonest first; nulls last)
export async function GET() {
  try {
    const debts = await db.debt.findMany({
      orderBy: [{ settled: "asc" }, { dueDate: "asc" }],
    });
    return NextResponse.json(debts);
  } catch (err) {
    console.error("[GET /api/debts]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar utang & piutang." },
      { status: 500 }
    );
  }
}

// POST /api/debts — create new debt
// Body: { type, person, amount, paidAmount?, dueDate?, description?, note? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, person, amount, paidAmount, dueDate, description, note } =
      body ?? {};

    if (!type || !VALID_DEBT_TYPES.includes(type as DebtType)) {
      return NextResponse.json(
        { error: "Tipe utang tidak valid (DEBT atau RECEIVABLE)." },
        { status: 400 }
      );
    }
    if (!person || !person.trim()) {
      return NextResponse.json(
        { error: "Nama orang wajib diisi." },
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
    const paid =
      paidAmount !== undefined && paidAmount !== null
        ? Number(paidAmount)
        : 0;
    if (!Number.isFinite(paid) || paid < 0) {
      return NextResponse.json(
        { error: "Jumlah dibayar tidak valid." },
        { status: 400 }
      );
    }

    const debt = await db.debt.create({
      data: {
        type: type as DebtType,
        person: person.trim(),
        amount: amt,
        paidAmount: paid,
        dueDate: dueDate ? parseDateLocal(dueDate) : null,
        description: description?.trim() || null,
        note: note?.trim() || null,
        // Auto-settle if paidAmount >= amount
        settled: paid >= amt,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (err) {
    console.error("[POST /api/debts]", err);
    return NextResponse.json(
      { error: "Gagal menambah utang/piutang." },
      { status: 500 }
    );
  }
}
