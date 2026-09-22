import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auto-rules — list all auto-categorize rules
export async function GET() {
  try {
    const rules = await db.autoRule.findMany({
      orderBy: { createdAt: "desc" },
    });
    // Attach category/account names for display when applicable
    const categoryIds = rules
      .filter((r) => r.action === "categorize" && r.targetId)
      .map((r) => r.targetId as string);
    const accountIds = rules
      .filter((r) => r.action === "account" && r.targetId)
      .map((r) => r.targetId as string);
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
    const result = rules.map((r) => ({
      ...r,
      category:
        r.action === "categorize" && r.targetId
          ? (catMap.get(r.targetId) ?? null)
          : null,
      account:
        r.action === "account" && r.targetId
          ? (accMap.get(r.targetId) ?? null)
          : null,
    }));
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/auto-rules]", err);
    return NextResponse.json(
      { error: "Gagal memuat aturan otomatis." },
      { status: 500 }
    );
  }
}

// POST /api/auto-rules — create a new rule
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { field, operator, value, action, targetId, active } = body ?? {};

    if (
      !field ||
      !["merchant", "description", "note"].includes(field)
    ) {
      return NextResponse.json(
        { error: "Field tidak valid. Pilih: merchant, description, atau note." },
        { status: 400 }
      );
    }
    if (
      !operator ||
      !["contains", "equals", "startsWith"].includes(operator)
    ) {
      return NextResponse.json(
        {
          error:
            "Operator tidak valid. Pilih: contains, equals, atau startsWith.",
        },
        { status: 400 }
      );
    }
    if (!value || typeof value !== "string" || !value.trim()) {
      return NextResponse.json(
        { error: "Nilai pencocokan wajib diisi." },
        { status: 400 }
      );
    }
    if (
      !action ||
      !["categorize", "tag", "account"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Aksi tidak valid. Pilih: categorize, tag, atau account." },
        { status: 400 }
      );
    }
    // For categorize/account, targetId must reference an existing record.
    if (action === "categorize") {
      if (!targetId) {
        return NextResponse.json(
          { error: "Kategori target wajib dipilih." },
          { status: 400 }
        );
      }
      const cat = await db.category.findUnique({ where: { id: targetId } });
      if (!cat) {
        return NextResponse.json(
          { error: "Kategori target tidak ditemukan." },
          { status: 400 }
        );
      }
    }
    if (action === "account") {
      if (!targetId) {
        return NextResponse.json(
          { error: "Akun target wajib dipilih." },
          { status: 400 }
        );
      }
      const acc = await db.account.findUnique({ where: { id: targetId } });
      if (!acc) {
        return NextResponse.json(
          { error: "Akun target tidak ditemukan." },
          { status: 400 }
        );
      }
    }
    // For tag, targetId is the tag name itself (string, may not exist as a row).
    const tagValue = action === "tag" ? (value?.trim() || "") : "";

    const created = await db.autoRule.create({
      data: {
        field,
        operator,
        value: value.trim(),
        action,
        targetId:
          action === "tag"
            ? tagValue || null
            : targetId || null,
        active: active !== false,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auto-rules]", err);
    return NextResponse.json(
      { error: "Gagal membuat aturan otomatis." },
      { status: 500 }
    );
  }
}
