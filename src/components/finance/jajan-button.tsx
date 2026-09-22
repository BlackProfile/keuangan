"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Coffee,
  Lightbulb,
  Loader2,
  Mic,
  MicOff,
  Plus,
  Repeat,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateInput } from "@/lib/format";
import {
  AUTO_CATEGORY_KEYWORDS,
  COMMON_MERCHANTS,
} from "@/lib/constants";
import { JAJAN_PRESETS } from "@/lib/student-constants";
import {
  useCategories,
  useCreateTransaction,
  useJajanCheck,
  useTransactions,
} from "@/lib/hooks";
import type {
  Category,
  Transaction,
  TransactionInput,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Resolve a category id by name (case-insensitive), with a "Makanan" fallback. */
function resolveCategoryId(
  categories: Category[] | undefined,
  name: string
): string | undefined {
  if (!categories || categories.length === 0) return undefined;
  const target = name.trim().toLowerCase();
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const exact = expense.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact.id;
  const partial = expense.find((c) => c.name.toLowerCase().includes(target));
  if (partial) return partial.id;
  const makanan = expense.find((c) => c.name.toLowerCase() === "makanan");
  return makanan?.id;
}

function todayInput(): string {
  return formatDateInput(new Date());
}

function nowTime(): string {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export interface JajanPreset {
  label: string;
  amount: number;
  icon: string;
  category: string;
}

/* ------------------ Voice input (Web Speech API) ------------------ */

// Minimal TS shim for SpeechRecognition (browser-only, no lib types)
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  length: number;
  isFinal?: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
  resultIndex: number;
}

function getSpeechRecognitionCtor():
  | (new () => SpeechRecognitionLike)
  | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Map Indonesian number-words ("delapan ribu", "tiga puluh") into digits. */
const NUMBER_WORDS: Record<string, number> = {
  nol: 0, kosong: 0,
  satu: 1, se: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
  sepuluh: 10, puluh: 10,
  sebelas: 11, belas: 10,
  seratus: 100, ratus: 100,
  seribu: 1000, ribu: 1000, rb: 1000,
  juta: 1_000_000, jt: 1_000_000,
  k: 1000,
  m: 1_000_000,
};

/** Parse a spoken phrase like "kopi 8 ribu" → { description: "kopi", amount: 8000 }. */
export function parseSpokenJajan(
  raw: string
): { description: string; amount: number } {
  const cleaned = raw
    .toLowerCase()
    .replace(/[.,!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return { description: "", amount: 0 };

  // Match "<digits> [ribu|rb|k|juta|jt|m]" or grouped thousands like "8.500"
  const re = /(\d{1,3}(?:[.,]\d{3})+|\d+)\s*(ribu|rb|k|juta|jt|m)?/gi;
  const amounts: number[] = [];
  let amountSpan: { start: number; end: number } | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cleaned)) !== null) {
    const digits = m[1].replace(/[.,]/g, "");
    const n = Number(digits);
    if (!Number.isFinite(n) || n <= 0) continue;
    const suffix = (m[2] ?? "").toLowerCase();
    let value = n;
    if (suffix === "ribu" || suffix === "rb" || suffix === "k") {
      value = n * 1000;
    } else if (suffix === "juta" || suffix === "jt" || suffix === "m") {
      value = n * 1_000_000;
    } else if (n < 100) {
      // bare colloquial "8" → 8000
      value = n * 1000;
    }
    amounts.push(value);
    if (!amountSpan) {
      amountSpan = { start: m.index, end: m.index + m[0].length };
    }
  }

  // Word-based fallback ("delapan ribu", "sepuluh ribu")
  if (amounts.length === 0) {
    const words = cleaned.split(" ");
    let total = 0;
    let lastUnit = 0;
    let wordIdxStart = -1;
    let wordIdxEnd = -1;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const n = NUMBER_WORDS[w];
      if (n === undefined) continue;
      if (wordIdxStart === -1) wordIdxStart = i;
      wordIdxEnd = i;
      if (n === 1000 || n === 1_000_000 || n === 100) {
        total += (lastUnit === 0 ? 1 : lastUnit) * n;
        lastUnit = 0;
      } else if (n === 10) {
        lastUnit = (lastUnit === 0 ? 1 : lastUnit) * n;
      } else {
        lastUnit = n;
      }
    }
    if (lastUnit > 0) total += lastUnit;
    if (total > 0) {
      amounts.push(total);
      if (wordIdxStart !== -1 && wordIdxEnd !== -1) {
        const before = words.slice(0, wordIdxStart).join(" ");
        const after = words.slice(wordIdxEnd + 1).join(" ");
        const desc = `${before} ${after}`.replace(/\s+/g, " ").trim();
        return { description: desc || "Jajan", amount: total };
      }
    }
  }

  const amount = amounts.length > 0 ? amounts[0] : 0;

  // Description: strip amount tokens from the original string
  let description = cleaned;
  if (amountSpan) {
    description = `${cleaned.slice(0, amountSpan.start)} ${cleaned.slice(amountSpan.end)}`
      .replace(/\s+/g, " ")
      .trim();
  }
  if (!description) description = "Jajan";

  return { description, amount };
}

