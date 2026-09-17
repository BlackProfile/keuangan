import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { parseDateLocal } from "@/lib/format";

// POST /api/seed - seed default categories and sample data
export async function POST() {
  try {
    const existingCategories = await db.category.count();

    // 1. Seed default categories if none exist
    let categories = await db.category.findMany();
    if (categories.length === 0) {
      categories = await db.category.createMany({
        data: DEFAULT_CATEGORIES,
      }).then(() => db.category.findMany());
    }
    const incomeCats = categories.filter((c) => c.type === "INCOME");
    const expenseCats = categories.filter((c) => c.type === "EXPENSE");

    // 2. Seed sample transactions if none exist
    const existingTransactions = await db.transaction.count();
    if (existingTransactions === 0 && incomeCats.length && expenseCats.length) {
      const now = new Date();
      const day = (offset: number) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
        return parseDateLocal(d.toISOString().split("T")[0]!);
      };

      const samples: Array<{
        type: "INCOME" | "EXPENSE";
        amount: number;
        description: string;
        date: Date;
        categoryId: string;
        note?: string;
      }> = [
        // This month
        { type: "INCOME", amount: 8500000, description: "Gaji bulanan", date: day(2), categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id, note: "Transfer bank" },
        { type: "EXPENSE", amount: 45000, description: "Makan siang", date: day(1), categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 25000, description: "Kopi pagi", date: day(1), categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 20000, description: "Gojek ke kantor", date: day(1), categoryId: expenseCats.find((c) => c.name === "Transportasi")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 350000, description: "Belanja bulanan", date: day(3), categoryId: expenseCats.find((c) => c.name === "Belanja")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 500000, description: "Bayar listrik & air", date: day(4), categoryId: expenseCats.find((c) => c.name === "Tagihan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 150000, description: "Nonton bioskop", date: day(5), categoryId: expenseCats.find((c) => c.name === "Hiburan")?.id ?? expenseCats[0]!.id },
        { type: "INCOME", amount: 1200000, description: "Proyek freelance", date: day(6), categoryId: incomeCats.find((c) => c.name === "Freelance")?.id ?? incomeCats[0]!.id },
        { type: "EXPENSE", amount: 75000, description: "Vitamin & obat", date: day(7), categoryId: expenseCats.find((c) => c.name === "Kesehatan")?.id ?? expenseCats[0]!.id },
        // Previous months
        { type: "INCOME", amount: 8500000, description: "Gaji bulanan", date: new Date(now.getFullYear(), now.getMonth() - 1, 2), categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id },
        { type: "EXPENSE", amount: 3200000, description: "Sewa kos", date: new Date(now.getFullYear(), now.getMonth() - 1, 3), categoryId: expenseCats.find((c) => c.name === "Perumahan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 850000, description: "Makan bulanan", date: new Date(now.getFullYear(), now.getMonth() - 1, 10), categoryId: expenseCats.find((c) => c.name === "Makanan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 600000, description: "Bensin", date: new Date(now.getFullYear(), now.getMonth() - 1, 15), categoryId: expenseCats.find((c) => c.name === "Transportasi")?.id ?? expenseCats[0]!.id },
        { type: "INCOME", amount: 500000, description: "Cashback investasi", date: new Date(now.getFullYear(), now.getMonth() - 1, 20), categoryId: incomeCats.find((c) => c.name === "Investasi")?.id ?? incomeCats[0]!.id },
        { type: "INCOME", amount: 8500000, description: "Gaji bulanan", date: new Date(now.getFullYear(), now.getMonth() - 2, 2), categoryId: incomeCats.find((c) => c.name === "Gaji")?.id ?? incomeCats[0]!.id },
        { type: "EXPENSE", amount: 3200000, description: "Sewa kos", date: new Date(now.getFullYear(), now.getMonth() - 2, 3), categoryId: expenseCats.find((c) => c.name === "Perumahan")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 1200000, description: "Belanja baju", date: new Date(now.getFullYear(), now.getMonth() - 2, 12), categoryId: expenseCats.find((c) => c.name === "Belanja")?.id ?? expenseCats[0]!.id },
        { type: "EXPENSE", amount: 400000, description: "Langganan internet", date: new Date(now.getFullYear(), now.getMonth() - 2, 18), categoryId: expenseCats.find((c) => c.name === "Tagihan")?.id ?? expenseCats[0]!.id },
      ];

      await db.transaction.createMany({
        data: samples.map((s) => ({
          ...s,
          note: s.note ?? null,
        })),
      });
    }

    return NextResponse.json({
      message:
        existingTransactions === 0
          ? "Data contoh berhasil ditambahkan."
          : "Kategori berhasil disiapkan.",
      categories: categories.length,
      transactions: existingTransactions === 0 ? true : false,
    });
  } catch (err) {
    console.error("[POST /api/seed]", err);
    return NextResponse.json(
      { error: "Gagal menyiapkan data awal." },
      { status: 500 }
    );
  }
}
