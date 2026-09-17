import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/categories?type=INCOME
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? undefined;

    const where: Record<string, unknown> = {};
    if (type && type !== "ALL") where.type = type;

    const categories = await db.category.findMany({
      where,
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });

    return NextResponse.json(categories);
  } catch (err) {
    console.error("[GET /api/categories]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar kategori." },
      { status: 500 }
    );
  }
}

// POST /api/categories
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, icon, color } = body ?? {};

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Nama kategori wajib diisi." },
        { status: 400 }
      );
    }
    if (!type || (type !== "INCOME" && type !== "EXPENSE")) {
      return NextResponse.json(
        { error: "Tipe kategori tidak valid." },
        { status: 400 }
      );
    }

    const category = await db.category.create({
      data: {
        name: name.trim(),
        type,
        icon: icon || (type === "INCOME" ? "PlusCircle" : "MinusCircle"),
        color: color || "#10b981",
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (err) {
    console.error("[POST /api/categories]", err);
    return NextResponse.json(
      { error: "Gagal menambah kategori." },
      { status: 500 }
    );
  }
}
