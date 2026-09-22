import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/auto-rules/[id] — toggle active or update fields
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { field, operator, value, action, targetId, active } = body ?? {};

    const existing = await db.autoRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Aturan tidak ditemukan." },
        { status: 404 }
      );
    }

    const data: Record<string, unknown> = {};
    if (typeof active === "boolean") data.active = active;
    if (typeof field === "string") {
      if (!["merchant", "description", "note"].includes(field)) {
        return NextResponse.json(
          { error: "Field tidak valid." },
          { status: 400 }
        );
      }
      data.field = field;
    }
    if (typeof operator === "string") {
      if (!["contains", "equals", "startsWith"].includes(operator)) {
        return NextResponse.json(
          { error: "Operator tidak valid." },
          { status: 400 }
        );
      }
      data.operator = operator;
    }
    if (typeof value === "string" && value.trim()) {
      data.value = value.trim();
    }
    if (typeof action === "string") {
      if (!["categorize", "tag", "account"].includes(action)) {
        return NextResponse.json(
          { error: "Aksi tidak valid." },
          { status: 400 }
        );
      }
      data.action = action;
    }
    if (targetId !== undefined) {
      data.targetId = targetId || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "Tidak ada perubahan untuk diperbarui." },
        { status: 400 }
      );
    }

    const updated = await db.autoRule.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PATCH /api/auto-rules/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui aturan." },
      { status: 500 }
    );
  }
}

// DELETE /api/auto-rules/[id] — delete a rule
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.autoRule.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Aturan tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.autoRule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/auto-rules/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus aturan." },
      { status: 500 }
    );
  }
}
