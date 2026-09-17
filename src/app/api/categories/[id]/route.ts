import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// DELETE /api/categories/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transactionsCount = await db.transaction.count({
      where: { categoryId: id },
    });

    if (transactionsCount > 0) {
      return NextResponse.json(
        {
          error: `Tidak dapat menghapus kategori karena masih terkait dengan ${transactionsCount} transaksi. Hapus atau ubah transaksi terkait terlebih dahulu.`,
          transactionCount: transactionsCount,
        },
        { status: 409 }
      );
    }

    const existing = await db.category.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Kategori tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.category.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/categories/[id]]", err);
    return NextResponse.json(
      { error: "Gagal menghapus kategori." },
      { status: 500 }
    );
  }
}
