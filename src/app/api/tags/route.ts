import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { TAG_COLORS } from "@/lib/constants";
import type { Tag } from "@/lib/types";

/** Stable hash for a tag name → index into the color palette. */
function colorForTag(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  const idx = Math.abs(hash) % TAG_COLORS.length;
  return TAG_COLORS[idx];
}

// GET /api/tags
// Aggregates unique tags from all transactions' tags field (comma-separated)
// plus Tag model records. Returns [{id, name, color}] with stable colors.
export async function GET() {
  try {
    const [transactions, tagRecords] = await Promise.all([
      db.transaction.findMany({ select: { tags: true } }),
      db.tag.findMany(),
    ]);

    // Collect unique tag names from comma-separated tags field
    const nameSet = new Set<string>();
    for (const t of transactions) {
      if (!t.tags) continue;
      for (const part of t.tags.split(",")) {
        const name = part.trim();
        if (name) nameSet.add(name);
      }
    }

    // Map Tag records by name for color override
    const tagByName = new Map<string, (typeof tagRecords)[number]>();
    for (const t of tagRecords) {
      tagByName.set(t.name, t);
      nameSet.add(t.name);
    }

    const result: Tag[] = Array.from(nameSet)
      .sort((a, b) => a.localeCompare(b))
      .map((name) => {
        const record = tagByName.get(name);
        return {
          id: record?.id ?? name,
          name,
          color: record?.color ?? colorForTag(name),
        };
      });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/tags]", err);
    return NextResponse.json(
      { error: "Gagal memuat daftar tag." },
      { status: 500 }
    );
  }
}
