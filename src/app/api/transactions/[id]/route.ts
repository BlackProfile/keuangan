import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// PUT /api/transactions/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      type,
      amount,
      description,
      date,
      categoryId,
      accountId,
      note,
      tags,
      merchant,
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
    if (!date) {
      return NextResponse.json(
        { error: "Tanggal wajib diisi." },
        { status: 400 }
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Kategori wajib dipilih." },
        { status: 400 }
      );
    }

    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }
    if (category.type !== type) {
      return NextResponse.json(
        {
          error: `Kategori "${category.name}" tidak cocok untuk tipe transaksi ${type}.`,
        },
        { status: 400 }
      );
    }

    // Revert old account balance
    if (existing.accountId) {
      const oldDelta =
        existing.type === "INCOME" ? -existing.amount : existing.amount;
      await db.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: oldDelta } },
      });
    }

    const updated = await db.transaction.update({
      where: { id },
      data: {
        type,
        amount: amt,
        description: description.trim(),
        date: parseDateLocal(date),
        categoryId,
        accountId: accountId || null,
        note: note?.trim() || null,
        tags: tags?.trim() || null,
        merchant: merchant?.trim() || null,
      },
      include: { category: true, account: true },
    });

    // Apply new account balance
    if (accountId) {
      const delta = type === "INCOME" ? amt : -amt;
      await db.account.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/transactions/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui transaksi." },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi tidak ditemukan." },
        { status: 404 }
      );
    }
    // Revert account balance
    if (existing.accountId) {
      const delta =
        existing.type === "INCOME" ? -existing.amount : existing.amount;
      await db.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: delta } },
      });
    }
    await db.transaction.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/transactions/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi." },
      { status: 500 }
    );
  }
}
