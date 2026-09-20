import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/transactions?type=...&categoryId=...&accountId=...&search=...&from=...&to=...&tag=...&limit=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const accountId = searchParams.get("accountId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const includeHidden = searchParams.get("includeHidden") === "true";
    const showHiddenOnly = searchParams.get("showHiddenOnly") === "true";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 500) : undefined;

    const where: Record<string, unknown> = {};
    // By default, hide hidden transactions unless explicitly requested
    if (showHiddenOnly) {
      where.isHidden = true;
    } else if (!includeHidden) {
      where.isHidden = false;
    }
    if (type && type !== "ALL") where.type = type;
    if (categoryId && categoryId !== "ALL") where.categoryId = categoryId;
    if (accountId && accountId !== "ALL") where.accountId = accountId;
    if (tag) where.tags = { contains: tag };
    if (search && search.trim()) {
      where.OR = [
        { description: { contains: search.trim() } },
        { note: { contains: search.trim() } },
        { merchant: { contains: search.trim() } },
      ];
    }
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = parseDateLocal(from);
      if (to) {
        const t = parseDateLocal(to);
        t.setHours(23, 59, 59, 999);
        dateFilter.lte = t;
      }
      where.date = dateFilter;
    }

    const transactions = await db.transaction.findMany({
      where,
      include: {
        category: true,
        account: true,
        splits: { include: { category: true } },
        receiptItems: true,
        group: true,
      },
      orderBy: [{ isPinned: "desc" }, { date: "desc" }, { createdAt: "desc" }],
      ...(limit ? { take: limit } : {}),
    });

    return NextResponse.json(transactions);
  } catch (err) {
    console.error("[GET /api/transactions]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar transaksi." },
      { status: 500 }
    );
  }
}

// POST /api/transactions
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type,
      amount,
      description,
      date,
      categoryId,
      accountId,
      note,
      tags,
      merchant,
    } = body ?? {};

    if (!type || (type !== "INCOME" && type !== "EXPENSE")) {
      return NextResponse.json(
        { error: "Tipe transaksi tidak valid." },
        { status: 400 }
      );
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah harus berupa angka positif." },
        { status: 400 }
      );
    }
    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: "Keterangan wajib diisi." },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { error: "Tanggal wajib diisi." },
        { status: 400 }
      );
    }
    if (!categoryId) {
      return NextResponse.json(
        { error: "Kategori wajib dipilih." },
        { status: 400 }
      );
    }

    const category = await db.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }
    if (category.type !== type) {
      return NextResponse.json(
        {
          error: `Kategori "${category.name}" tidak cocok untuk tipe transaksi ${type}.`,
        },
        { status: 400 }
      );
    }

    const parsedDate = parseDateLocal(date);

    const transaction = await db.transaction.create({
      data: {
        type,
        amount: amt,
        description: description.trim(),
        date: parsedDate,
        categoryId,
        accountId: accountId || null,
        note: note?.trim() || null,
        tags: tags?.trim() || null,
        merchant: merchant?.trim() || null,
        time: body.time || null,
        photoUrl: body.photoUrl || null,
        mood: body.mood || null,
        priority: body.priority || null,
        paymentStatus: body.paymentStatus || "PAID",
        paymentMethod: body.paymentMethod || null,
        recipient: body.recipient || null,
        currency: body.currency || "IDR",
        originalAmount: body.originalAmount || null,
        exchangeRate: body.exchangeRate || null,
        parentTransactionId: body.parentTransactionId || null,
        groupId: body.groupId || null,
        installmentId: body.installmentId || null,
        isSplit: !!body.isSplit,
        isDebt: !!body.isDebt,
        isReimbursable: !!body.isReimbursable,
        reimbursed: !!body.reimbursed,
        isSubscription: !!body.isSubscription,
        isTaxDeductible: !!body.isTaxDeductible,
        isBusinessExpense: !!body.isBusinessExpense,
        excludeFromBudget: !!body.excludeFromBudget,
        excludeFromStats: !!body.excludeFromStats,
        isPinned: !!body.isPinned,
        isHidden: !!body.isHidden,
        cashbackAmount: body.cashbackAmount || null,
        originalPrice: body.originalPrice || null,
        discountAmount: body.discountAmount || null,
        debtDueDate: body.debtDueDate ? parseDateLocal(body.debtDueDate) : null,
        creditor: body.creditor || null,
        goalId: body.goalId || null,
        assignedTo: body.assignedTo || null,
        status: body.status || "CONFIRMED",
        linkUrl: body.linkUrl || null,
      },
      include: { category: true, account: true, splits: true, receiptItems: true, group: true },
    });

    // Create splits if provided
    if (Array.isArray(body.splits) && body.splits.length > 0) {
      await db.transactionSplit.createMany({
        data: body.splits.map((s: { amount: number; categoryId: string; note?: string }) => ({
          parentTransactionId: transaction.id,
          amount: s.amount,
          categoryId: s.categoryId,
          note: s.note || null,
        })),
      });
    }

    // Create receipt items if provided
    if (Array.isArray(body.receiptItems) && body.receiptItems.length > 0) {
      await db.receiptItem.createMany({
        data: body.receiptItems.map((it: { name: string; qty: number; price: number; total: number }) => ({
          transactionId: transaction.id,
          name: it.name,
          qty: it.qty,
          price: it.price,
          total: it.total,
        })),
      });
    }

    // Update account balance
    if (accountId) {
      const delta = type === "INCOME" ? amt : -amt;
      await db.account.update({
        where: { id: accountId },
        data: { balance: { increment: delta } },
      });
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (err) {
    console.error("[POST /api/transactions]", err);
    return NextResponse.json(
      { error: "Gagal menambah transaksi." },
      { status: 500 }
    );
  }
}
