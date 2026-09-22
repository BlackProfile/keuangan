import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/bills/reset — reset all bills paidThisMonth=false (new month)
export async function POST() {
  try {
    const result = await db.bill.updateMany({
      where: { paidThisMonth: true },
      data: { paidThisMonth: false, paidAt: null },
    });

    return NextResponse.json({ reset: result.count });
  } catch (err) {
    console.error("[POST /api/bills/reset]", err);
    return NextResponse.json(
      { error: "Gagal mereset status tagihan." },
      { status: 500 }
    );
  }
}
