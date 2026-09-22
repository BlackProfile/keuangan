import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Seed data: 24 Indonesian financial tips across 5 categories.
const FINANCIAL_TIPS_SEED: Array<{
  title: string;
  content: string;
  category: string;
  icon: string;
}> = [
  // saving
  {
    title: "Bawa Bekal dari Kos",
    content:
      "Bawa bekal dari kos bisa hemat Rp100rb/bulan lho! Selain hemat, juga lebih sehat.",
    category: "saving",
    icon: "Utensils",
  },
  {
    title: "Nabung 10% Uang Saku",
    content:
      "Nabung 10% dari uang saku tiap bulan, konsisten lebih penting dari nominal.",
    category: "saving",
    icon: "PiggyBank",
  },
  {
    title: "Bandingkan Harga Sebelum Beli",
    content:
      "Bandingkan harga sebelum beli, cek 2-3 toko dulu. Beda harga bisa sampai 20%!",
    category: "saving",
    icon: "Search",
  },
  {
    title: "Manfaatkan Cashback E-Wallet",
    content:
      "Pakai e-wallet untuk cashback dan promo hemat. Tapi ingat, jangan beli karena ada promo saja.",
    category: "saving",
    icon: "Wallet",
  },
  {
    title: "Amplop Bulanan",
    content:
      "Pisahkan uang ke amplop per kategori: makan, transport, jajan. Kalau amplop kosong, berhenti ngeluar.",
    category: "saving",
    icon: "EnvelopeOpen",
  },
  {
    title: "Tunggu 24 Jam",
    content:
      "Sebelum beli barang mahal, tunggu 24 jam. Kalau masih kepengen, baru beli. Kalau cuma impulse, biasanya ilang.",
    category: "saving",
    icon: "Clock",
  },
  // budgeting
  {
    title: "Aturan 50/30/20",
    content:
      "50% kebutuhan, 30% keinginan, 20% tabungan. Sesuaikan porsi sesuai kondisi, tapi jangan lupa nabung.",
    category: "budgeting",
    icon: "PieChart",
  },
  {
    title: "Catat Setiap Pengeluaran",
    content:
      "Catat setiap pengeluaran, sekecil apapun. Kopi Rp15rb kalau tiap hari = Rp450rb/bulan. Lumayan!",
    category: "budgeting",
    icon: "NotebookPen",
  },
  {
    title: "Buat Budget per Kategori",
    content:
      "Set budget bulanan per kategori (makan, transport, hiburan). Kalau over di satu kategori, potong yang lain.",
    category: "budgeting",
    icon: "Calculator",
  },
  {
    title: "Review Mingguan",
    content:
      "Setiap akhir minggu, review pengeluaran. Apakah masih sesuai budget? Kalau over, atur minggu depan.",
    category: "budgeting",
    icon: "CalendarCheck",
  },
  {
    title: "Dana Darurat Dulu",
    content:
      "Sebelum investasi, bangun dana darurat 3-6x pengeluaran bulanan. Ini tameng kalau ada kejadian tak terduga.",
    category: "budgeting",
    icon: "ShieldCheck",
  },
  // investing
  {
    title: "Mulai dari Reksadana",
    content:
      "Untuk pemula, reksadana pasar uang cocok banget. Modal Rp10rb sudah bisa mulai, risiko rendah.",
    category: "investing",
    icon: "TrendingUp",
  },
  {
    title: "Investasi Rutin (DCA)",
    content:
      "Investasi rutin tiap bulan walau kecil, manfaatkan dollar cost averaging. Konsistensi kunci dari compound interest.",
    category: "investing",
    icon: "Repeat",
  },
  {
    title: "Pahami Sebelum Investasi",
    content:
      "Jangan investasi di produk yang nggak kamu pahami. Pelajari risiko, imbal hasil, dan likuiditas dulu.",
    category: "investing",
    icon: "BookOpenCheck",
  },
  {
    title: "Diversifikasi Portofolio",
    content:
      "Jangan taruh semua telur di satu keranjang. Diversifikasi antara saham, obligasi, dan emas.",
    category: "investing",
    icon: "LayoutGrid",
  },
  {
    title: "Hindari FOMO Crypto",
    content:
      "Jangan ikut-ikutan beli crypto karena teman dapat untung. Harga bisa turun drastis dalam sehari.",
    category: "investing",
    icon: "AlertTriangle",
  },
  // student
  {
    title: "Manfaatkan Diskon Mahasiswa",
    content:
      "Bawa KTM mana aja! Banyak tempat kasih diskon 10-20% untuk mahasiswa: bioskop, transport, software.",
    category: "student",
    icon: "GraduationCap",
  },
  {
    title: "Jual Buku Bekas",
    content:
      "Buku kuliah yang udah nggak dipakai bisa dijual. Dapat uang jajan sekaligus bantu adik tingkat.",
    category: "student",
    icon: "BookMarked",
  },
  {
    title: "Pakai Software Gratis",
    content:
      "Pakai software gratis pakai email kampus: Office 365, Notion Plus, GitHub Student Pack. Bisa hemat jutaan!",
    category: "student",
    icon: "Laptop",
  },
  {
    title: "Kelola Uang Jajan Harian",
    content:
      "Tentuin limit jajan harian (misal Rp30rb). Kalau hari ini over, besok kurangi. Lebih disiplin dari sekadar nabung sisa.",
    category: "student",
    icon: "Coins",
  },
  {
    title: "Freelance Sambil Kuliah",
    content:
      "Cari freelance ringan: design, tulis, jadi asisten dosen. Tambah pengalaman + pemasukan tambahan.",
    category: "student",
    icon: "Briefcase",
  },
  {
    title: "Kelola Uang UKT",
    content:
      "Jangan pakai sisa UKT buat jajan. Sisihkan untuk keperluan akademik: fotocopy, print, parkir kampus.",
    category: "student",
    icon: "BookText",
  },
  // general
  {
    title: "Bayar Tepat Waktu",
    content:
      "Bayar tagihan tepat waktu untuk hindari denda. Aktifkan reminder biar nggak lupa.",
    category: "general",
    icon: "Bell",
  },
  {
    title: "Cek Langganan Tidak Terpakai",
    content:
      "Rutin cek langganan (Netflix, Spotify, gym). Kalau jarang pakai, cancel aja. Hemat ratusan ribu per tahun.",
    category: "general",
    icon: "RefreshCw",
  },
  {
    title: "Hindari Hutang Konsumtif",
    content:
      "Hindari hutang untuk beli barang konsumtif (bajaj, skincare). Kalau harus nyicil, pastikan cicilan <30% penghasilan.",
    category: "general",
    icon: "CreditCard",
  },
  {
    title: "Tetap Sehat, Hemat Medis",
    content:
      "Jaga pola makan + olahraga. Sakit itu mahal: obat, dokter, kehilangan waktu produktif.",
    category: "general",
    icon: "HeartPulse",
  },
];

async function ensureTipsSeeded() {
  const count = await db.financialTip.count();
  if (count > 0) return count;
  await db.financialTip.createMany({
    data: FINANCIAL_TIPS_SEED.map((t) => ({
      title: t.title,
      content: t.content,
      category: t.category,
      icon: t.icon,
    })),
  });
  return FINANCIAL_TIPS_SEED.length;
}

// GET /api/financial-tips — list tips in random order; seed if empty
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(Number(limitParam), 100) : undefined;

    await ensureTipsSeeded();

    const where: Record<string, unknown> = {};
    if (category && category !== "ALL") where.category = category;

    const tips = await db.financialTip.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    // Fisher-Yates shuffle for random order
    for (let i = tips.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tips[i], tips[j]] = [tips[j], tips[i]];
    }

    const result = limit ? tips.slice(0, limit) : tips;
    return NextResponse.json(result);
  } catch (err) {
    console.error("[GET /api/financial-tips]", err);
    return NextResponse.json(
      { error: "Gagal memuat tips keuangan." },
      { status: 500 }
    );
  }
}
