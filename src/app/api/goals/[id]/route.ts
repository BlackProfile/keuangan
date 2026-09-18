import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// PUT /api/goals/[id]
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      targetAmount,
      currentAmount,
      targetDate,
      icon,
      color,
      note,
      completed,
    } = body ?? {};

    const existing = await db.goal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Target tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) data.name = name.trim();
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    if (note !== undefined) data.note = note?.trim() || null;
    if (targetDate !== undefined) {
      data.targetDate = targetDate ? parseDateLocal(targetDate) : null;
    }

    if (targetAmount !== undefined && targetAmount !== null) {
      const target = Number(targetAmount);
      if (!Number.isFinite(target) || target <= 0) {
        return NextResponse.json(
          { error: "Target jumlah harus berupa angka positif." },
          { status: 400 }
        );
      }
      data.targetAmount = target;
    }

    if (currentAmount !== undefined && currentAmount !== null) {
      const current = Number(currentAmount);
      if (!Number.isFinite(current) || current < 0) {
        return NextResponse.json(
          { error: "Saldo saat ini tidak valid." },
          { status: 400 }
        );
      }
      data.currentAmount = current;
    }

    // Determine final values for completion check
    const finalTarget =
      data.targetAmount !== undefined ? Number(data.targetAmount) : existing.targetAmount;
    const finalCurrent =
      data.currentAmount !== undefined ? Number(data.currentAmount) : existing.currentAmount;

    // Auto-set completed when currentAmount >= targetAmount
    if (finalCurrent >= finalTarget) {
      data.completed = true;
    } else if (completed !== undefined) {
      data.completed = Boolean(completed);
    } else {
      data.completed = false;
    }

    const updated = await db.goal.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/goals/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui target." },
      { status: 500 }
    );
  }
}

// DELETE /api/goals/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.goal.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Target tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.goal.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/goals/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus target." },
      { status: 500 }
    );
  }
}
