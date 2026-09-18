import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import type { DebtType } from "@/lib/types";

const VALID_DEBT_TYPES: DebtType[] = ["DEBT", "RECEIVABLE"];

// PUT /api/debts/[id] — update debt fields
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { type, person, amount, paidAmount, dueDate, description, note, settled } =
      body ?? {};

    const existing = await db.debt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Utang/piutang tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (type !== undefined) {
      if (!VALID_DEBT_TYPES.includes(type as DebtType)) {
        return NextResponse.json(
          { error: "Tipe utang tidak valid (DEBT atau RECEIVABLE)." },
          { status: 400 }
        );
      }
      data.type = type as DebtType;
    }
    if (person !== undefined) {
      if (!person || !person.trim()) {
        return NextResponse.json(
          { error: "Nama orang tidak boleh kosong." },
          { status: 400 }
        );
      }
      data.person = person.trim();
    }
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
    if (paidAmount !== undefined) {
      const paid = Number(paidAmount);
      if (!Number.isFinite(paid) || paid < 0) {
        return NextResponse.json(
          { error: "Jumlah dibayar tidak valid." },
          { status: 400 }
        );
      }
      data.paidAmount = paid;
    }
    if (dueDate !== undefined) {
      data.dueDate = dueDate ? parseDateLocal(dueDate) : null;
    }
    if (description !== undefined) {
      data.description = description?.trim() || null;
    }
    if (note !== undefined) {
      data.note = note?.trim() || null;
    }

    // Determine final values for auto-settle check
    const finalAmount =
      data.amount !== undefined ? Number(data.amount) : existing.amount;
    const finalPaid =
      data.paidAmount !== undefined
        ? Number(data.paidAmount)
        : existing.paidAmount;

    // Auto-settle flag if paidAmount >= amount, unless explicit override provided
    if (settled !== undefined) {
      data.settled = Boolean(settled);
    } else {
      data.settled = finalPaid >= finalAmount;
    }

    const updated = await db.debt.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/debts/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui utang/piutang." },
      { status: 500 }
    );
  }
}

// DELETE /api/debts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.debt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Utang/piutang tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.debt.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/debts/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus utang/piutang." },
      { status: 500 }
    );
  }
}
