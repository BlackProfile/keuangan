import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseDateLocal } from "@/lib/format";
import type { SplitBillInput } from "@/lib/types";

const VALID_SPLIT_TYPES = ["EQUAL", "CUSTOM", "PERCENTAGE"];
const VALID_CATEGORIES = ["MAKAN", "KOS", "EVENT", "TRANSPORT", "OTHER"];

// GET /api/split-bills — list with participants, ordered by date desc,
// unsettled bills first.
export async function GET() {
  try {
    const bills = await db.splitBill.findMany({
      include: { participants: true },
      orderBy: [{ settled: "asc" }, { date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(bills);
  } catch (err) {
    console.error("[GET /api/split-bills]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar split bill." },
      { status: 500 }
    );
  }
}

// POST /api/split-bills — create a split bill with participants
// Body: { title, totalAmount, paidBy, splitType?, category?, date?, participants[{name, share}] }
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SplitBillInput & {
      date?: string;
      icon?: string;
      color?: string;
      description?: string;
      note?: string;
    };

    const {
      title,
      totalAmount,
      paidBy,
      splitType,
      category,
      participants,
      date,
      icon,
      color,
      description,
      note,
    } = body ?? {};

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Judul wajib diisi." },
        { status: 400 }
      );
    }
    const total = Number(totalAmount);
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        { error: "Total pembayaran tidak valid." },
        { status: 400 }
      );
    }
    if (!paidBy || !paidBy.trim()) {
      return NextResponse.json(
        { error: "Nama pembayar wajib diisi." },
        { status: 400 }
      );
    }
    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "Minimal 1 peserta diperlukan." },
        { status: 400 }
      );
    }

    const sType = VALID_SPLIT_TYPES.includes(splitType ?? "")
      ? (splitType as string)
      : "EQUAL";
    const cat = VALID_CATEGORIES.includes(category ?? "")
      ? (category as string)
      : "MAKAN";

    // Compute shares: EQUAL -> total / participants.length
    const rawParticipants = participants.map((p) => ({
      name: String(p.name ?? "").trim(),
      share: Number(p.share ?? 0),
    }));
    const invalidName = rawParticipants.find((p) => !p.name);
    if (invalidName) {
      return NextResponse.json(
        { error: "Nama peserta tidak boleh kosong." },
        { status: 400 }
      );
    }

    let finalParticipants: Array<{ name: string; share: number }>;
    if (sType === "EQUAL") {
      const perPerson = total / rawParticipants.length;
      finalParticipants = rawParticipants.map((p) => ({
        name: p.name,
        share: perPerson,
      }));
    } else {
      finalParticipants = rawParticipants;
    }

    const billDate = date ? parseDateLocal(date) : new Date();

    const bill = await db.splitBill.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        totalAmount: total,
        paidBy: paidBy.trim(),
        splitType: sType,
        category: cat,
        date: billDate,
        settled: false,
        icon: icon ?? "UtensilsCrossed",
        color: color ?? "#f97316",
        note: note?.trim() || null,
        participants: {
          create: finalParticipants.map((p) => ({
            name: p.name,
            share: p.share,
            paid: false,
          })),
        },
      },
      include: { participants: true },
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (err) {
    console.error("[POST /api/split-bills]", err);
    return NextResponse.json(
      { error: "Gagal membuat split bill." },
      { status: 500 }
    );
  }
}
