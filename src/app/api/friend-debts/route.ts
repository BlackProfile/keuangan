import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import type { FriendDebtInput } from "@/lib/types";

const VALID_DEBT_TYPES = ["DEBT", "RECEIVABLE"];

// GET /api/friend-debts — list ordered by settled asc (unsettled first),
// then date desc (newest first).
export async function GET() {
  try {
    const debts = await db.friendDebt.findMany({
      orderBy: [{ settled: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(debts);
  } catch (err) {
    console.error("[GET /api/friend-debts]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar hutang teman." },
      { status: 500 }
    );
  }
}

// POST /api/friend-debts — create a new friend debt record
// Body: { friendName, type, amount, description?, date?, dueDate?, note? }
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as FriendDebtInput & {
      date?: string;
    };

    const {
      friendName,
      type,
      amount,
      description,
      dueDate,
      note,
      date,
    } = body ?? {};

    if (!friendName || !friendName.trim()) {
      return NextResponse.json(
        { error: "Nama teman wajib diisi." },
        { status: 400 }
      );
    }
    if (!type || !VALID_DEBT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Tipe utang tidak valid (DEBT atau RECEIVABLE)." },
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

    const debt = await db.friendDebt.create({
      data: {
        friendName: friendName.trim(),
        type,
        amount: amt,
        description: description?.trim() || null,
        date: date ? parseDateLocal(date) : new Date(),
        dueDate: dueDate ? parseDateLocal(dueDate) : null,
        note: note?.trim() || null,
        settled: false,
        reminderSent: false,
      },
    });

    return NextResponse.json(debt, { status: 201 });
  } catch (err) {
    console.error("[POST /api/friend-debts]", err);
    return NextResponse.json(
      { error: "Gagal menambah hutang teman." },
      { status: 500 }
    );
  }
}
