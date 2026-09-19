import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import { isShareExpired } from "@/lib/share-helpers";
import type { CategoryBreakdown } from "@/lib/types";

// GET /api/shares/[token]/data — fetch shared transactions.
// Applies scope filter (parsed from scopeData JSON).
// Respects hiddenAmounts (amount → null) and maskedDesc (mask description).
// Returns { transactions, summary, categoryBreakdown }.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const link = await db.shareLink.findUnique({
      where: { token },
    });

    if (!link || !link.active) {
      return NextResponse.json(
        { error: "Link tidak ditemukan atau tidak aktif" },
        { status: 404 }
      );
    }

    // If link expired, refuse data. Helper expects ISO strings; Prisma
    // returns Date objects, so we adapt the shape here.
    const expiry = isShareExpired({
      expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
      hoursActive: link.hoursActive,
      createdAt: link.createdAt.toISOString(),
      maxViews: link.maxViews,
      viewCount: link.viewCount,
      oneTime: link.oneTime,
    });
    if (expiry.expired) {
      return NextResponse.json({
        expired: true,
        reason: expiry.reason ?? "Link sudah kadaluarsa.",
        transactions: [],
        summary: {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          count: 0,
        },
        categoryBreakdown: [],
      });
    }

    // Parse scopeData
    let scope: Record<string, unknown> = {};
    if (link.scopeData) {
      try {
        scope = JSON.parse(link.scopeData);
      } catch {
        scope = {};
      }
    }

    // Build Prisma where filter based on scopeType
    const where: Record<string, unknown> = { status: { not: "DRAFT" } };

    switch (link.scopeType) {
      case "ALL":
        // No additional filter
        break;
      case "ACCOUNT": {
        const accountId =
          (scope.accountId as string | undefined) ??
          (scope.accountIds as string[] | undefined)?.[0];
        if (accountId) where.accountId = accountId;
        break;
      }
      case "CATEGORY": {
        const categoryId =
          (scope.categoryId as string | undefined) ??
          (scope.categoryIds as string[] | undefined)?.[0];
        if (categoryId) where.categoryId = categoryId;
        break;
      }
      case "GROUP": {
        const groupId =
          (scope.groupId as string | undefined) ??
          (scope.groupIds as string[] | undefined)?.[0];
        if (groupId) where.groupId = groupId;
        break;
      }
      case "TAG": {
        const tag = scope.tag as string | undefined;
        const tags = scope.tags as string[] | undefined;
        if (tag) {
          where.tags = { contains: tag };
        } else if (Array.isArray(tags) && tags.length > 0) {
          where.OR = tags.map((t) => ({ tags: { contains: t } }));
        }
        break;
      }
      case "DATE_RANGE": {
        const dateFilter: Record<string, Date> = {};
        const from = scope.from as string | undefined;
        const to = scope.to as string | undefined;
        if (from) dateFilter.gte = parseDateLocal(from);
        if (to) {
          const t = parseDateLocal(to);
          t.setHours(23, 59, 59, 999);
          dateFilter.lte = t;
        }
        if (dateFilter.gte || dateFilter.lte) where.date = dateFilter;
        break;
      }
      case "CUSTOM": {
        const txIds = scope.txIds as string[] | undefined;
        if (Array.isArray(txIds) && txIds.length > 0) {
          where.id = { in: txIds };
        } else {
          // Empty custom selection — no transactions
          where.id = { in: [] };
        }
        break;
      }
      default:
        // Treat unknown as ALL
        break;
    }

    const txs = await db.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
      },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    // Apply privacy masks
    const sanitizedTxs = txs.map((t) => {
      const maskedDescription =
        link.maskedDesc && t.description
          ? t.description.length > 10
            ? `${t.description.slice(0, 10)}...`
            : `${t.description}...`
          : t.description;

      return {
        ...t,
        amount: link.hiddenAmounts ? null : t.amount,
        originalAmount: link.hiddenAmounts ? null : t.originalAmount,
        cashbackAmount: link.hiddenAmounts ? null : t.cashbackAmount,
        originalPrice: link.hiddenAmounts ? null : t.originalPrice,
        discountAmount: link.hiddenAmounts ? null : t.discountAmount,
        description: maskedDescription,
        note: link.maskedDesc && t.note ? "***" : t.note,
      };
    });

    // Compute summary (always uses real amounts; only display is masked)
    const totalIncome = txs
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = txs
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;

    // Compute category breakdown (use real amounts)
    const catMap = new Map<
      string,
      { total: number; count: number; category: NonNullable<(typeof txs)[number]["category"]> }
    >();
    for (const t of txs) {
      if (!t.category) continue;
      const existing = catMap.get(t.categoryId);
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        catMap.set(t.categoryId, {
          total: t.amount,
          count: 1,
          category: t.category,
        });
      }
    }
    const grandTotal = Array.from(catMap.values()).reduce(
      (s, v) => s + v.total,
      0
    );
    const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.values())
      .map((v) => ({
        category: v.category as unknown as CategoryBreakdown["category"],
        total: link.hiddenAmounts ? 0 : v.total,
        count: v.count,
        percentage:
          grandTotal > 0 ? (v.total / grandTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      transactions: sanitizedTxs,
      summary: {
        totalIncome: link.hiddenAmounts ? 0 : totalIncome,
        totalExpense: link.hiddenAmounts ? 0 : totalExpense,
        balance: link.hiddenAmounts ? 0 : balance,
        count: txs.length,
      },
      categoryBreakdown,
      expired: false,
    });
  } catch (err) {
    console.error("[GET /api/shares/[token]/data]", err);
    return NextResponse.json(
      { error: "Gagal memuat data share link." },
      { status: 500 }
    );
  }
}
