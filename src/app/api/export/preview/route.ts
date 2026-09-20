import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildWhereClause,
  resolveFields,
  estimateSize,
} from "@/lib/export-helpers";
import { parseDateLocal, formatDateInput } from "@/lib/format";
import type { ExportScope } from "@/lib/types";

// POST /api/export/preview
// Body: { scope, fields?, options? }
// Returns a preview of the export: summary, category breakdown, top merchants,
// limited transaction list, resolved fields, and estimated file size.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { scope, fields, options } = body as {
      scope?: ExportScope | string;
      fields?: string[] | null;
      options?: Record<string, unknown> | null;
    };

    // Merge options.includeHidden into scope for the where-clause builder.
    // `scope` may arrive as a JSON string or as an object.
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

    // `options.includeHidden` overrides scope.includeHidden when present.
    if (options && typeof options.includeHidden === "boolean") {
      parsedScope.includeHidden = options.includeHidden;
    }

    const where = buildWhereClause(parsedScope);

    const transactions = await db.transaction.findMany({
      where,
      include: { category: true, account: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    // --- Summary ---
    let totalIncome = 0;
    let totalExpense = 0;
    for (const t of transactions) {
      if (t.type === "INCOME") totalIncome += t.amount;
      else totalExpense += t.amount;
    }
    const balance = totalIncome - totalExpense;

    // Date range from transactions (or scope if explicitly provided)
    let from: string | null = parsedScope.from ?? null;
    let to: string | null = parsedScope.to ?? null;
    if (transactions.length > 0) {
      const dates = transactions.map((t) => parseDateLocal(t.date));
      const minDate = dates.reduce((a, b) => (a < b ? a : b));
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));
      if (!from) from = formatDateInput(minDate);
      if (!to) to = formatDateInput(maxDate);
    }

    const summary = {
      totalIncome,
      totalExpense,
      balance,
      transactionCount: transactions.length,
      dateRange: { from, to },
    };

    // --- Category breakdown (expenses only) ---
    const catMap = new Map<
      string,
      { category: string; total: number; count: number }
    >();
    let expenseTotal = 0;
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      expenseTotal += t.amount;
      const name = t.category?.name ?? "Tanpa Kategori";
      const entry = catMap.get(name);
      if (entry) {
        entry.total += t.amount;
        entry.count += 1;
      } else {
        catMap.set(name, { category: name, total: t.amount, count: 1 });
      }
    }
    const categoryBreakdown = Array.from(catMap.values())
      .map((v) => ({
        category: v.category,
        total: v.total,
        count: v.count,
        percentage: expenseTotal > 0 ? (v.total / expenseTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // --- Top merchants (expenses only) ---
    const merchantMap = new Map<
      string,
      { total: number; count: number }
    >();
    for (const t of transactions) {
      if (t.type !== "EXPENSE") continue;
      if (!t.merchant || !t.merchant.trim()) continue;
      const key = t.merchant.trim();
      const entry = merchantMap.get(key);
      if (entry) {
        entry.total += t.amount;
        entry.count += 1;
      } else {
        merchantMap.set(key, { total: t.amount, count: 1 });
      }
    }
    const topMerchants = Array.from(merchantMap.entries())
      .map(([merchant, v]) => ({ merchant, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const resolvedFields = resolveFields(fields);

    // Limit transactions in preview (full list stays in summary.count)
    const previewTransactions = transactions.slice(0, 50);

    return NextResponse.json({
      summary,
      categoryBreakdown,
      topMerchants,
      transactions: previewTransactions,
      fields: resolvedFields,
      estimatedSize: estimateSize(transactions.length),
    });
  } catch (err) {
    console.error("[POST /api/export/preview]", err);
    return NextResponse.json(
      { error: "Gagal membuat pratinjau ekspor." },
      { status: 500 }
    );
  }
}
