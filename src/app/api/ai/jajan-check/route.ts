import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";

// POST /api/ai/jajan-check — quick affordability check using ZAI LLM
// Body: { amount: number }
// Returns: { reply: string, canAfford: boolean, remaining: number }
export async function POST(req: Request) {
  const FALLBACK_REPLY =
    "Hmm, lagi gabisa cek budget nih. Coba lihat sisa uang saku dulu ya sebelum jajan!";

  try {
    const body = await req.json().catch(() => ({}));
    const amt = Number(body?.amount);

    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "Jumlah jajan harus berupa angka positif." },
        { status: 400 }
      );
    }

    // Fetch profile + this month's expenses
    const profile = await db.studentProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });
    const monthlyAllowance = profile?.monthlyAllowance ?? 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const expenses = await db.transaction.findMany({
      where: {
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
        isHidden: false,
      },
      select: { amount: true },
    });

    const spentThisMonth = expenses.reduce((sum, t) => sum + t.amount, 0);
    const remainingThisMonth = Math.max(monthlyAllowance - spentThisMonth, 0);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const daysRemaining = Math.max(daysInMonth - dayOfMonth, 0);
    const safeDayOfMonth = dayOfMonth > 0 ? dayOfMonth : 1;
    const dailyAllowance =
      daysInMonth > 0 ? monthlyAllowance / daysInMonth : 0;
    const dailySpent = spentThisMonth / safeDayOfMonth;
    const dailyRemaining = dailyAllowance - dailySpent;

    // Affordability logic: user can afford if remaining budget covers it
    // AND it doesn't push today's spend above daily allowance (soft rule).
    const canAfford =
      monthlyAllowance <= 0
        ? true // No allowance set — let user decide
        : remainingThisMonth >= amt && dailyRemaining >= amt;

    const systemPrompt =
      `Kamu adalah asisten keuangan untuk mahasiswa. ` +
      `User mau jajan Rp${Math.round(amt)}. ` +
      `Uang saku bulanan: Rp${Math.round(monthlyAllowance)}. ` +
      `Sisa bulan ini: Rp${Math.round(remainingThisMonth)}. ` +
      `Budget harian: Rp${Math.round(dailyAllowance)}. ` +
      `Sudah dihabiskan bulan ini: Rp${Math.round(spentThisMonth)}. ` +
      `Sisa harian untuk hari ini: Rp${Math.round(Math.max(dailyRemaining, 0))}. ` +
      `Hari tersisa bulan ini: ${daysRemaining} hari. ` +
      `Boleh jajan? ${canAfford ? "Boleh" : "Sebaiknya jangan"}. ` +
      `Jawab dengan santai, singkat, dan friendly seperti chat teman. ` +
      `Beri tahu boleh atau tidak boleh jajan, dan kenapa. ` +
      `Maksimal 2-3 kalimat. Bahasa Indonesia santai.`;

    let reply = "";
    try {
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Mau jajan Rp${Math.round(amt)}` },
        ],
        thinking: { type: "disabled" },
      });
      reply =
        response?.choices?.[0]?.message?.content?.trim() || FALLBACK_REPLY;
    } catch (aiErr) {
      console.error("[POST /api/ai/jajan-check] AI error:", aiErr);
      // Provide a deterministic friendly fallback based on affordability
      reply = canAfford
        ? `Boleh kok jajan ${formatCurrency(
            amt
          )}! Sisa uang saku masih ${formatCurrency(
            remainingThisMonth
          )}. Tapi jangan boros ya! 😄`
        : `Hmm, ${formatCurrency(
            amt
          )} itu lebih dari budget harianmu ${formatCurrency(
            dailyAllowance
          )}. Sisa bulan ini cuma ${formatCurrency(
            remainingThisMonth
          )}. Pikir-pikir dulu ya! 💪`;
    }

    return NextResponse.json(
      { reply, canAfford, remaining: remainingThisMonth },
      { status: 200 }
    );
  } catch (err) {
    console.error("[POST /api/ai/jajan-check]", err);
    return NextResponse.json(
      { reply: FALLBACK_REPLY, canAfford: false, remaining: 0 },
      { status: 200 }
    );
  }
}
