import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildWhereClause,
  resolveFields,
  FIELD_LABELS,
} from "@/lib/export-helpers";
import { formatCurrency, formatDate, parseDateLocal } from "@/lib/format";
import type { ExportScope } from "@/lib/types";
import PDFDocument from "pdfkit";

// POST /api/export/pdf
// Body: { scope, fields?, options? }
// Returns a PDF file (application/pdf) with summary, category breakdown,
// and transactions table. Applies watermark if options.watermark is set.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { scope, fields, options } = body as {
      scope?: ExportScope | string;
      fields?: string[] | null;
      options?:
        | {
            includeHidden?: boolean;
            watermark?: string;
            title?: string;
            showSummary?: boolean;
          }
        | null;
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

    // --- Compute summary + breakdown ---
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

    // --- Build PDF ---
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));

    const docEnd = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const title = options?.title?.trim() || "Laporan Transaksi DompetKu";
    const pageWidth = doc.page.width;
    const contentWidth = pageWidth - 100; // margins

    // Header
    doc
      .fontSize(20)
      .font("Helvetica-Bold")
      .text(title, { align: "center" });
    doc.moveDown(0.3);
    if (fromLabel || toLabel) {
      doc
        .fontSize(10)
        .font("Helvetica")
        .fillColor("#6b7280")
        .text(`Periode: ${fromLabel || "—"} s/d ${toLabel || "—"}`, {
          align: "center",
        });
    }
    doc.moveDown(0.3);
    doc
      .fontSize(9)
      .fillColor("#9ca3af")
      .text(
        `Dibuat: ${formatDate(new Date())} • ${transactions.length} transaksi`,
        { align: "center" }
      );
    doc.moveDown(0.6);
    doc
      .strokeColor("#10b981")
      .lineWidth(2)
      .moveTo(50, doc.y)
      .lineTo(pageWidth - 50, doc.y)
      .stroke();
    doc.moveDown(0.8);

    // Watermark (optional)
    if (options?.watermark && options.watermark.trim()) {
      const wmText = options.watermark.trim();
      doc.save();
      doc
        .fillColor("#d1d5db")
        .fontSize(60)
        .opacity(0.18)
        .text(wmText, 50, doc.page.height / 2 - 80, {
          align: "center",
          width: contentWidth,
        });
      doc.restore();
      doc.fillColor("#000000").opacity(1);
    }

    // Summary section
    if (options?.showSummary !== false) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Ringkasan", { underline: false });
      doc.moveDown(0.3);
      const summaryRows: Array<[string, string]> = [
        ["Total Pemasukan", formatCurrency(totalIncome)],
        ["Total Pengeluaran", formatCurrency(totalExpense)],
        ["Selisih (Saldo)", formatCurrency(balance)],
        ["Jumlah Transaksi", String(transactions.length)],
      ];
      const colW = [contentWidth * 0.6, contentWidth * 0.4];
      for (const [label, value] of summaryRows) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#374151")
          .text(label, 50, doc.y, { width: colW[0], continued: true });
        doc
          .font("Helvetica-Bold")
          .fillColor("#111827")
          .text(value, { width: colW[1], align: "right" });
      }
      doc.moveDown(0.8);
    }

    // Category breakdown table
    if (categoryBreakdown.length > 0) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Rincian per Kategori");
      doc.moveDown(0.3);
      drawTable(
        doc,
        ["Kategori", "Total", "Jumlah", "Persentase"],
        categoryBreakdown.map((c) => [
          c.category,
          formatCurrency(c.total),
          String(c.count),
          `${c.percentage.toFixed(1).replace(".", ",")}%`,
        ]),
        [
          contentWidth * 0.4,
          contentWidth * 0.25,
          contentWidth * 0.15,
          contentWidth * 0.2,
        ]
      );
      doc.moveDown(0.6);
    }

    // Transactions table
    if (transactions.length > 0) {
      doc
        .fontSize(13)
        .font("Helvetica-Bold")
        .fillColor("#111827")
        .text("Daftar Transaksi");
      doc.moveDown(0.3);

      const resolvedFields = resolveFields(fields);
      const fieldLabels = resolvedFields.map((f) => FIELD_LABELS[f] ?? f);
      const rows = transactions.map((t) =>
        resolvedFields.map((f) => getFieldValue(t as TxRow, f))
      );
      // Constrain columns: equal distribution with a sensible minimum.
      const colWidths = resolvedFields.map(() => {
        return Math.max(60, contentWidth / resolvedFields.length);
      });
      // Normalize to fit contentWidth
      const totalColWidth = colWidths.reduce((s, w) => s + w, 0);
      const scale = contentWidth / totalColWidth;
      const scaledWidths = colWidths.map((w) => w * scale);

      drawTable(doc, fieldLabels, rows, scaledWidths, {
        fontSize: 7,
        headerFontSize: 8,
      });
    }

    doc.end();
    const pdfBuffer = await docEnd;

    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const filename = `dompetku-laporan-${dateStr}.pdf`;

    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdfBuffer.length),
      },
    });
  } catch (err) {
    console.error("[POST /api/export/pdf]", err);
    return NextResponse.json({ error: "Gagal membuat PDF." }, { status: 500 });
  }
}

