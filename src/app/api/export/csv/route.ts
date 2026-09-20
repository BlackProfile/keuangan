import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildWhereClause,
  resolveFields,
  FIELD_LABELS,
} from "@/lib/export-helpers";
import { parseDateLocal, formatDate } from "@/lib/format";
import type { ExportScope } from "@/lib/types";

// POST /api/export/csv
// Body: { scope, fields?, options? }
// Returns a CSV file with UTF-8 BOM (so Excel reads UTF-8 correctly).
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { scope, fields, options } = body as {
      scope?: ExportScope | string;
      fields?: string[] | null;
      options?: { includeHidden?: boolean } | null;
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

    const resolvedFields = resolveFields(fields);
    const headerLabels = resolvedFields.map((f) => FIELD_LABELS[f] ?? f);

    const escapeCsv = (val: string | number | null | undefined) => {
      const s = val === null || val === undefined ? "" : String(val);
      if (/[",\n\r]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const headerLine = headerLabels.map(escapeCsv).join(",");
    const lines = [headerLine];

    for (const t of transactions) {
      const row = resolvedFields
        .map((f) => escapeCsv(getFieldValue(t as TxRow, f)))
        .join(",");
      lines.push(row);
    }

    const csv = lines.join("\r\n");
    // Prepend UTF-8 BOM so Excel reads UTF-8 correctly
    const csvWithBom = "\uFEFF" + csv;

    const dateStr = new Date().toISOString().split("T")[0] ?? "";
    const filename = `dompetku-transaksi-${dateStr}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(Buffer.byteLength(csvWithBom, "utf-8")),
      },
    });
  } catch (err) {
    console.error("[POST /api/export/csv]", err);
    return NextResponse.json({ error: "Gagal membuat CSV." }, { status: 500 });
  }
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
      return String(t.amount);
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
      return t.originalAmount != null ? String(t.originalAmount) : "";
    case "exchangeRate":
      return t.exchangeRate != null ? String(t.exchangeRate) : "";
    case "cashbackAmount":
      return t.cashbackAmount != null ? String(t.cashbackAmount) : "";
    case "originalPrice":
      return t.originalPrice != null ? String(t.originalPrice) : "";
    case "discountAmount":
      return t.discountAmount != null ? String(t.discountAmount) : "";
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
