import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";

// GET /api/price-tracks — list, grouped by itemName with average price
export async function GET() {
  try {
    const tracks = await db.priceTrack.findMany({
      orderBy: { date: "desc" },
    });

    // Group by itemName, compute average price, latest price, count, and merchants
    const groupsMap = new Map<
      string,
      {
        itemName: string;
        count: number;
        totalAmount: number;
        latestPrice: number;
        latestDate: Date;
        minPrice: number;
        maxPrice: number;
        merchants: string[];
        entries: typeof tracks;
      }
    >();

    for (const t of tracks) {
      const key = t.itemName;
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          itemName: key,
          count: 0,
          totalAmount: 0,
          latestPrice: t.price,
          latestDate: t.date,
          minPrice: t.price,
          maxPrice: t.price,
          merchants: [],
          entries: [],
        });
      }
      const g = groupsMap.get(key)!;
      g.count += 1;
      g.totalAmount += t.price;
      if (t.date.getTime() >= g.latestDate.getTime()) {
        g.latestPrice = t.price;
        g.latestDate = t.date;
      }
      if (t.price < g.minPrice) g.minPrice = t.price;
      if (t.price > g.maxPrice) g.maxPrice = t.price;
      if (t.merchant && !g.merchants.includes(t.merchant)) {
        g.merchants.push(t.merchant);
      }
      g.entries.push(t);
    }

    const groups = Array.from(groupsMap.values()).map((g) => ({
      itemName: g.itemName,
      count: g.count,
      avgPrice: g.totalAmount / g.count,
      latestPrice: g.latestPrice,
      latestDate: g.latestDate,
      minPrice: g.minPrice,
      maxPrice: g.maxPrice,
      merchants: g.merchants,
      entries: g.entries,
    }));

    return NextResponse.json({ groups, total: tracks.length });
  } catch (err) {
    console.error("[GET /api/price-tracks]", err);
    return NextResponse.json(
      { error: "Gagal memuat data pelacakan harga." },
      { status: 500 }
    );
  }
}

// POST /api/price-tracks — create price track
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemName, price, merchant, note, date } = body ?? {};

    if (!itemName || !itemName.trim()) {
      return NextResponse.json(
        { error: "Nama barang wajib diisi." },
        { status: 400 }
      );
    }
    const amt = Number(price);
    if (!Number.isFinite(amt) || amt < 0) {
      return NextResponse.json(
        { error: "Harga harus berupa angka yang valid." },
        { status: 400 }
      );
    }

    const track = await db.priceTrack.create({
      data: {
        itemName: itemName.trim(),
        price: amt,
        merchant: merchant?.trim() || null,
        note: note?.trim() || null,
        date: date ? parseDateLocal(date) : new Date(),
      },
    });

    return NextResponse.json(track, { status: 201 });
  } catch (err) {
    console.error("[POST /api/price-tracks]", err);
    return NextResponse.json(
      { error: "Gagal menambah catatan harga." },
      { status: 500 }
    );
  }
}
