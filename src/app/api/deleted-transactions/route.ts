import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/deleted-transactions — list soft-deleted transactions
export async function GET() {
  try {
    const items = await db.deletedTransaction.findMany({
      orderBy: { deletedAt: "desc" },
    });
    // DeletedTransaction has no FK relations defined in the Prisma schema,
    // so we hydrate the category/account lookups manually.
    const categoryIds = Array.from(
      new Set(items.map((t) => t.categoryId).filter(Boolean) as string[])
    );
    const accountIds = Array.from(
      new Set(items.map((t) => t.accountId).filter(Boolean) as string[])
    );
    // Always call findMany (Prisma handles `in: []` gracefully) so the
    // tuple retains its concrete type for the Map constructor below.
    const [categories, accounts] = await Promise.all([
      db.category.findMany(categoryIds.length
        ? { where: { id: { in: categoryIds } } }
        : { where: { id: { in: ["__none__"] } } }),
      db.account.findMany(accountIds.length
        ? { where: { id: { in: accountIds } } }
        : { where: { id: { in: ["__none__"] } } }),
    ]);
    const catMap = new Map<string, (typeof categories)[number]>(
      categories.map((c) => [c.id, c])
    );
    const accMap = new Map<string, (typeof accounts)[number]>(
      accounts.map((a) => [a.id, a])
    );
    const serialized = items.map((t) => ({
      ...t,
      date: t.date.toISOString(),
      deletedAt: t.deletedAt.toISOString(),
      expiresAt: t.expiresAt.toISOString(),
      category: catMap.get(t.categoryId) ?? null,
      account: t.accountId ? accMap.get(t.accountId) ?? null : null,
    }));
    return NextResponse.json(serialized);
  } catch (err) {
    console.error("[GET /api/deleted-transactions]", err);
    return NextResponse.json(
      { error: "Gagal memuat tempat sampah." },
      { status: 500 }
    );
  }
}

// DELETE /api/deleted-transactions?expiredOnly=1 — empty trash
// expiredOnly=1 → only delete items past their expiresAt
// expiredOnly=0 → purge ALL items
export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const expiredOnly = url.searchParams.get("expiredOnly") !== "0";
    const now = new Date();
    const where = expiredOnly ? { expiresAt: { lt: now } } : {};
    const result = await db.deletedTransaction.deleteMany({ where });
    return NextResponse.json({ purged: result.count });
  } catch (err) {
    console.error("[DELETE /api/deleted-transactions]", err);
    return NextResponse.json(
      { error: "Gagal mengosongkan tempat sampah." },
      { status: 500 }
    );
  }
}
