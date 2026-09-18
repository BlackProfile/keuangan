import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/installments — list with transactions
export async function GET() {
  try {
    const installments = await db.installment.findMany({
      include: { transactions: true },
      orderBy: [{ active: "desc" }, { startDate: "desc" }],
    });
    return NextResponse.json(installments);
  } catch (err) {
    console.error("[GET /api/installments]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar cicilan." },
      { status: 500 }
    );
  }
}

// POST /api/installments — create new installment plan
// Body: { description, totalAmount, totalInstallments, monthlyAmount, startDate, categoryId, accountId?, merchant? }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      description,
      totalAmount,
      totalInstallments,
      monthlyAmount,
      startDate,
      categoryId,
      accountId,
      merchant,
    } = body ?? {};

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Keterangan wajib diisi." },
        { status: 400 }
      );
    }
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        { error: "Total jumlah harus berupa angka positif." },
        { status: 400 }
      );
    }
    const totalInst = Number(totalInstallments);
    if (
      !Number.isFinite(totalInst) ||
      !Number.isInteger(totalInst) ||
      totalInst <= 0
    ) {
      return NextResponse.json(
        { error: "Jumlah cicilan harus berupa bilangan bulat positif." },
        { status: 400 }
      );
    }
    const monthly = Number(monthlyAmount);
    if (!Number.isFinite(monthly) || monthly <= 0) {
      return NextResponse.json(
        { error: "Angsuran bulanan harus berupa angka positif." },
        { status: 400 }
      );
    }
    if (!startDate) {
      return NextResponse.json(
        { error: "Tanggal mulai wajib diisi." },
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

    if (accountId) {
      const account = await db.account.findUnique({ where: { id: accountId } });
      if (!account) {
        return NextResponse.json(
          { error: "Akun tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    const installment = await db.installment.create({
      data: {
        description: description.trim(),
        totalAmount: total,
        totalInstallments: Math.floor(totalInst),
        monthlyAmount: monthly,
        startDate: parseDateLocal(startDate),
        categoryId,
        accountId: accountId || null,
        merchant: merchant?.trim() || null,
        active: true,
      },
      include: { transactions: true },
    });

    return NextResponse.json(installment, { status: 201 });
  } catch (err) {
    console.error("[POST /api/installments]", err);
    return NextResponse.json(
      { error: "Gagal menambah cicilan." },
      { status: 500 }
    );
  }
}
