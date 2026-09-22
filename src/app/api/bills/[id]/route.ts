import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PUT /api/bills/[id] — update bill
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, amount, dueDay, category, accountId, recurring, note, paidThisMonth, paidAt } =
      body ?? {};

    const existing = await db.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = String(name).trim();
    if (amount !== undefined) {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json(
          { error: "Jumlah harus berupa angka positif." },
          { status: 400 }
        );
      }
      data.amount = amt;
    }
    if (dueDay !== undefined) {
      const day = Number(dueDay);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return NextResponse.json(
          { error: "Tanggal jatuh tempo harus antara 1-31." },
          { status: 400 }
        );
      }
      data.dueDay = day;
    }
    if (category !== undefined) data.category = String(category).trim() || "Tagihan";
    if (accountId !== undefined) data.accountId = accountId || null;
    if (recurring !== undefined) data.recurring = Boolean(recurring);
    if (note !== undefined) data.note = note?.trim() || null;
    if (paidThisMonth !== undefined) data.paidThisMonth = Boolean(paidThisMonth);
    if (paidAt !== undefined) data.paidAt = paidAt ? new Date(paidAt) : null;

    const updated = await db.bill.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/bills/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui tagihan." },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.bill.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Tagihan tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.bill.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/bills/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus tagihan." },
      { status: 500 }
    );
  }
}
