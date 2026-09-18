import { NextResponse } from "next/server";
import ZAI from "z-ai-web-dev-sdk";

// POST /api/ai/receipt
// Body: { image: string (base64 or URL) }
// Returns: { merchant, date, total, items, category }
export async function POST(req: Request) {
  const FALLBACK = {
    merchant: "",
    date: new Date().toISOString().split("T")[0] ?? "",
    total: 0,
    items: [] as string[],
    category: "Lainnya",
  };

  try {
    const body = await req.json().catch(() => ({}));
    const image: unknown = body?.image;

    if (
      typeof image !== "string" ||
      image.trim().length === 0
    ) {
      return NextResponse.json(
        { error: "Field 'image' wajib diisi (base64 atau URL)." },
        { status: 400 }
      );
    }

    // Normalize image input to a URL the vision API can consume
    const imageUrl = normalizeImageUrl(image.trim());

    const prompt =
      "Kamu adalah asisten pemindai struk belanja untuk aplikasi keuangan DompetKu. " +
      "Lihat gambar struk berikut dan ekstrak informasi penting.\n\n" +
      "Tugas: ekstrak data berikut dari struk:\n" +
      "1. merchant: nama toko/merchant (string)\n" +
      "2. date: tanggal transaksi dalam format YYYY-MM-DD (string). Jika tidak ada, gunakan tanggal hari ini.\n" +
      "3. total: total nominal akhir yang dibayar (number, tanpa simbol mata uang)\n" +
      "4. items: daftar item/barang yang dibeli (array of string)\n" +
      "5. category: pilih SATU kategori yang paling sesuai dari daftar berikut: " +
      "Makanan, Transportasi, Belanja, Tagihan, Hiburan, Kesehatan, Perumahan.\n\n" +
      "WAJIB jawab HANYA dengan JSON valid tanpa markdown, tanpa penjelasan tambahan. " +
      'Format: {"merchant": string, "date": "YYYY-MM-DD", "total": number, "items": string[], "category": string}. ' +
      "Jika sebuah field tidak ditemukan di struk, kembalikan string kosong untuk string, 0 untuk number, dan array kosong untuk items.";

    try {
      const zai = await ZAI.create();
      const response = await zai.chat.completions.createVision({
        model: "glm-4v",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        thinking: { type: "disabled" },
      });

      const content: string =
        response?.choices?.[0]?.message?.content ?? "";

      const parsed = parseReceiptJson(content);

      return NextResponse.json(parsed, { status: 200 });
    } catch (aiErr) {
      console.error("[POST /api/ai/receipt] AI error:", aiErr);
      return NextResponse.json(
        {
          ...FALLBACK,
          error:
            "Gagal memproses struk dengan AI. Silakan coba lagi atau input manual.",
        },
        { status: 200 }
      );
    }
  } catch (err) {
    console.error("[POST /api/ai/receipt]", err);
    return NextResponse.json(
      {
        ...FALLBACK,
        error: "Terjadi kesalahan tak terduga saat memproses struk.",
      },
      { status: 200 }
    );
  }
}

/**
 * Normalize the image input. If it's a URL (starts with http), use as-is.
 * If it looks like raw base64 (may or may not have a data: prefix), wrap it
 * in a data URL. We default to image/jpeg which works for most receipt scans.
 */
function normalizeImageUrl(image: string): string {
  if (/^https?:\/\//i.test(image)) {
    return image;
  }
  // Already a data URL
  if (/^data:image\//i.test(image)) {
    return image;
  }
  // Strip any accidental data: prefix without image subtype
  const cleaned = image.replace(/^data:;base64,/i, "");
  // Try to detect PNG signature
  const looksLikePng =
    /^iVBORw0KGgo/.test(cleaned) || /^data:image\/png/i.test(image);
  const mime = looksLikePng ? "image/png" : "image/jpeg";
  return `data:${mime};base64,${cleaned}`;
}

/**
 * Parse the JSON returned by the LLM. Tolerant: handles code fences, leading
 * text, trailing text, and partial JSON. Returns the normalized payload.
 */
function parseReceiptJson(content: string): {
  merchant: string;
  date: string;
  total: number;
  items: string[];
  category: string;
} {
  const ALLOWED_CATEGORIES = [
    "Makanan",
    "Transportasi",
    "Belanja",
    "Tagihan",
    "Hiburan",
    "Kesehatan",
    "Perumahan",
  ];

  const fallback = {
    merchant: "",
    date: new Date().toISOString().split("T")[0] ?? "",
    total: 0,
    items: [] as string[],
    category: "Lainnya",
  };

  if (!content || typeof content !== "string") return fallback;

  // Strip markdown code fences if present
  const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenceMatch ? fenceMatch[1] : content;

  // Find the first { ... } block
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return fallback;

  const jsonStr = candidate.slice(start, end + 1);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return fallback;
  }

  const merchant = typeof parsed.merchant === "string" ? parsed.merchant.trim() : "";
  const dateRaw = typeof parsed.date === "string" ? parsed.date.trim() : "";
  const date = normalizeDate(dateRaw);
  const total = normalizeTotal(parsed.total);
  const items = normalizeItems(parsed.items);
  const category = normalizeCategory(parsed.category, ALLOWED_CATEGORIES);

  return { merchant, date, total, items, category };
}

function normalizeDate(input: string): string {
  if (!input) {
    return new Date().toISOString().split("T")[0] ?? "";
  }
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  // DD/MM/YYYY or DD-MM-YYYY
  const m = input.match(
    /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/
  );
  if (m) {
    const day = m[1]!.padStart(2, "0");
    const month = m[2]!.padStart(2, "0");
    let year = m[3]!;
    if (year.length === 2) year = "20" + year;
    return `${year}-${month}-${day}`;
  }
  // Try Date.parse as last resort
  const d = new Date(input);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const mth = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${mth}-${day}`;
  }
  return new Date().toISOString().split("T")[0] ?? "";
}

function normalizeTotal(input: unknown): number {
  if (typeof input === "number" && Number.isFinite(input)) {
    return Math.round(input);
  }
  if (typeof input === "string") {
    // Remove currency symbols, thousand separators (dots in ID locale),
    // and convert decimal comma to dot.
    const cleaned = input
      .replace(/[^\d,.\-]/g, "")
      .replace(/\.(?=\d{3}(\D|$))/g, "") // remove thousand-dot separators
      .replace(/,(\d{1,2})$/, ".$1") // decimal comma -> dot
      .replace(/,/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n)) return Math.round(n);
  }
  return 0;
}

function normalizeItems(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .map((it) =>
        typeof it === "string"
          ? it.trim()
          : it && typeof it === "object" && "name" in it
            ? String((it as { name: unknown }).name ?? "").trim()
            : typeof it === "number"
              ? String(it)
              : ""
      )
      .filter((s) => s.length > 0)
      .slice(0, 50);
  }
  if (typeof input === "string" && input.trim()) {
    return input
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 50);
  }
  return [];
}

function normalizeCategory(
  input: unknown,
  allowed: string[]
): string {
  if (typeof input !== "string") return "Lainnya";
  const trimmed = input.trim();
  if (trimmed.length === 0) return "Lainnya";
  // Exact match (case-insensitive)
  const exact = allowed.find(
    (c) => c.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return exact;
  // Partial match (model output like "Makanan & Minuman")
  const partial = allowed.find((c) =>
    trimmed.toLowerCase().includes(c.toLowerCase())
  );
  return partial ?? "Lainnya";
}
