import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  DEFAULT_CATEGORIES,
  DEFAULT_ACCOUNTS,
} from "@/lib/constants";
import { parseDateLocal } from "@/lib/format";

// POST /api/seed - seed default categories, accounts, and sample data
export async function POST() {
  try {
    // 1. Seed default categories if none exist
    let categories = await db.category.findMany();
    if (categories.length === 0) {
      await db.category.createMany({ data: DEFAULT_CATEGORIES });
      categories = await db.category.findMany();
    }
    const incomeCats = categories.filter((c) => c.type === "INCOME");
    const expenseCats = categories.filter((c) => c.type === "EXPENSE");

    // 2. Seed default accounts if none exist
    let accounts = await db.account.findMany();
    if (accounts.length === 0 && DEFAULT_ACCOUNTS.length > 0) {
      await db.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a) => ({
          name: a.name,
          type: a.type,
          icon: a.icon,
          color: a.color,
          balance: a.balance ?? 0,
          isDefault: a.isDefault ?? false,
          note: a.note ?? null,
        })),
      });
      accounts = await db.account.findMany();
    }

    // Map of account initial balances (for recompute later)
    const accountInitialBalance = new Map<string, number>();
    const accountByName = new Map<string, string>();
    for (const a of accounts) {
      accountByName.set(a.name.toLowerCase(), a.id);
      accountInitialBalance.set(a.id, a.balance);
    }

    const bankAccountId =
      accountByName.get("bank") ?? accounts[0]?.id ?? null;
    const cashAccountId =
      accountByName.get("tunai") ?? accounts[0]?.id ?? null;

    const sampleTransactionsCreated: boolean =
      (await db.transaction.count()) === 0 &&
      incomeCats.length > 0 &&
      expenseCats.length > 0;

    // 3. Seed sample transactions if none exist
    if (sampleTransactionsCreated) {
      const now = new Date();
      const day = (offset: number) => {
        const d = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - offset
        );
        return parseDateLocal(d.toISOString().split("T")[0]!);
      };

      const samples: Array<{
        type: "INCOME" | "EXPENSE";
        amount: number;
        description: string;
        date: Date;
        categoryId: string;
        accountId?: string | null;
        note?: string;
      }> = [
        // This month
        {
          type: "INCOME",
          amount: 8500000,
          description: "Gaji bulanan",
          date: day(2),
          categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id,
          accountId: bankAccountId,
          note: "Transfer bank",
        },
        {
          type: "EXPENSE",
          amount: 45000,
          description: "Makan siang",
          date: day(1),
          categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 25000,
          description: "Kopi pagi",
          date: day(1),
          categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 20000,
          description: "Gojek ke kantor",
          date: day(1),
          categoryId: expenseCats.find((c) => c.name === "Transportasi")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 350000,
          description: "Belanja bulanan Indomaret",
          date: day(3),
          categoryId: expenseCats.find((c) => c.name === "Belanja")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 500000,
          description: "Bayar listrik & air PLN",
          date: day(4),
          categoryId: expenseCats.find((c) => c.name === "Tagihan")?.id ?? expenseCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 150000,
          description: "Nonton bioskop",
          date: day(5),
          categoryId: expenseCats.find((c) => c.name === "Hiburan")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "INCOME",
          amount: 1200000,
          description: "Proyek freelance",
          date: day(6),
          categoryId: incomeCats.find((c) => c.name === "Freelance")?.id ?? incomeCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 75000,
          description: "Vitamin & obat apotek",
          date: day(7),
          categoryId: expenseCats.find((c) => c.name === "Kesehatan")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        // Previous months
        {
          type: "INCOME",
          amount: 8500000,
          description: "Gaji bulanan",
          date: new Date(now.getFullYear(), now.getMonth() - 1, 2),
          categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 3200000,
          description: "Sewa kos",
          date: new Date(now.getFullYear(), now.getMonth() - 1, 3),
          categoryId: expenseCats.find((c) => c.name === "Perumahan")?.id ?? expenseCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 850000,
          description: "Makan bulanan",
          date: new Date(now.getFullYear(), now.getMonth() - 1, 10),
          categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 600000,
          description: "Bensin",
          date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
          categoryId: expenseCats.find((c) => c.name === "Transportasi")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "INCOME",
          amount: 500000,
          description: "Cashback investasi",
          date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
          categoryId: incomeCats.find((c) => c.name === "Investasi")?.id ?? incomeCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "INCOME",
          amount: 8500000,
          description: "Gaji bulanan",
          date: new Date(now.getFullYear(), now.getMonth() - 2, 2),
          categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 3200000,
          description: "Sewa kos",
          date: new Date(now.getFullYear(), now.getMonth() - 2, 3),
          categoryId: expenseCats.find((c) => c.name === "Perumahan")?.id ?? expenseCats[0]!.id,
          accountId: bankAccountId,
        },
        {
          type: "EXPENSE",
          amount: 1200000,
          description: "Belanja baju",
          date: new Date(now.getFullYear(), now.getMonth() - 2, 12),
          categoryId: expenseCats.find((c) => c.name === "Belanja")?.id ?? expenseCats[0]!.id,
          accountId: cashAccountId,
        },
        {
          type: "EXPENSE",
          amount: 400000,
          description: "Langganan internet Indihome",
          date: new Date(now.getFullYear(), now.getMonth() - 2, 18),
          categoryId: expenseCats.find((c) => c.name === "Tagihan")?.id ?? expenseCats[0]!.id,
          accountId: bankAccountId,
        },
      ];

      await db.transaction.createMany({
        data: samples.map((s) => ({
          type: s.type,
          amount: s.amount,
          description: s.description,
          date: s.date,
          categoryId: s.categoryId,
          accountId: s.accountId ?? null,
          note: s.note ?? null,
        })),
      });
    }

    // 4. Recompute account balances from transactions (initial + deltas)
    if (accounts.length > 0) {
      const allTx = await db.transaction.findMany({
        select: { accountId: true, type: true, amount: true },
      });
      const deltas = new Map<string, number>();
      for (const t of allTx) {
        if (!t.accountId) continue;
        const cur = deltas.get(t.accountId) ?? 0;
        const delta = t.type === "INCOME" ? t.amount : -t.amount;
        deltas.set(t.accountId, cur + delta);
      }
      for (const acc of accounts) {
        const initial = accountInitialBalance.get(acc.id) ?? 0;
        const finalBalance = initial + (deltas.get(acc.id) ?? 0);
        if (Math.abs(finalBalance - acc.balance) > 0.01) {
          await db.account.update({
            where: { id: acc.id },
            data: { balance: finalBalance },
          });
        }
      }
    }

    // 5. Seed sample budgets if none exist
    const budgetsCreated =
      (await db.budget.count()) === 0 && expenseCats.length > 0;
    if (budgetsCreated) {
      const makananCat = expenseCats.find((c) => c.name === "Makanan");
      const transportCat = expenseCats.find((c) => c.name === "Transportasi");
      const budgets: Array<{
        categoryId: string;
        amount: number;
        period: "MONTHLY";
      }> = [];
      if (makananCat) {
        budgets.push({ categoryId: makananCat.id, amount: 1500000, period: "MONTHLY" });
      }
      if (transportCat) {
        budgets.push({ categoryId: transportCat.id, amount: 500000, period: "MONTHLY" });
      }
      if (budgets.length > 0) {
        await db.budget.createMany({ data: budgets });
      }
    }

    // 6. Seed sample goals if none exist
    const goalsCreated = (await db.goal.count()) === 0;
    if (goalsCreated) {
      await db.goal.create({
        data: {
          name: "Liburan Bali",
          targetAmount: 10000000,
          currentAmount: 2500000,
          targetDate: new Date(new Date().getFullYear() + 1, 11, 1),
          icon: "Plane",
          color: "#0891b2",
          note: "Tabungan liburan akhir tahun",
          completed: false,
        },
      });
    }

    // 7. Seed sample recurring if none exist
    const recurringCreated =
      (await db.recurringTransaction.count()) === 0 && incomeCats.length > 0;
    if (recurringCreated) {
      const gajiCat = incomeCats.find((c) => c.name === "Gaji");
      if (gajiCat) {
        const startDate = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const nextDate = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          1
        );
        await db.recurringTransaction.create({
          data: {
            type: "INCOME",
            amount: 8500000,
            description: "Gaji bulanan",
            categoryId: gajiCat.id,
            accountId: bankAccountId ?? null,
            frequency: "MONTHLY",
            interval: 1,
            startDate,
            nextDate,
            note: "Gaji otomatis setiap bulan",
            active: true,
          },
        });
      }
    }

    return NextResponse.json({
      message: sampleTransactionsCreated
        ? "Data contoh berhasil ditambahkan."
        : "Kategori berhasil disiapkan.",
      categories: categories.length,
      accounts: accounts.length,
      transactions: sampleTransactionsCreated,
      budgets: budgetsCreated,
      goals: goalsCreated,
      recurring: recurringCreated,
    });
  } catch (err) {
    console.error("[POST /api/seed]", err);
    return NextResponse.json(
      { error: "Gagal menyiapkan data awal." },
      { status: 500 }
    );
  }
}
