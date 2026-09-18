import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { computeNextDate, parseDateLocal } from "@/lib/format";
import type { Frequency, TransactionType } from "@/lib/types";

const VALID_FREQUENCIES: Frequency[] = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"];

// PUT /api/recurring/[id] — update fields; if startDate/frequency/interval
// changed, recompute nextDate; if active toggled true, recompute nextDate from
// now if past
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      type,
      amount,
      description,
      categoryId,
      accountId,
      frequency,
      interval,
      startDate,
      endDate,
      note,
      active,
    } = body ?? {};

    const existing = await db.recurringTransaction.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi berulang tidak ditemukan." },
        { status: 404 }
      );
    }

    // Validate mutable fields if provided
    if (type !== undefined && type !== "INCOME" && type !== "EXPENSE") {
      return NextResponse.json(
        { error: "Tipe transaksi tidak valid." },
        { status: 400 }
      );
    }
    if (amount !== undefined) {
      const amt = Number(amount);
      if (!Number.isFinite(amt) || amt <= 0) {
        return NextResponse.json(
          { error: "Jumlah harus berupa angka positif." },
          { status: 400 }
        );
      }
    }
    if (description !== undefined && (!description || !description.trim())) {
      return NextResponse.json(
        { error: "Keterangan tidak boleh kosong." },
        { status: 400 }
      );
    }
    if (
      frequency !== undefined &&
      !VALID_FREQUENCIES.includes(frequency as Frequency)
    ) {
      return NextResponse.json(
        { error: "Frekuensi tidak valid." },
        { status: 400 }
      );
    }
    if (interval !== undefined) {
      const iv = Number(interval);
      if (!Number.isFinite(iv) || iv <= 0) {
        return NextResponse.json(
          { error: "Interval harus berupa angka positif." },
          { status: 400 }
        );
      }
    }

    const newCategoryId = categoryId ?? existing.categoryId;
    if (categoryId) {
      const category = await db.category.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Kategori tidak ditemukan." },
          { status: 404 }
        );
      }
      const effectiveType = (type as TransactionType) ?? (existing.type as TransactionType);
      if (category.type !== effectiveType) {
        return NextResponse.json(
          {
            error: `Kategori "${category.name}" tidak cocok untuk tipe transaksi ${effectiveType}.`,
          },
          { status: 400 }
        );
      }
    }

    if (accountId !== undefined && accountId) {
      const account = await db.account.findUnique({ where: { id: accountId } });
      if (!account) {
        return NextResponse.json(
          { error: "Akun tidak ditemukan." },
          { status: 404 }
        );
      }
    }

    // Compute nextDate if schedule fields changed or active toggled on
    const newFrequency = (frequency as Frequency) ?? (existing.frequency as Frequency);
    const newInterval =
      interval !== undefined ? Math.floor(Number(interval)) : existing.interval;
    const newStartDate = startDate
      ? parseDateLocal(startDate)
      : existing.startDate;

    let nextDate = existing.nextDate;

    const scheduleChanged =
      (frequency !== undefined && frequency !== existing.frequency) ||
      (interval !== undefined && Math.floor(Number(interval)) !== existing.interval) ||
      (startDate !== undefined &&
        parseDateLocal(startDate).getTime() !==
          existing.startDate.getTime());

    if (scheduleChanged) {
      nextDate = computeNextDate(newStartDate, newFrequency, newInterval);
    }

    // If active toggled from false -> true and nextDate is in the past,
    // recompute from now.
    const wasInactive = existing.active === false;
    const willBeActive = active !== undefined ? Boolean(active) : existing.active;
    if (wasInactive && willBeActive) {
      const now = new Date();
      if (nextDate.getTime() < now.getTime()) {
        // Recompute next date from now
        nextDate = computeNextDate(now, newFrequency, newInterval);
      }
    }

    const updated = await db.recurringTransaction.update({
      where: { id },
      data: {
        ...(type !== undefined ? { type: type as TransactionType } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(description !== undefined
          ? { description: description.trim() }
          : {}),
        ...(categoryId !== undefined ? { categoryId: newCategoryId } : {}),
        ...(accountId !== undefined
          ? { accountId: accountId || null }
          : {}),
        ...(frequency !== undefined ? { frequency: newFrequency } : {}),
        ...(interval !== undefined ? { interval: newInterval } : {}),
        ...(startDate !== undefined ? { startDate: newStartDate } : {}),
        ...(endDate !== undefined
          ? { endDate: endDate ? parseDateLocal(endDate) : null }
          : {}),
        ...(note !== undefined ? { note: note?.trim() || null } : {}),
        ...(active !== undefined ? { active: willBeActive } : {}),
        nextDate,
      },
      include: { category: true, account: true },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[PUT /api/recurring/[id]]", err);
    return NextResponse.json(
      { error: "Gagal memperbarui transaksi berulang." },
      { status: 500 }
    );
  }
}

// DELETE /api/recurring/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await db.recurringTransaction.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Transaksi berulang tidak ditemukan." },
        { status: 404 }
      );
    }
    await db.recurringTransaction.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/recurring/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus transaksi berulang." },
      { status: 500 }
    );
  }
}
