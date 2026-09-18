import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/export/transactions?type=...&from=...&to=...
// Returns a CSV file download.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? undefined;
    const from = searchParams.get("from") ?? undefined;
    const to = searchParams.get("to") ?? undefined;

    const where: Record<string, unknown> = {};
    if (type && type !== "ALL") where.type = type;
    if (from || to) {
      const dateFilter: Record<string, Date> = {};
      if (from) dateFilter.gte = parseDateLocal(from);
      if (to) {
        const t = parseDateLocal(to);
        t.setHours(23, 59, 59, 999);
        dateFilter.lte = t;
      }
      where.date = dateFilter;
    }

    const transactions = await db.transaction.findMany({
      where,
      include: { category: true },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    // Build CSV
    const headers = [
      "Tanggal",
      "Tipe",
      "Kategori",
      "Keterangan",
      "Jumlah",
      "Catatan",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      const s = val === null || val === undefined ? "" : String(val);
      if (/[",\n]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    const rows = transactions.map((t) => {
      const d = parseDateLocal(t.date);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return [
        `${y}-${m}-${day}`,
        t.type === "INCOME" ? "Pemasukan" : "Pengeluaran",
        t.category?.name ?? "",
        t.description,
        String(t.amount),
        t.note ?? "",
      ]
        .map(escapeCsv)
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\r\n");

    // Prepend BOM so Excel reads UTF-8 correctly
    const csvWithBom = "\uFEFF" + csv;

    const filename = `transaksi-dompetku-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/export/transactions]", err);
    return NextResponse.json(
      { error: "Gagal mengekspor transaksi." },
      { status: 500 }
    );
  }
}
