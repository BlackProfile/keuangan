import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildWhereClause,
  resolveFields,
  FIELD_LABELS,
} from "@/lib/export-helpers";
import { parseDateLocal, formatDate } from "@/lib/format";
import type { ExportScope } from "@/lib/types";
import ExcelJS from "exceljs";

// POST /api/export/excel
// Body: { scope, fields?, options? }
// Returns a multi-sheet .xlsx workbook:
//   - Transaksi (transactions table, frozen header)
//   - Ringkasan (summary)
//   - Per Kategori (category breakdown)
//   - Top Merchant (top merchants)
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { scope, fields, options } = body as {
      scope?: ExportScope | string;
      fields?: string[] | null;
      options?: { includeHidden?: boolean; title?: string } | null;
    };

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

    let fromLabel = parsedScope.from ?? "";
    let toLabel = parsedScope.to ?? "";
    if (transactions.length > 0) {
      const dates = transactions.map((t) => parseDateLocal(t.date));
      const minDate = dates.reduce((a, b) => (a < b ? a : b));
      const maxDate = dates.reduce((a, b) => (a > b ? a : b));
      if (!fromLabel) fromLabel = formatDate(minDate);
      if (!toLabel) toLabel = formatDate(maxDate);
    }

    // --- Category breakdown (expenses only) ---
    const catMap = new Map<string, { total: number; count: number }>();
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
        catMap.set(name, { total: t.amount, count: 1 });
      }
    }
    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        total: v.total,
        count: v.count,
        percentage: expenseTotal > 0 ? (v.total / expenseTotal) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // --- Top merchants ---
    const merchantMap = new Map<string, { total: number; count: number }>();
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
      .slice(0, 20);

    // --- Build workbook ---
    const wb = new ExcelJS.Workbook();
    wb.creator = "DompetKu";
    wb.created = new Date();
    const title = options?.title?.trim() || "Laporan Transaksi DompetKu";

    const HEADER_FILL: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF10B981" },
    };
    const HEADER_FONT: Partial<ExcelJS.Font> = {
      bold: true,
      color: { argb: "FFFFFFFF" },
      size: 11,
    };
    const TITLE_FONT: Partial<ExcelJS.Font> = {
      bold: true,
      size: 16,
      color: { argb: "FF111827" },
    };

    // ===== Sheet 1: Transaksi =====
    const wsTx = wb.addWorksheet("Transaksi", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    const resolvedFields = resolveFields(fields);
    const txColumns = resolvedFields.map((f) => ({
      header: FIELD_LABELS[f] ?? f,
      key: f,
      width: Math.max(14, Math.min(40, (FIELD_LABELS[f] ?? f).length + 8)),
    }));
    wsTx.columns = txColumns;

    // Style header
    const headerRow = wsTx.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = {
        vertical: "middle",
        horizontal: "left",
        wrapText: false,
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FF10B981" } },
      };
    });

    for (const t of transactions) {
      const row: Record<string, string | number> = {};
      for (const f of resolvedFields) {
        row[f] = getFieldValue(t as TxRow, f);
      }
      wsTx.addRow(row);
    }
    // Auto width (approximation): use header length vs data length
    wsTx.columns.forEach((col) => {
      let max = (col.header as string | undefined)?.length ?? 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = (cell.value?.toString() ?? "").length;
        if (len > max) max = len;
      });
      // cap width
      col.width = Math.min(50, Math.max(12, max + 2));
    });

    // ===== Sheet 2: Ringkasan =====
    const wsSum = wb.addWorksheet("Ringkasan");
    wsSum.columns = [
      { header: "Item", key: "item", width: 32 },
      { header: "Nilai", key: "value", width: 28 },
    ];
    wsSum.getRow(1).height = 22;
    wsSum.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle" };
    });
    const summaryRows: Array<[string, string]> = [
      ["Judul", title],
      ["Periode Dari", fromLabel || "—"],
      ["Periode Sampai", toLabel || "—"],
      ["Total Pemasukan", formatRupiah(totalIncome)],
      ["Total Pengeluaran", formatRupiah(totalExpense)],
      ["Selisih (Saldo)", formatRupiah(balance)],
      ["Jumlah Transaksi", String(transactions.length)],
      ["Dibuat Pada", formatDate(new Date())],
    ];
    summaryRows.forEach(([k, v]) => {
      const r = wsSum.addRow({ item: k, value: v });
      r.getCell(1).font = { bold: true, color: { argb: "FF374151" } };
      r.getCell(2).font = { color: { argb: "FF111827" } };
    });

    // Title above (insert row)
    wsSum.spliceRows(1, 0, []);
    wsSum.getCell("A1").value = title;
    wsSum.getCell("A1").font = TITLE_FONT;
    wsSum.mergeCells("A1:B1");

    // ===== Sheet 3: Per Kategori =====
    const wsCat = wb.addWorksheet("Per Kategori", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    wsCat.columns = [
      { header: "Kategori", key: "category", width: 32 },
      { header: "Total", key: "total", width: 22 },
      { header: "Jumlah Tx", key: "count", width: 14 },
      { header: "Persentase", key: "percentage", width: 16 },
    ];
    wsCat.getRow(1).height = 22;
    wsCat.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle" };
    });
    for (const c of categoryBreakdown) {
      wsCat.addRow({
        category: c.category,
        total: formatRupiah(c.total),
        count: c.count,
        percentage: `${c.percentage.toFixed(2).replace(".", ",")}%`,
      });
    }

    // ===== Sheet 4: Top Merchant =====
    const wsMer = wb.addWorksheet("Top Merchant", {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    wsMer.columns = [
      { header: "Merchant", key: "merchant", width: 32 },
      { header: "Total", key: "total", width: 22 },
      { header: "Jumlah Tx", key: "count", width: 14 },
    ];
    wsMer.getRow(1).height = 22;
    wsMer.getRow(1).eachCell((cell) => {
      cell.fill = HEADER_FILL;
      cell.font = HEADER_FONT;
      cell.alignment = { vertical: "middle" };
    });
    for (const m of topMerchants) {
      wsMer.addRow({
        merchant: m.merchant,
        total: formatRupiah(m.total),
        count: m.count,
      });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const buf = Buffer.from(buffer);

    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const filename = `dompetku-laporan-${dateStr}.xlsx`;

    return new NextResponse(buf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buf.length),
      },
    });
  } catch (err) {
    console.error("[POST /api/export/excel]", err);
    return NextResponse.json(
      { error: "Gagal membuat Excel." },
      { status: 500 }
    );
  }
}

