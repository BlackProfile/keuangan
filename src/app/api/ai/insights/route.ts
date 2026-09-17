import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import { formatCurrency, parseDateLocal } from "@/lib/format";

// GET /api/ai/insights
// Returns: { insights: string[] } — 3-5 actionable Indonesian insights based on
// the last 3 months of transactions.
export async function GET() {
  try {
    const context = await buildInsightsContext();

    // If there's no data at all, return generic computed insights right away.
    if (context.hasNoData) {
      return NextResponse.json(
        { insights: genericComputedInsights() },
        { status: 200 }
      );
    }

    const systemPrompt =
      "Kamu adalah analis keuangan pribadi untuk aplikasi DompetKu. " +
      "Berdasarkan data pola pengeluaran pengguna selama 3 bulan terakhir, " +
      "hasilkan 3-5 insight keuangan yang actionable, spesifik, dan memotivasi. " +
      "Tiap insight ditulis dalam satu kalimat atau bullet pendek dalam Bahasa Indonesia. " +
      "Sebutkan angka/nilai aktual bila relevan agar insight lebih konkret. " +
      "Jangan gunakan penomahan dengan angka di awal baris, " +
      "langsung tulis insight per baris tanpa prefix. Contoh format:\n" +
      "Pengeluaran Makanan naik 12% dibanding bulan lalu, pertimbangkan menyiapkan makan siang dari rumah.\n" +
      "Anda berhasil menabung Rp1,2 jt bulan ini, tingkatkan target menjadi Rp1,5 jt bulan depan.";

    const userPrompt =
      "Berikut adalah data keuangan saya selama 3 bulan terakhir:\n\n" +
      context.text +
      "\n\nTolong berikan 3-5 insight keuangan yang actionable berdasarkan data di atas.";

    try {
      const zai = await ZAI.create();
      const response = await zai.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        thinking: { type: "disabled" },
      });

      const content: string =
        response?.choices?.[0]?.message?.content ?? "";

      const insights = parseInsights(content);

      if (insights.length === 0) {
        // Fall back to locally computed insights if AI returned nothing useful
        return NextResponse.json(
          { insights: context.computedInsights },
          { status: 200 }
        );
      }

      return NextResponse.json({ insights }, { status: 200 });
    } catch (aiErr) {
      console.error("[GET /api/ai/insights] AI error:", aiErr);
      return NextResponse.json(
        { insights: context.computedInsights },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("[GET /api/ai/insights]", err);
    return NextResponse.json(
      { insights: genericComputedInsights() },
      { status: 200 }
    );
  }
}

/**
 * Pull the last 3 months of transactions + budgets and build a compact text
 * prompt that includes monthly totals, category breakdowns, top merchants,
 * and weekday spending patterns. Also returns locally computed insights as a
 * graceful fallback when the LLM is unavailable.
 */
