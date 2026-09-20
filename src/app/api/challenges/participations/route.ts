import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/challenges/participations — list all participations with challenge
export async function GET() {
  try {
    const participations = await db.challengeParticipation.findMany({
      include: { challenge: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(participations);
  } catch (err) {
    console.error("[GET /api/challenges/participations]", err);
    return NextResponse.json(
      { error: "Gagal memuat partisipasi tantangan." },
      { status: 500 }
    );
  }
}
