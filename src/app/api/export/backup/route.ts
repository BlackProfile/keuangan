import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/export/backup
// Return a JSON backup of ALL data.
export async function GET() {
  try {
    const [
      categories,
      accounts,
      transactions,
      budgets,
      goals,
      recurring,
      tags,
      settings,
    ] = await Promise.all([
      db.category.findMany(),
      db.account.findMany(),
      db.transaction.findMany({ include: { category: true, account: true } }),
      db.budget.findMany(),
      db.goal.findMany(),
      db.recurringTransaction.findMany(),
      db.tag.findMany(),
      db.setting.findMany(),
    ]);

    const backup = {
      categories,
      accounts,
      transactions,
      budgets,
      goals,
      recurring,
      tags,
      settings,
      exportedAt: new Date().toISOString(),
    };

    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const filename = `dompetku-backup-${dateStr}.json`;

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/export/backup]", err);
    return NextResponse.json(
      { error: "Gagal membuat backup data." },
      { status: 500 }
    );
  }
}
