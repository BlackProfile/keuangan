import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/goals
export async function GET() {
  try {
    const goals = await db.goal.findMany({
      orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(goals);
  } catch (err) {
    console.error("[GET /api/goals]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar target." },
      { status: 500 }
    );
  }
}

// POST /api/goals
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      targetAmount,
      currentAmount,
      targetDate,
      icon,
      color,
      note,
    } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama target wajib diisi." },
        { status: 400 }
      );
    }
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      return NextResponse.json(
        { error: "Target jumlah harus berupa angka positif." },
        { status: 400 }
      );
    }

    const current =
      currentAmount !== undefined && currentAmount !== null
        ? Number(currentAmount)
        : 0;
    if (!Number.isFinite(current) || current < 0) {
      return NextResponse.json(
        { error: "Saldo saat ini tidak valid." },
        { status: 400 }
      );
    }

    const completed = current >= target;

    const goal = await db.goal.create({
      data: {
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate: targetDate ? parseDateLocal(targetDate) : null,
        icon: icon || "Target",
        color: color || "#10b981",
        note: note?.trim() || null,
        completed,
      },
    });

    return NextResponse.json(goal, { status: 201 });
  } catch (err) {
    console.error("[POST /api/goals]", err);
    return NextResponse.json(
      { error: "Gagal menambah target." },
      { status: 500 }
    );
  }
}
