import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AccountType } from "@/lib/types";

const VALID_ACCOUNT_TYPES: AccountType[] = ["CASH", "BANK", "EWALLET", "INVESTMENT"];

// GET /api/accounts
export async function GET() {
  try {
    const accounts = await db.account.findMany({
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
    return NextResponse.json(accounts);
  } catch (err) {
    console.error("[GET /api/accounts]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar akun." },
      { status: 500 }
    );
  }
}

// POST /api/accounts
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, icon, color, balance, note, isDefault } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama akun wajib diisi." },
        { status: 400 }
      );
    }
    if (!type || !VALID_ACCOUNT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Tipe akun tidak valid." },
        { status: 400 }
      );
    }

    const initialBalance =
      balance !== undefined && balance !== null ? Number(balance) : 0;
    if (!Number.isFinite(initialBalance)) {
      return NextResponse.json(
        { error: "Saldo awal tidak valid." },
        { status: 400 }
      );
    }

    // If this account is set as default, unset others first
    if (isDefault) {
      await db.account.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const account = await db.account.create({
      data: {
        name: name.trim(),
        type,
        icon: icon || "Banknote",
        color: color || "#10b981",
        balance: initialBalance,
        note: note?.trim() || null,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json(account, { status: 201 });
  } catch (err) {
    console.error("[POST /api/accounts]", err);
    return NextResponse.json(
      { error: "Gagal menambah akun." },
      { status: 500 }
    );
  }
}
