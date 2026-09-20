import { parseDateLocal } from "@/lib/format";
import type { ExportScope, ExportTemplate } from "@/lib/types";

/**
 * Build a Prisma `where` clause from an ExportScope.
 *
 * Supported scope types:
 *   ALL         — no extra filter
 *   ACCOUNT     — accountId (exact)
 *   CATEGORY    — categoryId (exact)
 *   GROUP       — groupId (exact)
 *   TAG         — tags contains tag (single or array via txIds fallback)
 *   DATE_RANGE  — from / to (inclusive end-of-day)
 *   CUSTOM      — txIds (id IN [..])
 *
 * `includeHidden` controls whether isHidden=true transactions are included
 * (default false → excluded from export).
 */
export function buildWhereClause(
  scope: ExportScope | string | null | undefined
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    status: { not: "DRAFT" },
  };

  if (!scope) {
    where.isHidden = false;
    return where;
  }

  // Allow scope to be passed as JSON string
  let s: ExportScope;
  if (typeof scope === "string") {
    try {
      s = JSON.parse(scope) as ExportScope;
    } catch {
      s = { type: "ALL" };
    }
  } else {
    s = scope;
  }

  // includeHidden defaults to false → hidden txs excluded
  const includeHidden = s.includeHidden ?? false;
  if (!includeHidden) {
    where.isHidden = false;
  }

  switch (s.type) {
    case "ALL":
      break;
    case "ACCOUNT":
      if (s.accountId) where.accountId = s.accountId;
      break;
    case "CATEGORY":
      if (s.categoryId) where.categoryId = s.categoryId;
      break;
    case "GROUP":
      if (s.groupId) where.groupId = s.groupId;
      break;
    case "TAG": {
      const tag = s.tag;
      if (tag) {
        where.tags = { contains: tag };
      }
      break;
    }
    case "DATE_RANGE": {
      const dateFilter: Record<string, Date> = {};
      if (s.from) dateFilter.gte = parseDateLocal(s.from);
      if (s.to) {
        const t = parseDateLocal(s.to);
        t.setHours(23, 59, 59, 999);
        dateFilter.lte = t;
      }
      if (dateFilter.gte || dateFilter.lte) where.date = dateFilter;
      break;
    }
    case "CUSTOM": {
      if (Array.isArray(s.txIds) && s.txIds.length > 0) {
        where.id = { in: s.txIds };
      } else {
        // Empty custom selection — no transactions match
        where.id = { in: [] };
      }
      break;
    }
    default:
      // Treat unknown as ALL
      break;
  }

  return where;
}

/**
 * Serialize a Prisma ExportTemplate row to the ExportTemplate API shape.
 * scope/fields/options are stored as JSON strings in the DB.
 */
export function serializeExportTemplate(
  row: {
    id: string;
    name: string;
    format: string;
    reportType: string;
    scope: string | null;
    fields: string | null;
    options: string | null;
    isPreset: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
): ExportTemplate {
  let scope: ExportScope | null = null;
  if (row.scope) {
    try {
      scope = JSON.parse(row.scope) as ExportScope;
    } catch {
      scope = null;
    }
  }
  let fields: string[] | null = null;
  if (row.fields) {
    try {
      const parsed = JSON.parse(row.fields);
      if (Array.isArray(parsed)) fields = parsed as string[];
    } catch {
      fields = null;
    }
  }
  let options: ExportTemplate["options"] = null;
  if (row.options) {
    try {
      options = JSON.parse(row.options);
    } catch {
      options = null;
    }
  }
  return {
    id: row.id,
    name: row.name,
    format: row.format as ExportTemplate["format"],
    reportType: row.reportType as ExportTemplate["reportType"],
    scope,
    fields,
    options,
    isPreset: row.isPreset,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Default field list used when caller doesn't specify fields. */
export const DEFAULT_EXPORT_FIELDS = [
  "date",
  "type",
  "category",
  "description",
  "amount",
  "note",
  "account",
  "merchant",
  "tags",
];

/** Human-readable Indonesian labels for exportable fields. */
export const FIELD_LABELS: Record<string, string> = {
  date: "Tanggal",
  type: "Tipe",
  category: "Kategori",
  description: "Keterangan",
  amount: "Jumlah",
  note: "Catatan",
  account: "Akun",
  merchant: "Merchant",
  tags: "Tag",
  time: "Waktu",
  mood: "Suasana Hati",
  priority: "Prioritas",
  paymentStatus: "Status Pembayaran",
  paymentMethod: "Metode Bayar",
  recipient: "Penerima",
  currency: "Mata Uang",
  originalAmount: "Jumlah Asli",
  exchangeRate: "Kurs",
  cashbackAmount: "Cashback",
  originalPrice: "Harga Asli",
  discountAmount: "Diskon",
  creditor: "Kreditur",
  status: "Status",
  isReimbursable: "Reimburse",
  isSubscription: "Langganan",
  isTaxDeductible: "Deductible Pajak",
  isBusinessExpense: "Biaya Bisnis",
  linkUrl: "Tautan",
};

/** Resolve `fields` argument — default to DEFAULT_EXPORT_FIELDS if missing/empty. */
export function resolveFields(fields?: string[] | null): string[] {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return DEFAULT_EXPORT_FIELDS;
  }
  return fields;
}

/** Compute estimated file size label based on transaction count. */
export function estimateSize(count: number): string {
  if (count <= 50) return "~50KB";
  if (count <= 500) return "~200KB";
  return "~1MB";
}