/* ------------------ Auto-categorize hint ------------------ */

/** Match description against COMMON_MERCHANTS + AUTO_CATEGORY_KEYWORDS. */
function suggestCategory(
  description: string
): { category: string; merchant: string | null } | null {
  const text = description.toLowerCase().trim();
  if (!text) return null;

  // Exact merchant match first
  for (const m of COMMON_MERCHANTS) {
    if (text.includes(m.toLowerCase())) {
      // Cross-reference merchant with keyword map for category
      const keywordHit =
        AUTO_CATEGORY_KEYWORDS[m.toLowerCase()] ??
        Object.values(AUTO_CATEGORY_KEYWORDS).find(
          (v) => v.merchant && v.merchant.toLowerCase() === m.toLowerCase()
        );
      if (keywordHit) return { category: keywordHit.category, merchant: m };
      return { category: "Lainnya", merchant: m };
    }
  }
  // Keyword fallback
  for (const [key, val] of Object.entries(AUTO_CATEGORY_KEYWORDS)) {
    if (text.includes(key)) {
      return { category: val.category, merchant: val.merchant ?? null };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Main floating button                                                */
/* ------------------------------------------------------------------ */

interface JajanButtonProps {
  /** When provided, the component is controlled and the built-in FAB is hidden. */
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
}

export function JajanButton({ open, onOpenChange }: JajanButtonProps = {}) {
  const isControlled =
    typeof open === "boolean" && typeof onOpenChange === "function";
  const [internalOpen, setInternalOpen] = React.useState(false);

  const sheetOpen = isControlled ? (open as boolean) : internalOpen;
  const setSheetOpen = React.useCallback(
    (v: boolean) => {
      if (isControlled) (onOpenChange as (v: boolean) => void)(v);
      else setInternalOpen(v);
    },
    [isControlled, onOpenChange]
  );

  return (
    <>
      {/* Built-in floating button — only when NOT controlled (used standalone) */}
      {!isControlled && (
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Jajan cepat"
          className={cn(
            "fixed bottom-20 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full",
            "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30",
            "transition-transform hover:scale-105 active:scale-95",
            "sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
          )}
        >
          <Coffee className="h-5 w-5 sm:h-6 sm:w-6" />
          <span className="sr-only">Jajan cepat</span>
        </button>
      )}

      <JajanSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Sheet content                                                       */
/* ------------------------------------------------------------------ */

function JajanSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: categories } = useCategories("EXPENSE");
  const createMut = useCreateTransaction();

  const handlePreset = React.useCallback(
    (preset: JajanPreset) => {
      const categoryId = resolveCategoryId(categories, preset.category);
      if (!categoryId) {
        toast.error(
          `Kategori "${preset.category}" belum ada. Tambah dulu di tab Kategori.`
        );
        return;
      }
      const payload: TransactionInput = {
        type: "EXPENSE",
        amount: preset.amount,
        description: preset.label,
        date: todayInput(),
        categoryId,
        time: nowTime(),
      };
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success(
            `Jajan ${preset.label} ${formatCurrency(preset.amount)} tercatat!`
          );
          onOpenChange(false);
        },
        onError: (err) =>
          toast.error(err.message || "Gagal mencatat jajan."),
      });
    },
    [categories, createMut, onOpenChange]
  );

  const pending = createMut.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="mx-auto max-w-md rounded-t-2xl p-0 sm:rounded-t-2xl"
      >
        <SheetHeader className="border-b border-border bg-muted/30 p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Coffee className="h-5 w-5" />
              </span>
              <div>
                <SheetTitle className="text-base">Jajan Cepat</SheetTitle>
                <SheetDescription className="text-xs">
                  Satu ketuk, langsung tercatat sebagai pengeluaran.
                </SheetDescription>
              </div>
            </div>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
        </SheetHeader>

        <div className="max-h-[70vh] overflow-y-auto p-4">
          {/* Preset grid */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {JAJAN_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                disabled={pending}
                onClick={() => handlePreset(p)}
                className={cn(
                  "group flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3 text-left transition-all",
                  "hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm",
                  "dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
                  "disabled:cursor-not-allowed disabled:opacity-50"
                )}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:group-hover:bg-emerald-500/15 dark:group-hover:text-emerald-400">
                  <LucideIcon name={p.icon} className="h-4 w-4" />
                </span>
                <span className="text-sm font-medium text-foreground">
                  {p.label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {formatCurrency(p.amount)}
                </span>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            <span>atau catat manual</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Quick repeat — last 3 transactions */}
          <QuickRepeatSection
            disabled={pending}
            onSubmitted={() => onOpenChange(false)}
          />

          {/* Custom input */}
          <CustomJajanForm
            categories={categories ?? []}
            pending={pending}
            onSubmitted={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Repeat — last 3 transactions as 1-tap duplicate buttons      */
/* ------------------------------------------------------------------ */

function QuickRepeatSection({
  disabled,
  onSubmitted,
}: {
  disabled: boolean;
  onSubmitted: () => void;
}) {
  const { data: recent, isLoading } = useTransactions({ limit: 3 });
  const createMut = useCreateTransaction();
  const items = (recent ?? []).slice(0, 3);
  if (isLoading || items.length === 0) return null;

  function duplicate(t: Transaction) {
    const payload: TransactionInput = {
      type: t.type,
      amount: t.amount,
      description: t.description,
      date: todayInput(),
      categoryId: t.categoryId,
      time: nowTime(),
      merchant: t.merchant ?? undefined,
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(
          `Diulang: ${t.description} ${formatCurrency(t.amount)} tercatat!`
        );
        onSubmitted();
      },
      onError: (err) => toast.error(err.message || "Gagal mengulang transaksi."),
    });
  }

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Repeat className="h-3.5 w-3.5" />
        Ulangi jajan terakhir
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => duplicate(t)}
            className={cn(
              "flex flex-col items-start gap-0.5 rounded-lg border border-border bg-card px-2.5 py-2 text-left transition-all",
              "hover:border-emerald-400 hover:bg-emerald-50",
              "dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <span className="line-clamp-1 text-xs font-medium text-foreground">
              {t.description}
            </span>
            <span className="text-[11px] tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatCurrency(t.amount)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom jajan form (inline within the sheet)                        */
/* ------------------------------------------------------------------ */

function CustomJajanForm({
  categories,
  pending,
  onSubmitted,
}: {
  categories: Category[];
  pending: boolean;
  onSubmitted: () => void;
}) {
  const createMut = useCreateTransaction();
  const jajanCheck = useJajanCheck();

  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [listening, setListening] = React.useState(false);
  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);

  const amountNum = Number(amount);
  const canAfford = jajanCheck.data?.canAfford;

  // Auto-categorize hint based on description
  const hint = React.useMemo(() => {
    if (!description.trim()) return null;
    return suggestCategory(description);
  }, [description]);

  // Apply hint when available and user hasn't manually overridden the category
  React.useEffect(() => {
    if (hint && !categoryId) {
      const id = resolveCategoryId(categories, hint.category);
      if (id) setCategoryId(id);
    }
  }, [hint, categories, categoryId]);

  // Trigger AI verdict when amount changes (debounced via react-query)
  React.useEffect(() => {
    if (Number.isFinite(amountNum) && amountNum > 0 && !jajanCheck.isPending) {
      const t = setTimeout(() => {
        jajanCheck.mutate(amountNum);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [amount, amountNum, jajanCheck]);

  /* ------------------ Voice input handling ------------------ */

  const stopListening = React.useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setListening(false);
  }, []);

  const handleVoice = React.useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input tidak didukung di browser ini");
      return;
    }
    if (listening) {
      stopListening();
      return;
    }
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: unknown) => {
      const ev = e as SpeechRecognitionEventLike;
      const result = ev.results[0]?.[0];
      const transcript = result?.transcript ?? "";
      const parsed = parseSpokenJajan(transcript);
      if (parsed.amount > 0) {
        setAmount(String(parsed.amount));
        toast.success(`Terdengar: "${transcript.trim()}"`);
      }
      if (parsed.description) {
        setDescription(parsed.description);
      }
      if (parsed.amount === 0 && !parsed.description) {
        toast.warning("Tidak dapat menangkap suara dengan jelas.");
      }
    };
    rec.onerror = () => {
      toast.error("Voice input gagal. Coba lagi.");
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
      toast.info("Dengarkan… sebutkan, mis. \"kopi 8 ribu\"");
    } catch {
      toast.error("Tidak bisa memulai voice input.");
      setListening(false);
    }
  }, [listening, stopListening]);

  React.useEffect(() => {
    return () => {
      // Cleanup on unmount
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.abort();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah yang valid.");
      return;
    }
    const desc = description.trim() || "Jajan";
    const catId = categoryId || resolveCategoryId(categories, "Makanan");
    if (!catId) {
      toast.error("Kategori Makanan belum ada. Tambah dulu di tab Kategori.");
      return;
    }
    const payload: TransactionInput = {
      type: "EXPENSE",
      amount: Math.round(amountNum),
      description: desc,
      date: todayInput(),
      categoryId: catId,
      time: nowTime(),
      merchant: hint?.merchant ?? undefined,
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(`Jajan ${desc} ${formatCurrency(amountNum)} tercatat!`);
        setAmount("");
        setDescription("");
        setCategoryId("");
        onSubmitted();
      },
      onError: (err) =>
        toast.error(err.message || "Gagal mencatat jajan."),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="jb-amount">Jumlah (Rp)</Label>
          <button
            type="button"
            onClick={handleVoice}
            aria-label={listening ? "Hentikan voice input" : "Input suara"}
            className={cn(
              "flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-medium transition-colors",
              listening
                ? "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:hover:bg-emerald-500/25"
            )}
          >
            {listening ? (
              <>
                <MicOff className="h-3.5 w-3.5" />
                Stop
              </>
            ) : (
              <>
                <Mic className="h-3.5 w-3.5" />
                Voice
              </>
            )}
          </button>
        </div>
        <Input
          id="jb-amount"
          type="number"
          inputMode="numeric"
          min={0}
          step={500}
          placeholder="cth. 8500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          autoFocus
        />
        {amount && Number(amount) > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(Number(amount))}
          </p>
        )}
        {listening && (
          <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            Mendengarkan…
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="jb-desc">Keterangan</Label>
        <Input
          id="jb-desc"
          placeholder="cth. Cireng tukang sebelah"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={80}
        />
        {hint && (
          <button
            type="button"
            onClick={() => {
              const id = resolveCategoryId(categories, hint.category);
              if (id) setCategoryId(id);
            }}
            className="flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20"
            aria-label="Terapkan kategori yang disarankan"
          >
            <Lightbulb className="h-3 w-3 shrink-0" />
            Saran kategori:
            <span className="font-semibold">{hint.category}</span>
            {hint.merchant && (
              <span className="text-amber-600/70 dark:text-amber-300/70">
                · {hint.merchant}
              </span>
            )}
          </button>
        )}
      </div>

      {/* AI Jajan Check verdict */}
      {amount && Number(amount) > 0 && jajanCheck.data && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            canAfford
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
          )}
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{jajanCheck.data.reply}</span>
        </div>
      )}

      <SheetFooter className="gap-2 sm:gap-2">
        <Button
          type="submit"
          disabled={pending}
          className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          Catat Jajan
        </Button>
      </SheetFooter>
    </form>
  );
}
