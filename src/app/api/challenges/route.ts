import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_CHALLENGES } from "@/lib/student-constants";

// GET /api/challenges — list all active challenges (seed defaults if empty)
// Includes participations for the current user (single-user app: all participations).
export async function GET() {
  try {
    let count = await db.challenge.count();
    if (count === 0) {
      // Seed default challenges
      await db.challenge.createMany({
        data: DEFAULT_CHALLENGES.map((c) => ({
          name: c.name,
          description: c.description,
          type: c.type,
          targetAmount: c.targetAmount ?? null,
          targetDays: c.targetDays ?? null,
          icon: c.icon,
          color: c.color,
          reward: c.reward ?? null,
          xpReward: c.xpReward,
          active: true,
        })),
      });
    }

    const challenges = await db.challenge.findMany({
      where: { active: true },
      include: {
        participations: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(challenges);
  } catch (err) {
    console.error("[GET /api/challenges]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar tantangan." },
      { status: 500 }
    );
  }
}
