import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { formatCurrency } from "@/lib/format";
import type { DailyAllowanceInfo } from "@/lib/types";

// GET /api/student-profile/daily — compute daily allowance insights for the
// current month based on StudentProfile + actual EXPENSE transactions.
export async function GET() {
  try {
    const profile = await db.studentProfile.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const monthlyAllowance = profile?.monthlyAllowance ?? 0;

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-based
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dayOfMonth = Math.min(now.getDate(), daysInMonth);
    const daysRemaining = Math.max(daysInMonth - dayOfMonth, 0);

    // Fetch this month's expenses (exclude hidden transactions)
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const expenses = await db.transaction.findMany({
      where: {
        type: "EXPENSE",
        date: { gte: monthStart, lte: monthEnd },
        isHidden: false,
      },
      select: { amount: true },
    });

    const spentThisMonth = expenses.reduce((sum, t) => sum + t.amount, 0);
    const remainingThisMonth = Math.max(monthlyAllowance - spentThisMonth, 0);

    const dailyAllowance =
      daysInMonth > 0 ? monthlyAllowance / daysInMonth : 0;
    const safeDayOfMonth = dayOfMonth > 0 ? dayOfMonth : 1;
    const dailySpent = spentThisMonth / safeDayOfMonth;
    const dailyRemaining = dailyAllowance - dailySpent;

    // Projection: if user keeps spending at current pace, when does money run out?
    let willRunOutDay: number | null = null;
    let surplusOrDeficit = 0;
    let dailyCutNeeded: number | null = null;
    let message = "";

    if (monthlyAllowance <= 0) {
      message =
        "Belum ada uang saku bulanan yang diatur. Yuk atur di profil mahasiswa!";
    } else if (dailySpent <= 0) {
      surplusOrDeficit = monthlyAllowance - spentThisMonth;
      message = "Belum ada pengeluaran bulan ini. Pertahankan ya!";
    } else if (dailySpent > dailyAllowance && daysRemaining > 0) {
      // Spending faster than allowed — project when money runs out
      if (dailySpent > 0) {
        const daysUntilOut = remainingThisMonth / dailySpent;
        willRunOutDay = Math.min(
          dayOfMonth + Math.floor(daysUntilOut),
          daysInMonth
        );
      }
      // Surplus/deficit at end of month if pace continues
      const projectedSpend = dailySpent * daysInMonth;
      surplusOrDeficit = monthlyAllowance - projectedSpend;
      const deficit = Math.max(dailySpent * daysRemaining - remainingThisMonth, 0);
      dailyCutNeeded = daysRemaining > 0 ? deficit / daysRemaining : 0;

      if (willRunOutDay && willRunOutDay <= daysInMonth) {
        message = `Hati-hati, uang saku habis tanggal ${willRunOutDay}. Kurangi ${formatCurrency(
          Math.max(dailyCutNeeded ?? 0, 0)
        )}/hari.`;
      } else {
        message = `Pengeluaran harianmu melebihi budget. Kurangi ${formatCurrency(
          Math.max(dailyCutNeeded ?? 0, 0)
        )}/hari supaya aman.`;
      }
    } else {
      // On track or below budget
      const projectedSpend = dailySpent * daysInMonth;
      surplusOrDeficit = monthlyAllowance - projectedSpend;
      if (surplusOrDeficit > 0) {
        message = `Uang saku aman sampai akhir bulan! Sisa perkiraan ${formatCurrency(
          surplusOrDeficit
        )}.`;
      } else {
        message = "Uang saku aman sampai akhir bulan!";
      }
    }

    const info: DailyAllowanceInfo = {
      monthlyAllowance,
      dayOfMonth,
      daysInMonth,
      daysRemaining,
      spentThisMonth,
      remainingThisMonth,
      dailyAllowance,
      dailyRemaining,
      dailySpent,
      projection: {
        willRunOutDay,
        surplusOrDeficit,
        dailyCutNeeded,
        message,
      },
    };

    return NextResponse.json(info);
  } catch (err) {
    console.error("[GET /api/student-profile/daily]", err);
    return NextResponse.json(
      { error: "Gagal menghitung info uang saku harian." },
      { status: 500 }
    );
  }
}
