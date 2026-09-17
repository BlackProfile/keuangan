import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { formatCurrency, formatDateInput, parseDateLocal } from "@/lib/format";
import type { ChatMessage } from "@/lib/types";

// POST /api/ai/chat
// Body: { messages: Array<{ role: 'user' | 'assistant', content: string }> }
export async function POST(req: Request) {
  // Fallback reply if AI is unavailable
  const FALLBACK_REPLY =
    "Maaf, saya tidak bisa memproses permintaan saat ini. Silakan coba lagi nanti.";

  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages)
      ? body.messages
      : [];

    // Validate & sanitize messages
    const cleanMessages: ChatMessage[] = messages
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-20) // keep last 20 turns for context window safety
      .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));

    if (cleanMessages.length === 0) {
      return NextResponse.json(
        { reply: "Halo! Ada yang bisa saya bantu soal keuangan Anda hari ini?" },
        { status: 200 }
      );
    }

    // Build context from DB
    const context = await buildChatContext();

    const systemPrompt =
      "Kamu adalah asisten keuangan pribadi DompetKu. " +
      "Bantu pengguna menganalisis keuangan mereka berdasarkan data berikut. " +
      "Jawab dengan singkat, jelas, dan ramah dalam Bahasa Indonesia. " +
      "Data keuangan pengguna: " +
      context;

    try {
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          ...cleanMessages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ],
        thinking: { type: "disabled" },
      });

      const reply =
        response?.choices?.[0]?.message?.content?.trim() || FALLBACK_REPLY;

      return NextResponse.json({ reply }, { status: 200 });
    } catch (aiErr) {
      console.error("[POST /api/ai/chat] AI error:", aiErr);
      return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 200 });
    }
  } catch (err) {
    console.error("[POST /api/ai/chat]", err);
    return NextResponse.json({ reply: FALLBACK_REPLY }, { status: 200 });
  }
}

/**
 * Build a compact Indonesian financial context string from the database
 * for the current month: summary, top 3 expense categories, recent 5
 * transactions, and budget statuses.
 */
async function buildChatContext(): Promise<string> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  try {
    // Run the transaction/summary queries (these always exist on the schema).
    const [monthTransactions, recentTransactions, monthExpenseTxWithCat] =
      await Promise.all([
        db.transaction.findMany({
          where: { date: { gte: monthStart, lte: monthEnd } },
          select: { type: true, amount: true },
        }),
        db.transaction.findMany({
          include: { category: true },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 5,
        }),
        db.transaction.findMany({
          where: {
            date: { gte: monthStart, lte: monthEnd },
            type: "EXPENSE",
          },
          include: { category: true },
        }),
      ]);

    // Budget query runs separately so a schema/client mismatch doesn't break
    // the rest of the context.
    let budgets: Array<{
      categoryId: string;
      amount: number;
      category: { name: string } | null;
    }> = [];
    try {
      budgets = await db.budget.findMany({
        select: {
          categoryId: true,
          amount: true,
          category: { select: { name: true } },
        },
      });
    } catch (budgetErr) {
      console.warn("[buildChatContext] budget query skipped:", budgetErr);
    }

    // Summary
    const totalIncome = monthTransactions
      .filter((t) => t.type === "INCOME")
      .reduce((s, t) => s + t.amount, 0);
    const totalExpense = monthTransactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const txCount = monthTransactions.length;

    // Top 3 expense categories this month
    const catMap = new Map<
      string,
      { name: string; total: number; count: number }
    >();
    for (const t of monthExpenseTxWithCat) {
      const name = t.category?.name ?? "Tanpa Kategori";
      const existing = catMap.get(name);
      if (existing) {
        existing.total += t.amount;
        existing.count += 1;
      } else {
        catMap.set(name, { name, total: t.amount, count: 1 });
      }
    }
    const topCategories = Array.from(catMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    // Budget statuses
    const budgetStatuses = budgets.map((b) => {
      const spent = monthExpenseTxWithCat
        .filter((t) => t.categoryId === b.categoryId)
        .reduce((s, t) => s + t.amount, 0);
      const remaining = b.amount - spent;
      const percentage = b.amount > 0 ? (spent / b.amount) * 100 : 0;
      const status =
        percentage >= 100
          ? "over"
          : percentage >= 90
            ? "danger"
            : percentage >= 70
              ? "warning"
              : "safe";
      return {
        category: b.category?.name ?? "Tanpa Kategori",
        budget: b.amount,
        spent,
        remaining,
        percentage: Math.round(percentage),
        status,
      };
    });

    const monthLabel = `${now.getMonth() + 1}/${now.getFullYear()}`;

    const parts: string[] = [];
    parts.push(`Bulan ini (${monthLabel}):`);
    parts.push(
      `- Total pemasukan: ${formatCurrency(totalIncome)}`
    );
    parts.push(`- Total pengeluaran: ${formatCurrency(totalExpense)}`);
    parts.push(`- Saldo: ${formatCurrency(balance)}`);
    parts.push(`- Jumlah transaksi: ${txCount}`);

    if (topCategories.length > 0) {
      parts.push("- Top 3 kategori pengeluaran:");
      for (const c of topCategories) {
        parts.push(
          `  • ${c.name}: ${formatCurrency(c.total)} (${c.count} transaksi)`
        );
      }
    } else {
      parts.push("- Belum ada pengeluaran bulan ini.");
    }

    if (recentTransactions.length > 0) {
      parts.push("- 5 transaksi terakhir:");
      for (const t of recentTransactions) {
        const date = formatDateInput(parseDateLocal(t.date));
        const sign = t.type === "INCOME" ? "+" : "-";
        const cat = t.category?.name ?? "Tanpa Kategori";
        parts.push(
          `  • [${date}] ${sign}${formatCurrency(t.amount)} — ${t.description} (${cat})`
        );
      }
    }

    if (budgetStatuses.length > 0) {
      parts.push("- Status anggaran:");
      for (const b of budgetStatuses) {
        parts.push(
          `  • ${b.category}: terpakai ${formatCurrency(b.spent)} dari ${formatCurrency(b.budget)} (${b.percentage}%, ${b.status})`
        );
      }
    } else {
      parts.push("- Belum ada anggaran yang ditetapkan.");
    }

    return parts.join("\n");
  } catch (dbErr) {
    console.error("[buildChatContext] DB error:", dbErr);
    return "Data keuangan belum tersedia saat ini.";
  }
}