async function buildInsightsContext(): Promise<{
  text: string;
  hasNoData: boolean;
  computedInsights: string[];
}> {
  const now = new Date();
  const threeMonthsAgoStart = new Date(
    now.getFullYear(),
    now.getMonth() - 2,
    1,
    0,
    0,
    0,
    0
  );
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const transactions = await db.transaction
    .findMany({
      where: { date: { gte: threeMonthsAgoStart, lte: monthEnd } },
      include: { category: true },
      orderBy: { date: "asc" },
    })
    .catch(() => []);

  if (transactions.length === 0) {
    return { text: "", hasNoData: true, computedInsights: [] };
  }

  // Group by month key YYYY-MM
  const monthMap = new Map<
    string,
    {
      label: string;
      income: number;
      expense: number;
      count: number;
      catMap: Map<string, { name: string; total: number; count: number }>;
      merchantMap: Map<string, { total: number; count: number }>;
    }
  >();

  // For weekday pattern (Mon-first), index 0..6
  const WEEKDAY_NAMES = [
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
    "Minggu",
  ];
  const weekdayTotals = new Array(7).fill(0);
  const weekdayCounts = new Array(7).fill(0);

  for (const t of transactions) {
    const d = parseDateLocal(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = `${d.getMonth() + 1}/${d.getFullYear()}`;
    let bucket = monthMap.get(key);
    if (!bucket) {
      bucket = {
        label,
        income: 0,
        expense: 0,
        count: 0,
        catMap: new Map(),
        merchantMap: new Map(),
      };
      monthMap.set(key, bucket);
    }
    bucket.count += 1;
    if (t.type === "INCOME") bucket.income += t.amount;
    else bucket.expense += t.amount;

    if (t.type === "EXPENSE") {
      // Weekday (Mon=0 .. Sun=6)
      const wd = (d.getDay() + 6) % 7;
      weekdayTotals[wd] += t.amount;
      weekdayCounts[wd] += 1;

      // Category breakdown
      const catName = t.category?.name ?? "Tanpa Kategori";
      const catEntry = bucket.catMap.get(catName) ?? {
        name: catName,
        total: 0,
        count: 0,
      };
      catEntry.total += t.amount;
      catEntry.count += 1;
      bucket.catMap.set(catName, catEntry);

      // Merchant breakdown
      const merchantName =
        t.merchant?.trim() || t.description.trim() || "Tanpa Nama";
      const mEntry = bucket.merchantMap.get(merchantName) ?? {
        total: 0,
        count: 0,
      };
      mEntry.total += t.amount;
      mEntry.count += 1;
      bucket.merchantMap.set(merchantName, mEntry);
    }
  }

  // Sort months ascending
  const months = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  // Build overall aggregations for computed fallback insights
  const totalIncome = months.reduce((s, m) => s + m.income, 0);
  const totalExpense = months.reduce((s, m) => s + m.expense, 0);
  const totalSavings = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.round((totalSavings / totalIncome) * 100) : 0;
  const avgMonthlyExpense =
    months.length > 0 ? Math.round(totalExpense / months.length) : 0;

  // Aggregate top categories across the full 3-month window
  const aggCatMap = new Map<string, { total: number; count: number }>();
  for (const m of months) {
    for (const [name, c] of m.catMap) {
      const e = aggCatMap.get(name) ?? { total: 0, count: 0 };
      e.total += c.total;
      e.count += c.count;
      aggCatMap.set(name, e);
    }
  }
  const topCategories = Array.from(aggCatMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Top merchants across the full window
  const aggMerchantMap = new Map<string, { total: number; count: number }>();
  for (const m of months) {
    for (const [name, v] of m.merchantMap) {
      const e = aggMerchantMap.get(name) ?? { total: 0, count: 0 };
      e.total += v.total;
      e.count += v.count;
      aggMerchantMap.set(name, e);
    }
  }
  const topMerchants = Array.from(aggMerchantMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  // Compose the prompt text
  const parts: string[] = [];
  parts.push("Ringkasan 3 bulan terakhir:");

  for (const m of months) {
    parts.push(`\nBulan ${m.label}:`);
    parts.push(`  - Pemasukan: ${formatCurrency(m.income)}`);
    parts.push(`  - Pengeluaran: ${formatCurrency(m.expense)}`);
    parts.push(`  - Saldo: ${formatCurrency(m.income - m.expense)}`);
    parts.push(`  - Jumlah transaksi: ${m.count}`);

    const topCats = Array.from(m.catMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    if (topCats.length > 0) {
      parts.push("  - Top kategori pengeluaran:");
      for (const c of topCats) {
        parts.push(
          `    • ${c.name}: ${formatCurrency(c.total)} (${c.count}x)`
        );
      }
    }

    const topMerchantsMonth = Array.from(m.merchantMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
    if (topMerchantsMonth.length > 0) {
      parts.push("  - Top merchant:");
      for (const mer of topMerchantsMonth) {
        parts.push(
          `    • ${mer.name}: ${formatCurrency(mer.total)} (${mer.count}x)`
        );
      }
    }
  }

  // Aggregate category breakdown
  if (topCategories.length > 0) {
    parts.push("\nTop kategori pengeluaran 3 bulan:");
    for (const c of topCategories) {
      parts.push(
        `  • ${c.name}: ${formatCurrency(c.total)} (${c.count}x)`
      );
    }
  }

  // Top merchants overall
  if (topMerchants.length > 0) {
    parts.push("\nTop merchant 3 bulan:");
    for (const m of topMerchants) {
      parts.push(
        `  • ${m.name}: ${formatCurrency(m.total)} (${m.count}x)`
      );
    }
  }

  // Weekday spending pattern
  parts.push("\nPola pengeluaran per hari:");
  for (let i = 0; i < 7; i++) {
    parts.push(
      `  • ${WEEKDAY_NAMES[i]}: ${formatCurrency(weekdayTotals[i])} (${weekdayCounts[i]} transaksi)`
    );
  }

  // Computed fallback insights
  const computed: string[] = [];
  if (months.length >= 1) {
    const lastMonth = months[months.length - 1]!;
    if (lastMonth.income > 0) {
      const rate = Math.round(
        ((lastMonth.income - lastMonth.expense) / lastMonth.income) * 100
      );
      computed.push(
        `Bulan ${lastMonth.label} Anda memiliki savings rate ${rate}% (${formatCurrency(lastMonth.income - lastMonth.expense)} dari ${formatCurrency(lastMonth.income)} pemasukan).`
      );
    }
    if (topCategories.length > 0) {
      const top = topCategories[0]!;
      computed.push(
        `Kategori pengeluaran terbesar Anda adalah ${top.name} dengan total ${formatCurrency(top.total)} selama 3 bulan terakhir.`
      );
    }
    if (topMerchants.length > 0) {
      const top = topMerchants[0]!;
      computed.push(
        `Merchant yang paling sering Anda kunjungi adalah ${top.name} (${top.count} transaksi, total ${formatCurrency(top.total)}).`
      );
    }
    // Find peak weekday
    let peakIdx = 0;
    for (let i = 1; i < 7; i++) {
      if (weekdayTotals[i]! > weekdayTotals[peakIdx]!) peakIdx = i;
    }
    if (weekdayTotals[peakIdx]! > 0) {
      computed.push(
        `Pengeluaran Anda cenderung paling tinggi pada hari ${WEEKDAY_NAMES[peakIdx]} (${formatCurrency(weekdayTotals[peakIdx]!)} selama 3 bulan).`
      );
    }
    if (avgMonthlyExpense > 0) {
      computed.push(
        `Rata-rata pengeluaran bulanan Anda adalah ${formatCurrency(avgMonthlyExpense)}. Targetkan untuk menurunkannya 5-10% bulan depan.`
      );
    }
    if (savingsRate >= 20) {
      computed.push(
        `Savings rate 3 bulan Anda ${savingsRate}% — pertahankan dan naikkan target tabungan bulan depan.`
      );
    } else if (savingsRate < 10 && totalIncome > 0) {
      computed.push(
        `Savings rate 3 bulan Anda hanya ${savingsRate}%. Pertimbangkan meninjau kategori pengeluaran terbesar untuk menambah tabungan.`
      );
    }
  }

  return {
    text: parts.join("\n"),
    hasNoData: false,
    computedInsights: computed.slice(0, 5),
  };
}

/**
 * Parse the LLM response into a clean list of insight strings. Splits by
 * newlines, removes markdown bullets/numbering, filters empties and headers.
 */
function parseInsights(content: string): string[] {
  if (!content || typeof content !== "string") return [];

  return content
    .split(/\r?\n/)
    .map((line) =>
      line
        .replace(/^\s*[-*•]\s*/, "") // bullets
        .replace(/^\s*\d+[\).\]]\s*/, "") // 1. / 1) / 1]
        .replace(/^\s*#{1,6}\s*/, "") // markdown headers
        .replace(/^\s*>\s*/, "") // blockquotes
        .trim()
    )
    .filter((line) => line.length >= 8) // filter trivial leftovers
    .filter(
      (line) =>
        !/^(insight|insights|catatan|note)\s*:/i.test(line) // drop section headers
    )
    .slice(0, 5);
}

/**
 * Generic, locally-computed insights used when there's no transaction data or
 * the AI call unexpectedly fails before context aggregation.
 */
function genericComputedInsights(): string[] {
  return [
    "Mulai catat setiap transaksi harian untuk mendapatkan insight yang lebih akurat.",
    "Tetapkan anggaran bulanan per kategori agar pengeluaran lebih terkontrol.",
    "Sisihkan minimal 20% dari pemasukan untuk tabungan atau investasi.",
    "Tinjau pengeluaran mingguan untuk menemukan pola dan area yang bisa dioptimalkan.",
  ];
}
