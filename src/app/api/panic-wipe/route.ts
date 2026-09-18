import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/panic-wipe
// IRREVERSIBLE. Wipes ALL data in the database.
// Logs an AuditLog entry with action "PANIC_WIPE" BEFORE wiping (so the log
// is created and survives momentarily until the deleteMany inside the
// transaction wipes AuditLog too).
export async function POST() {
  try {
    // Step 1: Log BEFORE wiping.
    await db.auditLog.create({
      data: {
        action: "PANIC_WIPE",
        detail: "Penghapusan permanen seluruh data dimulai.",
        success: true,
      },
    });

    // Step 2: Wipe everything in a single transaction.
    // Order is defensive: child / dependent tables first, then parents,
    // then security/audit/trusted/biometric/settings.
    await db.$transaction([
      db.receiptItem.deleteMany(),
      db.transactionSplit.deleteMany(),
      db.transaction.deleteMany(),
      db.transactionGroup.deleteMany(),
      db.installment.deleteMany(),
      db.debt.deleteMany(),
      db.transactionTemplate.deleteMany(),
      db.budget.deleteMany(),
      db.goal.deleteMany(),
      db.recurringTransaction.deleteMany(),
      db.tag.deleteMany(),
      db.transfer.deleteMany(),
      db.account.deleteMany(),
      db.category.deleteMany(),
      db.securitySetting.deleteMany(),
      db.auditLog.deleteMany(),
      db.trustedDevice.deleteMany(),
      db.biometricCredential.deleteMany(),
      db.setting.deleteMany(),
    ]);

    return NextResponse.json({
      message: "Semua data telah dihapus permanen",
      wipedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/panic-wipe]", err);
    return NextResponse.json(
      { error: "Gagal melakukan panic wipe." },
      { status: 500 }
    );
  }
}
