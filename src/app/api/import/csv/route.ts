import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import { AUTO_CATEGORY_KEYWORDS } from "@/lib/constants";
import type { TransactionType } from "@/lib/types";

// POST /api/import/csv
// body: { rows: Array<Record<string,string>> }
// Each row may have keys: Tanggal/Keterangan/Description, Tipe/Type,
// Kategori/Category, Jumlah/Amount, Catatan/Note
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rows: Array<Record<string, string>> = Array.isArray(body?.rows)
      ? body.rows
      : [];

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada baris data untuk diimpor." },
        { status: 400 }
      );
    }

    // Normalize a row's keys to canonical fields
    const normalizeKey = (k: string): string =>
      k
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

    const pickField = (
      row: Record<string, string>,
      aliases: string[]
    ): string | undefined => {
      const map = new Map<string, string>();
      for (const k of Object.keys(row)) {
        map.set(normalizeKey(k), row[k]);
      }
      for (const alias of aliases) {
        const v = map.get(normalizeKey(alias));
        if (v !== undefined && v !== null && String(v).trim() !== "") {
          return String(v);
        }
      }
      return undefined;
    };

    // Parse amount: handle "Rp 1.234.567", "1.234.567", "1,234,567", "-5000"
    const parseAmount = (raw: string): number | null => {
      if (!raw) return null;
      let s = String(raw).trim();
      // Remove currency symbols and spaces
      s = s.replace(/[Rr][Pp]\.?\s*/g, "").replace(/\s/g, "");
      // Detect sign
      let negative = false;
      if (s.startsWith("-")) {
        negative = true;
        s = s.slice(1);
      } else if (s.startsWith("(") && s.endsWith(")")) {
        negative = true;
        s = s.slice(1, -1);
      }
      // Indonesian format uses . for thousands and , for decimals
      // Heuristic: if it contains both . and ,, the last one is decimal separator
      const hasDot = s.includes(".");
      const hasComma = s.includes(",");
      let normalized: string;
      if (hasDot && hasComma) {
        if (s.lastIndexOf(".") < s.lastIndexOf(",")) {
          // ID format: 1.234.567,89
          normalized = s.replace(/\./g, "").replace(",", ".");
        } else {
          // EN format: 1,234,567.89
          normalized = s.replace(/,/g, "");
        }
      } else if (hasDot) {
        // Could be thousands sep (1.234.567) or decimal (1.50)
        // If multiple dots -> thousands
        const dotCount = (s.match(/\./g) || []).length;
        if (dotCount > 1) {
          normalized = s.replace(/\./g, "");
        } else {
          // Single dot — if 3 digits after, likely thousands
          const parts = s.split(".");
          if (parts[1]?.length === 3) {
            normalized = s.replace(".", "");
          } else {
            normalized = s; // keep as decimal
          }
        }
      } else if (hasComma) {
        const dotCount = (s.match(/,/g) || []).length;
        if (dotCount > 1) {
          normalized = s.replace(/,/g, "");
        } else {
          const parts = s.split(",");
          if (parts[1]?.length === 3) {
            normalized = s.replace(/,/g, "");
          } else {
            normalized = s.replace(",", ".");
          }
        }
      } else {
        normalized = s;
      }
      const num = Number(normalized);
      if (!Number.isFinite(num)) return null;
      return negative ? -Math.abs(num) : Math.abs(num);
    };

    // Determine type from Tipe field or amount sign
    const determineType = (
      tipeRaw: string | undefined,
      amount: number
    ): TransactionType => {
      if (tipeRaw) {
        const t = tipeRaw.trim().toLowerCase();
        if (
          t === "income" ||
          t === "pemasukan" ||
          t === "in" ||
          t === "masuk"
        ) {
          return "INCOME";
        }
        if (
          t === "expense" ||
          t === "pengeluaran" ||
          t === "out" ||
          t === "keluar"
        ) {
          return "EXPENSE";
        }
      }
      // Fallback: sign-based
      return amount < 0 ? "EXPENSE" : "INCOME";
    };

    // Auto-categorize based on description against AUTO_CATEGORY_KEYWORDS
    const autoCategorize = (
      description: string
    ): { categoryName: string; type: TransactionType; merchant?: string } => {
      const lower = description.toLowerCase();
      for (const [keyword, info] of Object.entries(AUTO_CATEGORY_KEYWORDS)) {
        if (lower.includes(keyword.toLowerCase())) {
          return {
            categoryName: info.category,
            type: info.type,
            merchant: info.merchant,
          };
        }
      }
      return { categoryName: "Lainnya", type: "EXPENSE" };
    };

    // Cache categories by name+type
    const categoryCache = new Map<string, string | null>();

    const findCategory = async (
      name: string,
      type: TransactionType
    ): Promise<string | null> => {
      const key = `${name}|${type}`;
      if (categoryCache.has(key)) return categoryCache.get(key)!;
      const cat = await db.category.findFirst({
        where: { name, type },
      });
      const result = cat?.id ?? null;
      categoryCache.set(key, result);
      return result;
    };

    let imported = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const rowNo = i + 1;

      try {
        const dateRaw = pickField(row, ["Tanggal", "Date", "TanggalTransaksi"]);
        const descRaw = pickField(row, [
          "Keterangan",
          "Description",
          "Deskripsi",
          "Nama",
        ]);
        const tipeRaw = pickField(row, ["Tipe", "Type", "Jenis"]);
        const amountRaw = pickField(row, ["Jumlah", "Amount", "Nilai", "Total"]);
        const noteRaw = pickField(row, ["Catatan", "Note", "Notes", "KeteranganTambahan"]);
        const categoryRaw = pickField(row, [
          "Kategori",
          "Category",
          "Cat",
        ]);

        if (!dateRaw) {
          skipped += 1;
          errors.push({ row: rowNo, error: "Tanggal kosong / tidak ditemukan." });
          continue;
        }
        const parsedDate = parseDateLocal(dateRaw);
        if (
          !(parsedDate instanceof Date) ||
          Number.isNaN(parsedDate.getTime())
        ) {
          skipped += 1;
          errors.push({ row: rowNo, error: `Tanggal tidak valid: "${dateRaw}".` });
          continue;
        }

        const amount = amountRaw ? parseAmount(amountRaw) : null;
        if (amount === null || amount === 0) {
          skipped += 1;
          errors.push({
            row: rowNo,
            error: `Jumlah tidak valid: "${amountRaw ?? ""}".`,
          });
          continue;
        }

        const description = (descRaw ?? "").trim();
        if (!description) {
          skipped += 1;
          errors.push({ row: rowNo, error: "Keterangan kosong." });
          continue;
        }

        let type = determineType(tipeRaw, amount);

        // Resolve category: explicit > auto-categorize from description.
        // When auto-categorizing, adopt the keyword's type (e.g. "gaji" -> INCOME)
        // so the category matches the transaction type.
        let categoryId: string | null = null;
        if (categoryRaw && categoryRaw.trim()) {
          categoryId = await findCategory(categoryRaw.trim(), type);
        }
        if (!categoryId) {
          const auto = autoCategorize(description);
          const autoCatId = await findCategory(auto.categoryName, auto.type);
          if (autoCatId) {
            categoryId = autoCatId;
            type = auto.type;
          } else {
            // Fall back to "Lainnya" matching the determined type
            categoryId = await findCategory("Lainnya", type);
          }
        }

        if (!categoryId) {
          skipped += 1;
          errors.push({
            row: rowNo,
            error: `Kategori tidak ditemukan untuk: "${description}".`,
          });
          continue;
        }

        await db.transaction.create({
          data: {
            type,
            amount: Math.abs(amount),
            description,
            date: parsedDate,
            categoryId,
            note: noteRaw?.trim() || null,
          },
        });
        imported += 1;
      } catch (e) {
        skipped += 1;
        errors.push({
          row: rowNo,
          error: e instanceof Error ? e.message : "Kesalahan tidak diketahui.",
        });
      }
    }

    return NextResponse.json({ imported, skipped, errors });
  } catch (err) {
    console.error("[POST /api/import/csv]", err);
    return NextResponse.json(
      { error: "Gagal mengimpor data CSV." },
      { status: 500 }
    );
  }
}
