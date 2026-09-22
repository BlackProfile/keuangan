import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal, formatDateInput } from "@/lib/format";
import type {
  SmartSearchResult,
  SmartSearchResults,
} from "@/lib/types";

interface ParsedQuery {
  description: string | null;
  from: string | null;
  to: string | null;
  prevMonth: boolean;
}

/** Parse a natural-language Indonesian query into structured filters. */
function parseNaturalLanguage(raw: string): ParsedQuery {
  const original = raw.trim();
  let q = original.toLowerCase();
  const result: ParsedQuery = {
    description: null,
    from: null,
    to: null,
    prevMonth: false,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ----- Date-range phrases (Indonesian) -----
  // "bulan lalu" / "bln lalu" → previous calendar month
  if (/\b(bulan|bln)\s+lalu\b/.test(q)) {
    const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
    result.from = formatDateInput(from);
    result.to = formatDateInput(to);
    result.prevMonth = true;
    q = q.replace(/\b(bulan|bln)\s+lalu\b/g, " ");
  }
  // "bulan ini" → current calendar month
  else if (/\b(bulan|bln)\s+ini\b/.test(q)) {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    const to = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);
    result.from = formatDateInput(from);
    result.to = formatDateInput(to);
    q = q.replace(/\b(bulan|bln)\s+ini\b/g, " ");
  }
  // "minggu lalu" → last 7 days before today
  else if (/\bminggu\s+lalu\b/.test(q)) {
    const from = new Date(today);
    from.setDate(from.getDate() - 7);
    result.from = formatDateInput(from);
    result.to = formatDateInput(today);
    q = q.replace(/\bminggu\s+lalu\b/g, " ");
  }
  // "kemarin" → yesterday only
  else if (/\bkemarin\b/.test(q)) {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    result.from = formatDateInput(y);
    result.to = formatDateInput(y);
    q = q.replace(/\bkemarin\b/g, " ");
  }
  // "hari ini" → today only
  else if (/\b(hari\s+ini|today)\b/.test(q)) {
    result.from = formatDateInput(today);
    result.to = formatDateInput(today);
    q = q.replace(/\b(hari\s+ini|today)\b/g, " ");
  }
  // "N hari lalu" / "N hari yang lalu" → from = today - N days
  const daysMatch = q.match(/(\d+)\s+hari(?:\s+yang)?\s+lalu/);
  if (daysMatch) {
    const n = parseInt(daysMatch[1], 10);
    if (Number.isFinite(n) && n > 0) {
      const from = new Date(today);
      from.setDate(from.getDate() - n);
      result.from = formatDateInput(from);
      result.to = formatDateInput(today);
      q = q.replace(daysMatch[0], " ");
    }
  }

  // Remaining text is the description/keyword search
  const cleaned = q.replace(/\s+/g, " ").trim();
  if (cleaned) {
    result.description = cleaned;
  }
  return result;
}

/** Escape a string for use as a Prisma contains-search (case-insensitive). */
function containsFilter(value: string) {
  return { contains: value };
}

// GET /api/search?q=<query>
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const raw = url.searchParams.get("q") ?? "";
    if (!raw.trim()) {
      const empty: SmartSearchResults = {
        query: "",
        transactions: [],
        categories: [],
        accounts: [],
        goals: [],
        parsedQuery: {
          description: null,
          from: null,
          to: null,
          prevMonth: false,
        },
      };
      return NextResponse.json(empty);
    }

    const parsed = parseNaturalLanguage(raw);

    // Run searches in parallel
    const [
      transactions,
      categories,
      accounts,
      goals,
    ] = await Promise.all([
      // ----- Transactions -----
      (async () => {
        const where: Record<string, unknown> = {};
        if (parsed.description) {
          where.OR = [
            { description: containsFilter(parsed.description) },
            { merchant: containsFilter(parsed.description) },
            { note: containsFilter(parsed.description) },
          ];
        }
        if (parsed.from || parsed.to) {
          const dateFilter: Record<string, Date> = {};
          if (parsed.from) dateFilter.gte = parseDateLocal(parsed.from);
          if (parsed.to) {
            const t = parseDateLocal(parsed.to);
            t.setHours(23, 59, 59, 999);
            dateFilter.lte = t;
          }
          where.date = dateFilter;
        }
        const list = await db.transaction.findMany({
          where,
          take: 8,
          orderBy: { date: "desc" },
          include: { category: true, account: true },
        });
        return list.map<SmartSearchResult>((t) => ({
          id: t.id,
          name: t.description,
          type: "transaction",
          icon: t.category?.icon ?? "Receipt",
          color: t.category?.color ?? "#6b7280",
          subtitle: `${t.type === "INCOME" ? "+" : "-"} Rp${Math.round(
            t.amount
          ).toLocaleString("id-ID")}${t.merchant ? " • " + t.merchant : ""}`,
          badge: t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
        }));
      })(),
      // ----- Categories -----
      (async () => {
        if (!parsed.description) return [];
        const list = await db.category.findMany({
          where: { name: containsFilter(parsed.description) },
          take: 5,
          orderBy: { name: "asc" },
        });
        return list.map<SmartSearchResult>((c) => ({
          id: c.id,
          name: c.name,
          type: "category",
          icon: c.icon,
          color: c.color,
          subtitle: c.type === "INCOME" ? "Kategori pemasukan" : "Kategori pengeluaran",
          badge: "Kategori",
        }));
      })(),
      // ----- Accounts -----
      (async () => {
        if (!parsed.description) return [];
        const list = await db.account.findMany({
          where: { name: containsFilter(parsed.description) },
          take: 5,
          orderBy: { name: "asc" },
        });
        return list.map<SmartSearchResult>((a) => ({
          id: a.id,
          name: a.name,
          type: "account",
          icon: a.icon,
          color: a.color,
          subtitle: `Saldo Rp${Math.round(a.balance).toLocaleString("id-ID")}`,
          badge: "Akun",
        }));
      })(),
      // ----- Goals -----
      (async () => {
        if (!parsed.description) return [];
        const list = await db.goal.findMany({
          where: { name: containsFilter(parsed.description) },
          take: 5,
          orderBy: { name: "asc" },
        });
        return list.map<SmartSearchResult>((g) => ({
          id: g.id,
          name: g.name,
          type: "goal",
          icon: g.icon,
          color: g.color,
          subtitle: `Target Rp${Math.round(g.targetAmount).toLocaleString(
            "id-ID"
          )}`,
          badge: "Tujuan",
        }));
      })(),
    ]);

    const response: SmartSearchResults = {
      query: raw,
      transactions,
      categories,
      accounts,
      goals,
      parsedQuery: parsed,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("[GET /api/search]", err);
    return NextResponse.json(
      { error: "Gagal melakukan pencarian." },
      { status: 500 }
    );
  }
}
