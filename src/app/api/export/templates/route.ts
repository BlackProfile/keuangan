import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeExportTemplate } from "@/lib/export-helpers";
import type { ExportReportType, ExportTemplateInput } from "@/lib/types";

const VALID_FORMATS = ["PDF", "EXCEL", "CSV", "JSON", "IMAGE"] as const;
const VALID_REPORT_TYPES = [
  "TRANSACTIONS",
  "MONTHLY",
  "YEARLY",
  "TAX",
  "BUDGET",
  "GOALS",
  "DEBTS",
  "ACCOUNT",
  "GROUP",
  "CASHFLOW",
  "NETWORTH",
  "SLIP",
] as const;

// GET /api/export/templates — list templates (presets first)
export async function GET() {
  try {
    const rows = await db.exportTemplate.findMany({
      orderBy: [
        { isPreset: "desc" },
        { createdAt: "desc" },
      ],
    });
    const templates = rows.map(serializeExportTemplate);
    return NextResponse.json(templates);
  } catch (err) {
    console.error("[GET /api/export/templates]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar template ekspor." },
      { status: 500 }
    );
  }
}

// POST /api/export/templates — create a new user template
// Body: ExportTemplateInput { name, format, reportType, scope?, fields?, options? }
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) ?? {};
    const { name, format, reportType, scope, fields, options } =
      body as ExportTemplateInput;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama template wajib diisi." },
        { status: 400 }
      );
    }
    if (!format || !(VALID_FORMATS as readonly string[]).includes(format)) {
      return NextResponse.json(
        { error: `Format tidak valid. Pilihan: ${VALID_FORMATS.join(", ")}.` },
        { status: 400 }
      );
    }
    if (
      !reportType ||
      !(VALID_REPORT_TYPES as readonly string[]).includes(reportType)
    ) {
      return NextResponse.json(
        {
          error: `Tipe laporan tidak valid. Pilihan: ${VALID_REPORT_TYPES.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const created = await db.exportTemplate.create({
      data: {
        name: name.trim(),
        format,
        reportType: reportType as ExportReportType,
        scope: scope ? JSON.stringify(scope) : null,
        fields:
          fields && Array.isArray(fields) ? JSON.stringify(fields) : null,
        options: options ? JSON.stringify(options) : null,
        isPreset: false,
      },
    });

    return NextResponse.json(serializeExportTemplate(created), {
      status: 201,
    });
  } catch (err) {
    console.error("[POST /api/export/templates]", err);
    return NextResponse.json(
      { error: "Gagal membuat template ekspor." },
      { status: 500 }
    );
  }
}
