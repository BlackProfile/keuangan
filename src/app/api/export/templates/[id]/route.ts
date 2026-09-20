import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeExportTemplate } from "@/lib/export-helpers";
import type {
  ExportReportType,
  ExportTemplateInput,
} from "@/lib/types";

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

// PUT /api/export/templates/[id] — update a user template
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.exportTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Template tidak ditemukan." },
        { status: 404 }
      );
    }
    if (existing.isPreset) {
      return NextResponse.json(
        { error: "Template bawaan tidak dapat diubah." },
        { status: 403 }
      );
    }

    const body = (await req.json().catch(() => null)) ?? {};
    const { name, format, reportType, scope, fields, options } =
      body as Partial<ExportTemplateInput>;

    const data: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) {
      data.name = name.trim();
    }
    if (format) {
      if (!(VALID_FORMATS as readonly string[]).includes(format)) {
        return NextResponse.json(
          {
            error: `Format tidak valid. Pilihan: ${VALID_FORMATS.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      data.format = format;
    }
    if (reportType) {
      if (
        !(VALID_REPORT_TYPES as readonly string[]).includes(reportType)
      ) {
        return NextResponse.json(
          {
            error: `Tipe laporan tidak valid. Pilihan: ${VALID_REPORT_TYPES.join(", ")}.`,
          },
          { status: 400 }
        );
      }
      data.reportType = reportType as ExportReportType;
    }
    if (scope !== undefined) {
      data.scope = scope ? JSON.stringify(scope) : null;
    }
    if (fields !== undefined) {
      data.fields =
        fields && Array.isArray(fields) ? JSON.stringify(fields) : null;
    }
    if (options !== undefined) {
      data.options = options ? JSON.stringify(options) : null;
    }

    const updated = await db.exportTemplate.update({
      where: { id },
      data,
    });

    return NextResponse.json(serializeExportTemplate(updated));
  } catch (err) {
    console.error("[PUT /api/export/templates/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui template ekspor." },
      { status: 500 }
    );
  }
}

// DELETE /api/export/templates/[id] — delete a user template (presets protected)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.exportTemplate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Template tidak ditemukan." },
        { status: 404 }
      );
    }
    if (existing.isPreset) {
      return NextResponse.json(
        { error: "Template bawaan tidak dapat dihapus." },
        { status: 403 }
      );
    }

    await db.exportTemplate.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/export/templates/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus template ekspor." },
      { status: 500 }
    );
  }
}
