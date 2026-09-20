import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildWhereClause } from "@/lib/export-helpers";
import type { ExportScope } from "@/lib/types";

// POST /api/export/json
// Body: { scope, fields?, options? }
// Returns a JSON backup of all entities (transactions filtered by scope,
// plus accounts, categories, budgets, goals, debts, recurring, templates,
// settings). Returned with attachment Content-Disposition so browsers download
// it as a .json file.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { scope, options } = body as {
      scope?: ExportScope | string;
      fields?: string[] | null;
      options?: { includeHidden?: boolean } | null;
    };

    let parsedScope: ExportScope;
    if (typeof scope === "string") {
      try {
        parsedScope = JSON.parse(scope) as ExportScope;
      } catch {
        parsedScope = { type: "ALL" };
      }
    } else if (scope && typeof scope === "object") {
      parsedScope = { ...scope };
    } else {
      parsedScope = { type: "ALL" };
    }
    if (options && typeof options.includeHidden === "boolean") {
      parsedScope.includeHidden = options.includeHidden;
    }

    const where = buildWhereClause(parsedScope);

    const [
      transactions,
      accounts,
      categories,
      budgets,
      goals,
      debts,
      recurring,
      transactionTemplates,
      templates,
      settings,
      tags,
      groups,
      installments,
      transfers,
    ] = await Promise.all([
      db.transaction.findMany({
        where,
        include: {
          category: true,
          account: true,
          splits: true,
          receiptItems: true,
          group: true,
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
      db.account.findMany({ orderBy: [{ createdAt: "asc" }] }),
      db.category.findMany({ orderBy: [{ createdAt: "asc" }] }),
      db.budget.findMany({ include: { category: true } }),
      db.goal.findMany({ orderBy: [{ createdAt: "asc" }] }),
      db.debt.findMany({ orderBy: [{ createdAt: "asc" }] }),
      db.recurringTransaction.findMany({
        include: { category: true, account: true },
        orderBy: [{ nextDate: "asc" }],
      }),
      db.transactionTemplate.findMany({
        include: { category: true, account: true },
        orderBy: [{ createdAt: "asc" }],
      }),
      db.exportTemplate.findMany({ orderBy: [{ createdAt: "asc" }] }),
      db.setting.findMany(),
      db.tag.findMany(),
      db.transactionGroup.findMany(),
      db.installment.findMany(),
      db.transfer.findMany({ orderBy: [{ date: "asc" }] }),
    ]);

    // Serialize ExportTemplate rows (scope/fields/options are stored as JSON strings)
    const serializedTemplates = templates.map((t) => ({
      ...t,
      scope: t.scope ? safeJsonParse(t.scope) : null,
      fields: t.fields ? safeJsonParseArray(t.fields) : null,
      options: t.options ? safeJsonParse(t.options) : null,
    }));

    const backup = {
      meta: {
        app: "DompetKu",
        version: 1,
        exportedAt: new Date().toISOString(),
        scope: parsedScope,
        transactionCount: transactions.length,
      },
      transactions,
      accounts,
      categories,
      budgets,
      goals,
      debts,
      recurring,
      transactionTemplates,
      templates: serializedTemplates,
      settings,
      tags,
      groups,
      installments,
      transfers,
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
    console.error("[POST /api/export/json]", err);
    return NextResponse.json(
      { error: "Gagal membuat backup JSON." },
      { status: 500 }
    );
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
function safeJsonParseArray(s: string): unknown[] | null {
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
