import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/saved-searches — list all saved searches
export async function GET() {
  try {
    const list = await db.savedSearch.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(list);
  } catch (err) {
    console.error("[GET /api/saved-searches]", err);
    return NextResponse.json(
      { error: "Gagal memuat pencarian tersimpan." },
      { status: 500 }
    );
  }
}

// POST /api/saved-searches — save current search query/filters
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name: string = (body?.name ?? "").toString().trim();
    const filters: string =
      typeof body?.filters === "string"
        ? body.filters
        : JSON.stringify(body?.filters ?? {});

    if (!name) {
      return NextResponse.json(
        { error: "Nama pencarian wajib diisi." },
        { status: 400 }
      );
    }
    const created = await db.savedSearch.create({
      data: { name, filters },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("[POST /api/saved-searches]", err);
    return NextResponse.json(
      { error: "Gagal menyimpan pencarian." },
      { status: 500 }
    );
  }
}