// --- Helpers ---

function formatRupiah(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

type TxRow = {
  date: Date;
  type: string;
  amount: number;
  description: string;
  note: string | null;
  merchant: string | null;
  tags: string | null;
  time: string | null;
  mood: string | null;
  priority: string | null;
  paymentStatus: string | null;
  paymentMethod: string | null;
  recipient: string | null;
  currency: string;
  originalAmount: number | null;
  exchangeRate: number | null;
  cashbackAmount: number | null;
  originalPrice: number | null;
  discountAmount: number | null;
  creditor: string | null;
  status: string;
  isReimbursable: boolean;
  isSubscription: boolean;
  isTaxDeductible: boolean;
  isBusinessExpense: boolean;
  linkUrl: string | null;
  category?: { name: string } | null;
  account?: { name: string } | null;
};

function getFieldValue(t: TxRow, field: string): string {
  switch (field) {
    case "date":
      return formatDate(parseDateLocal(t.date));
    case "type":
      return t.type === "INCOME" ? "Pemasukan" : "Pengeluaran";
    case "category":
      return t.category?.name ?? "";
    case "description":
      return t.description;
    case "amount":
      return formatRupiah(t.amount);
    case "note":
      return t.note ?? "";
    case "account":
      return t.account?.name ?? "";
    case "merchant":
      return t.merchant ?? "";
    case "tags":
      return t.tags ?? "";
    case "time":
      return t.time ?? "";
    case "mood":
      return t.mood ?? "";
    case "priority":
      return t.priority ?? "";
    case "paymentStatus":
      return t.paymentStatus ?? "";
    case "paymentMethod":
      return t.paymentMethod ?? "";
    case "recipient":
      return t.recipient ?? "";
    case "currency":
      return t.currency;
    case "originalAmount":
      return t.originalAmount != null ? formatRupiah(t.originalAmount) : "";
    case "exchangeRate":
      return t.exchangeRate != null ? String(t.exchangeRate) : "";
    case "cashbackAmount":
      return t.cashbackAmount != null ? formatRupiah(t.cashbackAmount) : "";
    case "originalPrice":
      return t.originalPrice != null ? formatRupiah(t.originalPrice) : "";
    case "discountAmount":
      return t.discountAmount != null ? formatRupiah(t.discountAmount) : "";
    case "creditor":
      return t.creditor ?? "";
    case "status":
      return t.status;
    case "isReimbursable":
      return t.isReimbursable ? "Ya" : "Tidak";
    case "isSubscription":
      return t.isSubscription ? "Ya" : "Tidak";
    case "isTaxDeductible":
      return t.isTaxDeductible ? "Ya" : "Tidak";
    case "isBusinessExpense":
      return t.isBusinessExpense ? "Ya" : "Tidak";
    case "linkUrl":
      return t.linkUrl ?? "";
    default:
      return "";
  }
}
