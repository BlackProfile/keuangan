import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AccountType } from "@/lib/types";

const VALID_ACCOUNT_TYPES: AccountType[] = ["CASH", "BANK", "EWALLET", "INVESTMENT"];

// PUT /api/accounts/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, type, icon, color, balance, note, isDefault } = body ?? {};

    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    if (type && !VALID_ACCOUNT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Tipe akun tidak valid." },
        { status: 400 }
      );
    }

    // If marking as default, unset others first
    if (isDefault && !existing.isDefault) {
      await db.account.updateMany({
        where: { isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    if (note !== undefined) data.note = note?.trim() || null;
    if (isDefault !== undefined) data.isDefault = Boolean(isDefault);
    if (balance !== undefined && balance !== null) {
      const amt = Number(balance);
      if (!Number.isFinite(amt)) {
        return NextResponse.json(
          { error: "Saldo tidak valid." },
          { status: 400 }
        );
      }
      data.balance = amt;
    }

    const updated = await db.account.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/accounts/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui akun." },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.account.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Akun tidak ditemukan." },
        { status: 404 }
      );
    }

    if (existing.isDefault) {
      return NextResponse.json(
        { error: "Akun default tidak dapat dihapus." },
        { status: 400 }
      );
    }

    const transactionsCount = await db.transaction.count({
      where: { accountId: id },
    });

    if (transactionsCount > 0) {
      return NextResponse.json(
        {
          error: `Tidak dapat menghapus akun karena masih terkait dengan ${transactionsCount} transaksi. Hapus atau ubah transaksi terkait terlebih dahulu.`,
          transactionCount: transactionsCount,
        },
        { status: 409 }
      );
    }

    await db.account.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/accounts/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus akun." },
      { status: 500 }
    );
  }
}