// --- Helpers ---

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
      return formatCurrency(t.amount);
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
      return t.originalAmount != null ? formatCurrency(t.originalAmount) : "";
    case "exchangeRate":
      return t.exchangeRate != null ? String(t.exchangeRate) : "";
    case "cashbackAmount":
      return t.cashbackAmount != null ? formatCurrency(t.cashbackAmount) : "";
    case "originalPrice":
      return t.originalPrice != null ? formatCurrency(t.originalPrice) : "";
    case "discountAmount":
      return t.discountAmount != null ? formatCurrency(t.discountAmount) : "";
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

interface DrawTableOpts {
  fontSize?: number;
  headerFontSize?: number;
  rowHeight?: number;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  opts: DrawTableOpts = {}
) {
  const fontSize = opts.fontSize ?? 8;
  const headerFontSize = opts.headerFontSize ?? 9;
  const rowHeight = opts.rowHeight ?? 16;
  const startX = 50;
  const pageBottom = doc.page.height - 50;
  const headerFill = "#10b981";
  const totalWidth = colWidths.reduce((s, w) => s + w, 0);

  let y = doc.y;
  // Header
  doc
    .fontSize(headerFontSize)
    .font("Helvetica-Bold")
    .fillColor("#ffffff")
    .rect(startX, y, totalWidth, rowHeight)
    .fill(headerFill);
  let x = startX;
  doc.fillColor("#ffffff");
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i] ?? "", x + 4, y + 3, {
      width: colWidths[i] - 8,
      align: "left",
    });
    x += colWidths[i] ?? 0;
  }
  y += rowHeight;

  // Rows
  doc.font("Helvetica").fontSize(fontSize);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    // page break
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = 50;
      // Re-draw header on new page
      doc
        .fontSize(headerFontSize)
        .font("Helvetica-Bold")
        .fillColor("#ffffff")
        .rect(startX, y, totalWidth, rowHeight)
        .fill(headerFill);
      let hx = startX;
      doc.fillColor("#ffffff");
      for (let i = 0; i < headers.length; i++) {
        doc.text(headers[i] ?? "", hx + 4, y + 3, {
          width: colWidths[i] - 8,
          align: "left",
        });
        hx += colWidths[i] ?? 0;
      }
      y += rowHeight;
      doc.font("Helvetica").fontSize(fontSize);
    }
    // Zebra striping
    if (r % 2 === 1) {
      doc
        .fillColor("#f3f4f6")
        .rect(startX, y, totalWidth, rowHeight)
        .fill();
    }
    let cx = startX;
    doc.fillColor("#111827");
    for (let i = 0; i < row.length; i++) {
      const text = (row[i] ?? "").toString();
      doc.text(text, cx + 4, y + 3, {
        width: (colWidths[i] ?? 60) - 8,
        align: "left",
        ellipsis: true,
      });
      cx += colWidths[i] ?? 60;
    }
    y += rowHeight;
  }
  doc.y = y + 4;
}
