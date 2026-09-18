import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { TransactionType } from "@/lib/types";

// GET /api/templates — list templates with category + account
export async function GET() {
  try {
    const templates = await db.transactionTemplate.findMany({
      include: { category: true, account: true },
      orderBy: [{ createdAt: "desc" }],
    });
    return NextResponse.json(templates);
  } catch (err) {
    console.error("[GET /api/templates]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar template transaksi." },
      { status: 500 }
    );
  }
}

// POST /api/templates — create template
// Body: { name, type, amount, description, categoryId, accountId?, merchant?, paymentMethod?, priority?, icon? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      type,
      amount,
      description,
      categoryId,
      accountId,
      merchant,
      paymentMethod,
      priority,
      icon,
    } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama template wajib diisi." },
        { status: 400 }
      );
    }
    if (!type || (type !== "INCOME" && type !== "EXPENSE")) {
      return NextResponse.json(
        { error: "Tipe transaksi tidak valid." },
        { status: 400 }
      );
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka tidak negatif." },
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

    const template = await db.transactionTemplate.create({
      data: {
        name: name.trim(),
        type: type as TransactionType,
        amount: amt,
        description: description.trim(),
        categoryId,
        accountId: accountId || null,
        merchant: merchant?.trim() || null,
        paymentMethod: paymentMethod || null,
        priority: priority || null,
        icon: icon || "Zap",
      },
      include: { category: true, account: true },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    console.error("[POST /api/templates]", err);
    return NextResponse.json(
      { error: "Gagal menambah template transaksi." },
      { status: 500 }
    );
  }
}
