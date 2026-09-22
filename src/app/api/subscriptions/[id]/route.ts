import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// PUT /api/subscriptions/[id] — update subscription
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      amount,
      billingCycle,
      nextBilling,
      category,
      icon,
      color,
      note,
      active,
    } = body ?? {};

    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Langganan tidak ditemukan." },
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
    if (billingCycle !== undefined) data.billingCycle = billingCycle;
    if (nextBilling !== undefined) data.nextBilling = parseDateLocal(nextBilling);
    if (category !== undefined) data.category = String(category).trim() || "Hiburan";
    if (icon !== undefined) data.icon = icon;
    if (color !== undefined) data.color = color;
    if (note !== undefined) data.note = note?.trim() || null;
    if (active !== undefined) data.active = Boolean(active);

    const updated = await db.subscription.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/subscriptions/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui langganan." },
      { status: 500 }
    );
  }
}

// DELETE /api/subscriptions/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Langganan tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.subscription.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/subscriptions/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus langganan." },
      { status: 500 }
    );
  }
}
