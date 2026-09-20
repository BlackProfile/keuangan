import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/friend-debts/[id]/settle — mark friend debt as settled
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.friendDebt.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Hutang/piutang tidak ditemukan." },
        { status: 404 }
      );
    }

    const updated = await db.friendDebt.update({
      where: { id },
      data: { settled: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[POST /api/friend-debts/[id]/settle]", err);
    return NextResponse.json(
      { error: "Gagal menyelesaikan hutang/piutang teman." },
      { status: 500 }
    );
  }
}
