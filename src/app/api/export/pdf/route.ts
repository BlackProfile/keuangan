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
import {
  PDF_TEMPLATES,
  type PdfTemplate,
  type PdfTemplateId,
} from "@/lib/pdf-templates";

// POST /api/export/pdf
// Body: { scope?, fields?, options?: { templateId?, watermark?, title?, includeHidden? } }
// Returns a PDF file (application/pdf) with summary, category breakdown,
// and transactions table. Visual theming is driven by a PdfTemplate
// (default "minimal-clean"). See src/lib/pdf-templates.ts for the catalog.
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
            templateId?: string;
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

    // --- Resolve template (default minimal-clean) ---
    const requestedId = options?.templateId as PdfTemplateId | undefined;
    const template =
      PDF_TEMPLATES.find((t) => t.id === requestedId) ??
      PDF_TEMPLATES.find((t) => t.id === "minimal-clean")!;

    const theme = template.theme;
    const layout = template.layout;
    const isDark = isDarkColor(theme.bg);
    const isReceipt =
      template.id === "receipt-style" || template.id === "slip-jajan";
    const fontFamily = isReceipt ? "Courier" : "Helvetica";
    const fontBold = isReceipt ? "Courier-Bold" : "Helvetica-Bold";
    const compact = template.compactMode;

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

    // --- Top merchants (if section enabled) ---
    let topMerchants: Array<{
      merchant: string;
      total: number;
      count: number;
    }> = [];
    if (template.sections.topMerchants) {
      const merchantMap = new Map<string, { total: number; count: number }>();
      for (const t of transactions) {
        if (t.type !== "EXPENSE") continue;
        const m = (t.merchant ?? "").trim();
        if (!m) continue;
        const entry = merchantMap.get(m);
        if (entry) {
          entry.total += t.amount;
          entry.count += 1;
        } else {
          merchantMap.set(m, { total: t.amount, count: 1 });
        }
      }
      topMerchants = Array.from(merchantMap.entries())
        .map(([merchant, v]) => ({
          merchant,
          total: v.total,
          count: v.count,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }

    // --- Build PDF ---
    const pdfSize: string | [number, number] = Array.isArray(layout.size)
      ? layout.size
      : layout.size === "A5"
        ? "A5"
        : layout.size === "LETTER"
          ? "letter"
          : "A4";

    const margin = layout.margin;
    const baseFontSize = compact
      ? Math.max(layout.fontSize - 1, 7)
      : layout.fontSize;

    const doc = new PDFDocument({
      margin,
      size: pdfSize,
      layout: layout.orientation === "landscape" ? "landscape" : "portrait",
      margins: { top: margin, bottom: margin, left: margin, right: margin },
      info: {
        Title: options?.title?.trim() || "Laporan Transaksi DompetKu",
        Author: "DompetKu",
        Subject: "Laporan Keuangan",
      },
    });

    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    const docEnd = new Promise<Buffer>((resolve) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const contentWidth = pageWidth - margin * 2;
    const pageBottom = pageHeight - margin;

    // --- Dark-mode: fill entire page with bg color (first + each new page) ---
    const fillBackground = () => {
      doc.rect(0, 0, pageWidth, pageHeight).fill(theme.bg);
      doc.fillColor(theme.text);
    };
    if (isDark) fillBackground();
    doc.on("pageAdded", () => {
      if (isDark) fillBackground();
    });

    const title = options?.title?.trim() || "Laporan Transaksi DompetKu";
    const showSummary =
      options?.showSummary !== false && template.sections.summary;

    // --- Watermark (diagonal, if template.sections.watermark OR options.watermark) ---
    const wmText =
      (options?.watermark && options.watermark.trim()) ||
      (template.sections.watermark ? "DOMPETKU" : "");
    if (wmText) {
      drawWatermark(doc, wmText, theme, pageWidth, pageHeight);
    }

    // --- Cover page (template.layout.coverPage) ---
    if (layout.coverPage) {
      drawCoverPage(
        doc,
        template,
        title,
        fromLabel,
        toLabel,
        transactions.length,
        totalIncome,
        totalExpense,
        balance,
        pageWidth,
        pageHeight,
        margin,
        fontBold,
        fontFamily,
        baseFontSize
      );
      doc.addPage();
    }

    // --- Header ---
    drawHeader(
      doc,
      template,
      title,
      fromLabel,
      toLabel,
      transactions.length,
      pageWidth,
      margin,
      contentWidth,
      fontFamily,
      fontBold,
      baseFontSize
    );

    // --- Section heading helper ---
    const sectionHeading = (text: string) => {
      const sz = compact ? baseFontSize + 2 : baseFontSize + 3;
      doc.moveDown(0.6);
      doc
        .font(fontBold)
        .fontSize(sz)
        .fillColor(theme.primary)
        .text(text, margin, doc.y, { width: contentWidth });
      doc.moveDown(0.2);
      doc
        .strokeColor(theme.border)
        .lineWidth(1)
        .moveTo(margin, doc.y)
        .lineTo(pageWidth - margin, doc.y)
        .stroke();
      doc.moveDown(0.3);
      doc.fillColor(theme.text).font(fontFamily);
    };

    if (layout.twoColumn) {
      // === Two-column layout (infographic) ===
      const colGap = 16;
      const colW = (contentWidth - colGap) / 2;
      const leftX = margin;
      const rightX = margin + colW + colGap;
      const startY = doc.y;

      // LEFT column
      if (showSummary) {
        drawSummaryCard(
          doc,
          template,
          totalIncome,
          totalExpense,
          balance,
          transactions.length,
          baseFontSize,
          fontFamily,
          fontBold,
          leftX,
          colW
        );
      }
      if (
        template.sections.categoryBreakdown &&
        categoryBreakdown.length > 0
      ) {
        doc.moveDown(0.4);
        doc
          .font(fontBold)
          .fontSize(baseFontSize + 2)
          .fillColor(theme.primary)
          .text("Rincian Kategori", leftX, doc.y, { width: colW });
        doc.moveDown(0.2);
        drawCategoryBars(
          doc,
          template,
          categoryBreakdown,
          baseFontSize,
          fontFamily,
          fontBold,
          leftX,
          colW
        );
      }
      const leftEndY = doc.y;

      // RIGHT column
      doc.x = rightX;
      doc.y = startY;
      if (template.sections.topMerchants && topMerchants.length > 0) {
        doc
          .font(fontBold)
          .fontSize(baseFontSize + 2)
          .fillColor(theme.primary)
          .text("Top Merchant", rightX, doc.y, { width: colW });
        doc.moveDown(0.2);
        drawTopMerchantList(
          doc,
          template,
          topMerchants,
          baseFontSize,
          fontFamily,
          fontBold,
          rightX,
          colW
        );
        doc.moveDown(0.4);
      }
      if (template.sections.insights) {
        doc
          .font(fontBold)
          .fontSize(baseFontSize + 2)
          .fillColor(theme.primary)
          .text("Insight", rightX, doc.y, { width: colW });
        doc.moveDown(0.2);
        drawInsights(
          doc,
          template,
          totalIncome,
          totalExpense,
          balance,
          baseFontSize,
          fontFamily,
          fontBold,
          rightX,
          colW
        );
        doc.moveDown(0.4);
      }
      if (template.sections.tips) {
        doc
          .font(fontBold)
          .fontSize(baseFontSize + 2)
          .fillColor(theme.primary)
          .text("Tips", rightX, doc.y, { width: colW });
        doc.moveDown(0.2);
        drawTips(
          doc,
          template,
          totalExpense,
          baseFontSize,
          fontFamily,
          fontBold,
          rightX,
          colW
        );
      }
      const rightEndY = doc.y;

      doc.x = margin;
      doc.y = Math.max(leftEndY, rightEndY);
    } else {
      // === Single-column layout ===
      if (showSummary) {
        sectionHeading("Ringkasan");
        drawSummaryRows(
          doc,
          template,
          totalIncome,
          totalExpense,
          balance,
          transactions.length,
          baseFontSize,
          fontFamily,
          fontBold,
          margin,
          contentWidth
        );
      }

      if (template.sections.topMerchants && topMerchants.length > 0) {
        sectionHeading("Top Merchant");
        drawTopMerchantList(
          doc,
          template,
          topMerchants,
          baseFontSize,
          fontFamily,
          fontBold,
          margin,
          contentWidth
        );
      }

      if (
        template.sections.categoryBreakdown &&
        categoryBreakdown.length > 0
      ) {
        sectionHeading("Rincian per Kategori");
        if (template.sections.charts) {
          drawCategoryBars(
            doc,
            template,
            categoryBreakdown,
            baseFontSize,
            fontFamily,
            fontBold,
            margin,
            contentWidth
          );
          doc.moveDown(0.3);
        }
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
          ],
          {
            fontSize: Math.max(6, baseFontSize - 2),
            headerFontSize: Math.max(7, baseFontSize - 1),
            theme,
            startX: margin,
            pageBottom,
            pageHeight,
            fontFamily,
            fontBold,
            dashed: isReceipt,
          }
        );
      }

      if (template.sections.transactionList && transactions.length > 0) {
        sectionHeading("Daftar Transaksi");
        const resolvedFields = resolveFields(fields);
        const fieldLabels = resolvedFields.map((f) => FIELD_LABELS[f] ?? f);
        const rows = transactions.map((t) =>
          resolvedFields.map((f) => getFieldValue(t as TxRow, f))
        );
        const colWidths = resolvedFields.map(() =>
          Math.max(40, contentWidth / resolvedFields.length)
        );
        const totalColWidth = colWidths.reduce((s, w) => s + w, 0);
        const scale = contentWidth / totalColWidth;
        const scaledWidths = colWidths.map((w) => w * scale);
        drawTable(doc, fieldLabels, rows, scaledWidths, {
          fontSize: Math.max(6, baseFontSize - 2),
          headerFontSize: Math.max(7, baseFontSize - 1),
          theme,
          startX: margin,
          pageBottom,
          pageHeight,
          fontFamily,
          fontBold,
          dashed: isReceipt,
        });
      }

      if (template.sections.insights) {
        sectionHeading("Insight");
        drawInsights(
          doc,
          template,
          totalIncome,
          totalExpense,
          balance,
          baseFontSize,
          fontFamily,
          fontBold,
          margin,
          contentWidth
        );
      }

      if (template.sections.tips) {
        sectionHeading("Tips Hemat");
        drawTips(
          doc,
          template,
          totalExpense,
          baseFontSize,
          fontFamily,
          fontBold,
          margin,
          contentWidth
        );
      }
    }

    // --- Footers (branding / page numbers / timestamp) — applied to all pages ---
    drawFooters(
      doc,
      template,
      pageWidth,
      pageHeight,
      margin,
      baseFontSize,
      fontFamily
    );

    doc.end();
    const pdfBuffer = await docEnd;

    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const filename = `dompetku-${template.id}-${dateStr}.pdf`;

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

// ============================================================
// Helpers
// ============================================================

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

/** Detect whether a hex color is dark (luminance < 0.5). */
function isDarkColor(hex: string): boolean {
  const c = hex.replace("#", "");
  if (c.length < 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return false;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.5;
}

/** Diagonal watermark text overlay. */
function drawWatermark(
  doc: PDFKit.PDFDocument,
  text: string,
  theme: PdfTemplate["theme"],
  pageWidth: number,
  pageHeight: number
) {
  doc.save();
  doc.translate(pageWidth / 2, pageHeight / 2);
  doc.rotate(-45);
  doc
    .fillColor(theme.textMuted)
    .fontSize(72)
    .opacity(0.1)
    .text(text, { align: "center", width: pageWidth });
  doc.restore();
  doc.opacity(1).fillColor(theme.text);
}

/** Cover page for templates with layout.coverPage === true. */
function drawCoverPage(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  title: string,
  fromLabel: string,
  toLabel: string,
  txCount: number,
  totalIncome: number,
  totalExpense: number,
  balance: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fontBold: string,
  fontFamily: string,
  baseFontSize: number
) {
  const theme = template.theme;
  // Top + bottom accent bars
  doc.rect(0, 0, pageWidth, 8).fill(theme.primary);
  doc.rect(0, pageHeight - 8, pageWidth, 8).fill(theme.accent);

  const titleY = pageHeight * 0.32;
  doc
    .font(fontBold)
    .fontSize(template.layout.titleSize + 8)
    .fillColor(theme.text)
    .text(title, margin, titleY, {
      align: "center",
      width: pageWidth - margin * 2,
    });

  if (fromLabel || toLabel) {
    doc
      .font(fontFamily)
      .fontSize(baseFontSize + 2)
      .fillColor(theme.textMuted)
      .text(
        `Periode: ${fromLabel || "—"} s/d ${toLabel || "—"}`,
        margin,
        titleY + 70,
        { align: "center", width: pageWidth - margin * 2 }
      );
  }

  // Big summary numbers row
  const statY = pageHeight * 0.6;
  const statW = (pageWidth - margin * 2) / 3;
  const stats: Array<{ label: string; value: string; color: string }> = [
    { label: "Pemasukan", value: formatCurrency(totalIncome), color: "#10b981" },
    { label: "Pengeluaran", value: formatCurrency(totalExpense), color: "#ef4444" },
    { label: "Saldo", value: formatCurrency(balance), color: theme.primary },
  ];
  stats.forEach((s, i) => {
    const x = margin + i * statW;
    doc
      .font(fontFamily)
      .fontSize(baseFontSize)
      .fillColor(theme.textMuted)
      .text(s.label, x, statY, { align: "center", width: statW });
    doc
      .font(fontBold)
      .fontSize(baseFontSize + 6)
      .fillColor(s.color)
      .text(s.value, x, statY + 20, { align: "center", width: statW });
  });

  doc
    .font(fontFamily)
    .fontSize(baseFontSize)
    .fillColor(theme.textMuted)
    .text(`${txCount} transaksi`, margin, pageHeight - margin - 30, {
      align: "center",
      width: pageWidth - margin * 2,
    });
  doc.fillColor(theme.text).font(fontFamily);
}

/** Header block: title + period + timestamp + accent divider. */
function drawHeader(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  title: string,
  fromLabel: string,
  toLabel: string,
  txCount: number,
  pageWidth: number,
  margin: number,
  contentWidth: number,
  fontFamily: string,
  fontBold: string,
  baseFontSize: number
) {
  const theme = template.theme;
  doc
    .font(fontBold)
    .fontSize(template.layout.titleSize)
    .fillColor(theme.text)
    .text(title, margin, doc.y, {
      align: "center",
      width: contentWidth,
    });
  doc.moveDown(0.3);
  if (fromLabel || toLabel) {
    doc
      .font(fontFamily)
      .fontSize(baseFontSize - 1)
      .fillColor(theme.textMuted)
      .text(`Periode: ${fromLabel || "—"} s/d ${toLabel || "—"}`, {
        align: "center",
        width: contentWidth,
      });
  }
  if (template.showTimestamp) {
    doc.moveDown(0.2);
    doc
      .fontSize(baseFontSize - 2)
      .fillColor(theme.textMuted)
      .text(`Dibuat: ${formatDate(new Date())} • ${txCount} transaksi`, {
        align: "center",
        width: contentWidth,
      });
  }
  doc.moveDown(0.4);
  doc
    .strokeColor(theme.primary)
    .lineWidth(2)
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .stroke();
  doc.fillColor(theme.text).font(fontFamily).moveDown(0.6);
}

/** Summary rows (label + value, two-segment line per row). */
function drawSummaryRows(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  totalIncome: number,
  totalExpense: number,
  balance: number,
  txCount: number,
  baseFontSize: number,
  fontFamily: string,
  fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  const rows: Array<[string, string, string]> = [
    ["Total Pemasukan", formatCurrency(totalIncome), "#10b981"],
    ["Total Pengeluaran", formatCurrency(totalExpense), "#ef4444"],
    ["Selisih (Saldo)", formatCurrency(balance), theme.primary],
    ["Jumlah Transaksi", String(txCount), theme.text],
  ];
  const labelW = width * 0.6;
  const valueW = width * 0.4;
  for (const [label, value, color] of rows) {
    doc
      .font(fontFamily)
      .fontSize(baseFontSize)
      .fillColor(theme.textMuted)
      .text(label, startX, doc.y, { width: labelW, continued: true });
    doc
      .font(fontBold)
      .fillColor(color)
      .text(value, { width: valueW, align: "right" });
    doc.fillColor(theme.text).font(fontFamily);
  }
  doc.moveDown(0.4);
}

/** Card-style summary box (used in two-column layouts). */
function drawSummaryCard(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  totalIncome: number,
  totalExpense: number,
  balance: number,
  txCount: number,
  baseFontSize: number,
  fontFamily: string,
  fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  doc
    .font(fontBold)
    .fontSize(baseFontSize + 2)
    .fillColor(theme.primary)
    .text("Ringkasan", startX, doc.y, { width });
  doc.moveDown(0.2);
  const startY = doc.y;
  const cardH = 4 * (baseFontSize + 14) + 8;
  doc.fillColor(theme.tableStripe).rect(startX, startY, width, cardH).fill();
  doc
    .strokeColor(theme.border)
    .lineWidth(1)
    .rect(startX, startY, width, cardH)
    .stroke();
  let y = startY + 6;
  const items: Array<[string, string, string]> = [
    ["Pemasukan", formatCurrency(totalIncome), "#10b981"],
    ["Pengeluaran", formatCurrency(totalExpense), "#ef4444"],
    ["Saldo", formatCurrency(balance), theme.primary],
    ["Transaksi", String(txCount), theme.text],
  ];
  for (const [label, value, color] of items) {
    doc
      .font(fontFamily)
      .fontSize(baseFontSize)
      .fillColor(theme.textMuted)
      .text(label, startX + 8, y, { width: width * 0.55 });
    doc
      .font(fontBold)
      .fontSize(baseFontSize)
      .fillColor(color)
      .text(value, startX + width * 0.55, y, {
        width: width * 0.45 - 8,
        align: "right",
      });
    y += baseFontSize + 14;
  }
  doc.y = startY + cardH + 6;
  doc.fillColor(theme.text).font(fontFamily);
}

/** Top merchants list with mini progress bars. */
function drawTopMerchantList(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  merchants: Array<{ merchant: string; total: number; count: number }>,
  baseFontSize: number,
  fontFamily: string,
  fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  const max = merchants[0]?.total ?? 1;
  for (let i = 0; i < merchants.length; i++) {
    const m = merchants[i]!;
    const pct = max > 0 ? m.total / max : 0;
    doc
      .font(fontFamily)
      .fontSize(baseFontSize)
      .fillColor(theme.text)
      .text(`${i + 1}. ${m.merchant}`, startX, doc.y, {
        width: width * 0.55,
        continued: true,
      });
    doc
      .font(fontBold)
      .fillColor(theme.primary)
      .text(formatCurrency(m.total), {
        width: width * 0.45,
        align: "right",
      });
    const barY = doc.y + 2;
    const barH = 4;
    doc.fillColor(theme.border).rect(startX, barY, width, barH).fill();
    doc.fillColor(theme.primary).rect(startX, barY, width * pct, barH).fill();
    doc.y = barY + barH + 4;
  }
  doc.fillColor(theme.text).font(fontFamily);
}

/** Category breakdown as text-based progress bars (chart fallback). */
function drawCategoryBars(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  categories: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>,
  baseFontSize: number,
  fontFamily: string,
  fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  const barH = Math.max(6, baseFontSize - 2);
  for (const c of categories.slice(0, 8)) {
    doc
      .font(fontFamily)
      .fontSize(baseFontSize)
      .fillColor(theme.text)
      .text(c.category, startX, doc.y, {
        width: width * 0.45,
        continued: true,
      });
    doc
      .font(fontFamily)
      .fillColor(theme.textMuted)
      .text(`${c.percentage.toFixed(1).replace(".", ",")}%`, {
        width: width * 0.15,
        align: "right",
        continued: true,
      });
    doc
      .font(fontBold)
      .fillColor(theme.primary)
      .text(formatCurrency(c.total), {
        width: width * 0.4,
        align: "right",
      });
    const barY = doc.y + 2;
    doc.fillColor(theme.border).rect(startX, barY, width, barH).fill();
    doc
      .fillColor(theme.primary)
      .rect(startX, barY, (width * c.percentage) / 100, barH)
      .fill();
    doc.y = barY + barH + 6;
  }
  doc.fillColor(theme.text).font(fontFamily);
}

/** Insights text generated from totals. */
function drawInsights(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  totalIncome: number,
  totalExpense: number,
  balance: number,
  baseFontSize: number,
  fontFamily: string,
  _fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  const ratio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const insights: string[] = [];
  if (balance > 0) {
    insights.push(
      `✓ Surplus periode ini: ${formatCurrency(balance)} tertinggal di dompet.`
    );
  } else if (balance < 0) {
    insights.push(
      `⚠ Defisit: pengeluaran melebihi pemasukan sebesar ${formatCurrency(Math.abs(balance))}.`
    );
  } else {
    insights.push("• Pemasukan dan pengeluaran seimbang.");
  }
  if (ratio > 80) {
    insights.push(
      `⚠ Rasio pengeluaran ${ratio.toFixed(0)}% — terlalu tinggi, pertimbangkan memangkas pengeluaran.`
    );
  } else if (ratio < 50) {
    insights.push(
      `✓ Rasio pengeluaran ${ratio.toFixed(0)}% — sehat, pertahankan!`
    );
  } else {
    insights.push(`• Rasio pengeluaran ${ratio.toFixed(0)}% — cukup wajar.`);
  }
  doc.font(fontFamily).fontSize(baseFontSize).fillColor(theme.text);
  for (const line of insights) {
    doc.text(line, startX, doc.y, { width });
    doc.moveDown(0.2);
  }
  doc.fillColor(theme.text).font(fontFamily);
}

/** Tips text — basic money-saving suggestions. */
function drawTips(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  _totalExpense: number,
  baseFontSize: number,
  fontFamily: string,
  _fontBold: string,
  startX: number,
  width: number
) {
  const theme = template.theme;
  const tips = [
    "• Catat setiap pengeluaran kecil — jajan kopi bisa jadi puluhan ribu per bulan.",
    "• Terapkan aturan 50/30/20: kebutuhan/keinginan/tabungan.",
    "• Sisihkan minimal 10% pemasukan ke dana darurat setiap bulan.",
    "• Bandingkan harga sebelum membeli barang mahal.",
  ];
  doc.font(fontFamily).fontSize(baseFontSize).fillColor(theme.text);
  for (const t of tips) {
    doc.text(t, startX, doc.y, { width });
    doc.moveDown(0.2);
  }
  doc.fillColor(theme.text).font(fontFamily);
}

/** Apply footer (branding / page numbers / timestamp) to all buffered pages. */
function drawFooters(
  doc: PDFKit.PDFDocument,
  template: PdfTemplate,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  baseFontSize: number,
  fontFamily: string
) {
  const theme = template.theme;
  if (!template.sections.footer) return;
  if (
    !template.showBranding &&
    !template.showPageNumbers &&
    !template.showTimestamp
  )
    return;
  const range = doc.bufferedPageRange();
  const total = range.count;
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    const y = pageHeight - margin / 2;
    // Footer divider line
    doc
      .strokeColor(theme.border)
      .lineWidth(0.5)
      .moveTo(margin, y - 8)
      .lineTo(pageWidth - margin, y - 8)
      .stroke();
    doc
      .fillColor(theme.textMuted)
      .fontSize(baseFontSize - 2)
      .font(fontFamily);
    if (template.showBranding) {
      doc.text("Generated by DompetKu", margin, y, {
        align: "left",
        width: pageWidth - margin * 2,
      });
    }
    if (template.showTimestamp) {
      const ts = formatDate(new Date());
      doc.text(ts, margin, y, {
        align: "center",
        width: pageWidth - margin * 2,
      });
    }
    if (template.showPageNumbers) {
      doc.text(`Hal. ${i + 1} / ${total}`, margin, y, {
        align: "right",
        width: pageWidth - margin * 2,
      });
    }
  }
  doc.fillColor(theme.text).font(fontFamily);
}

// ============================================================
// Table renderer (theme-aware)
// ============================================================

interface DrawTableOpts {
  fontSize?: number;
  headerFontSize?: number;
  rowHeight?: number;
  theme: PdfTemplate["theme"];
  startX: number;
  pageBottom: number;
  pageHeight?: number;
  fontFamily: string;
  fontBold: string;
  dashed?: boolean; // receipt-style dashed borders
}

function drawTable(
  doc: PDFKit.PDFDocument,
  headers: string[],
  rows: string[][],
  colWidths: number[],
  opts: DrawTableOpts
) {
  const fontSize = opts.fontSize ?? 8;
  const headerFontSize = opts.headerFontSize ?? 9;
  const rowHeight = opts.rowHeight ?? 16;
  const startX = opts.startX;
  const pageBottom = opts.pageBottom;
  const topMargin = opts.pageHeight ? opts.pageHeight - pageBottom : 50;
  const theme = opts.theme;
  const totalWidth = colWidths.reduce((s, w) => s + w, 0);
  const dashed = opts.dashed ?? false;

  const drawHeaderAt = (yy: number) => {
    doc
      .fillColor(theme.tableHeaderBg)
      .rect(startX, yy, totalWidth, rowHeight)
      .fill();
    if (dashed) {
      doc
        .strokeColor(theme.border)
        .lineWidth(1)
        .dash(2, { space: 2 })
        .rect(startX, yy, totalWidth, rowHeight)
        .stroke()
        .undash();
    }
    let x = startX;
    doc
      .font(opts.fontBold)
      .fontSize(headerFontSize)
      .fillColor(theme.tableHeaderText);
    for (let i = 0; i < headers.length; i++) {
      doc.text(headers[i] ?? "", x + 4, yy + 3, {
        width: (colWidths[i] ?? 60) - 8,
        align: "left",
      });
      x += colWidths[i] ?? 0;
    }
  };

  let y = doc.y;
  drawHeaderAt(y);
  y += rowHeight;

  doc.font(opts.fontFamily).fontSize(fontSize);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r] ?? [];
    // Page break
    if (y + rowHeight > pageBottom) {
      doc.addPage();
      y = topMargin;
      drawHeaderAt(y);
      y += rowHeight;
      doc.font(opts.fontFamily).fontSize(fontSize);
    }
    // Zebra striping
    if (r % 2 === 1) {
      doc
        .fillColor(theme.tableStripe)
        .rect(startX, y, totalWidth, rowHeight)
        .fill();
    }
    let cx = startX;
    doc.fillColor(theme.text);
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

  // Receipt-style: dashed bottom border
  if (dashed) {
    doc
      .strokeColor(theme.border)
      .lineWidth(1)
      .dash(2, { space: 2 })
      .moveTo(startX, y)
      .lineTo(startX + totalWidth, y)
      .stroke()
      .undash();
  }

  doc.y = y + 4;
  doc.fillColor(theme.text).font(opts.fontFamily);
}
