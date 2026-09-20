import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/challenges/join — join a challenge (create ACTIVE participation)
// Body: { challengeId: string }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { challengeId } = body ?? {};

    if (!challengeId || typeof challengeId !== "string") {
      return NextResponse.json(
        { error: "ID tantangan wajib diisi." },
        { status: 400 }
      );
    }

    const challenge = await db.challenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) {
      return NextResponse.json(
        { error: "Tantangan tidak ditemukan." },
        { status: 404 }
      );
    }
    if (!challenge.active) {
      return NextResponse.json(
        { error: "Tantangan ini tidak aktif." },
        { status: 400 }
      );
    }

    // Avoid duplicate ACTIVE participation for the same challenge
    const existing = await db.challengeParticipation.findFirst({
      where: { challengeId, status: "ACTIVE" },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Kamu sudah mengikuti tantangan ini." },
        { status: 409 }
      );
    }

    const participation = await db.challengeParticipation.create({
      data: {
        challengeId,
        status: "ACTIVE",
        progress: 0,
        currentAmount: 0,
        xpEarned: 0,
      },
      include: { challenge: true },
    });

    return NextResponse.json(participation, { status: 201 });
  } catch (err) {
    console.error("[POST /api/challenges/join]", err);
    return NextResponse.json(
      { error: "Gagal mengikuti tantangan." },
      { status: 500 }
    );
  }
}
