import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeNextDate, parseDateLocal } from "@/lib/format";
import type { Frequency, TransactionType } from "@/lib/types";

const VALID_FREQUENCIES: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

// GET /api/recurring — list recurring with category & account,
// ordered by active desc then nextDate asc
export async function GET() {
  try {
    const recurring = await db.recurringTransaction.findMany({
      include: { category: true, account: true },
      orderBy: [{ active: "desc" }, { nextDate: "asc" }],
    });
    return NextResponse.json(recurring);
  } catch (err) {
    console.error("[GET /api/recurring]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar transaksi berulang." },
      { status: 500 }
    );
  }
}

// POST /api/recurring — create new recurring transaction
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type,
      amount,
      description,
      categoryId,
      accountId,
      frequency,
      interval,
      startDate,
      endDate,
      note,
      active,
    } = body ?? {};

    if (!type || (type !== "INCOME" && type !== "EXPENSE")) {
      return NextResponse.json(
        { error: "Tipe transaksi tidak valid." },
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
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Keterangan wajib diisi." },
        { status: 400 }
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Kategori wajib dipilih." },
        { status: 400 }
      );
    }
    if (!frequency || !VALID_FREQUENCIES.includes(frequency as Frequency)) {
      return NextResponse.json(
        { error: "Frekuensi tidak valid (DAILY/WEEKLY/MONTHLY/YEARLY)." },
        { status: 400 }
      );
    }
    const intervalNum = Number(interval);
    if (!Number.isFinite(intervalNum) || intervalNum <= 0) {
      return NextResponse.json(
        { error: "Interval harus berupa angka positif." },
        { status: 400 }
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { error: "Tanggal mulai wajib diisi." },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }
    if (category.type !== (type as TransactionType)) {
      return NextResponse.json(
        {
          error: `Kategori "${category.name}" tidak cocok untuk tipe transaksi ${type}.`,
        },
        { status: 400 }
      );
    }

    if (accountId) {
      const account = await db.account.findUnique({ where: { id: accountId } });
      if (!account) {
        return NextResponse.json(
          { error: "Akun tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    const startDateParsed = parseDateLocal(startDate);
    const nextDate = computeNextDate(
      startDateParsed,
      frequency as Frequency,
      intervalNum
    );

    const endDateParsed = endDate ? parseDateLocal(endDate) : null;

    const created = await db.recurringTransaction.create({
      data: {
        type: type as TransactionType,
        amount: amt,
        description: description.trim(),
        categoryId,
        accountId: accountId || null,
        frequency: frequency as Frequency,
        interval: Math.floor(intervalNum),
        startDate: startDateParsed,
        nextDate,
        endDate: endDateParsed,
        note: note?.trim() || null,
        active: active !== undefined ? Boolean(active) : true,
      },
      include: { category: true, account: true },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/recurring]", err);
    return NextResponse.json(
      { error: "Gagal menambah transaksi berulang." },
      { status: 500 }
    );
  }
}
