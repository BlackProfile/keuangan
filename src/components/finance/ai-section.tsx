"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  ScanLine,
  Send,
  ShoppingBag,
  Sparkles,
  Store,
  Tag as TagIcon,
  Trash2,
  Wallet,
  X,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  useAiChat,
  useCategories,
  useInsights,
  useJajanCheck,
  useReceiptScan,
} from "@/lib/hooks";
import type { ChatMessage, TransactionType } from "@/lib/types";

interface CreateTransactionData {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  merchant?: string;
}

interface Props {
  onCreateTransaction?: (data: CreateTransactionData) => void;
  onNavigateToAdd?: () => void;
}

const SUGGESTED_QUESTIONS = [
  "Berapa total pengeluaranku bulan ini?",
  "Kategori apa yang paling boros?",
  "Tips hemat bulan ini",
];

type ReceiptResult = {
  merchant?: string;
  date?: string;
  total?: number;
  items?: string[];
  category?: string;
  error?: string;
};

export function AiSection({ onCreateTransaction, onNavigateToAdd }: Props) {
  const [tab, setTab] = React.useState<
    "chat" | "boleh" | "scan" | "insights"
  >("chat");

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          Asisten AI
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tanya, pindai struk, dan dapatkan insight otomatis untuk keuanganmu.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger
            value="chat"
            className="gap-1.5 py-2 text-xs sm:text-sm"
          >
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger
            value="boleh"
            className="gap-1.5 py-2 text-xs sm:text-sm"
          >
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Boleh?</span>
            <span className="sm:hidden">Jajan?</span>
          </TabsTrigger>
          <TabsTrigger
            value="scan"
            className="gap-1.5 py-2 text-xs sm:text-sm"
          >
            <ScanLine className="h-4 w-4" />
            <span className="hidden sm:inline">Struk</span>
            <span className="sm:hidden">Struk</span>
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="gap-1.5 py-2 text-xs sm:text-sm"
          >
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">Insight</span>
            <span className="sm:hidden">Insight</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <ChatAsisten />
        </TabsContent>
        <TabsContent value="boleh" className="mt-4">
          <BolehJajanCard />
        </TabsContent>
        <TabsContent value="scan" className="mt-4">
          <PindaiStruk onCreateTransaction={onCreateTransaction} />
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightOtomatis onNavigateToAdd={onNavigateToAdd} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// A. Chat Asisten
// ============================================================

function ChatAsisten() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Halo! Saya asisten keuangan DompetKu. Tanyakan apa saja tentang keuanganmu — misalnya total pengeluaran bulan ini atau kategori yang paling boros. 😊",
    },
  ]);
  const [input, setInput] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const chatMut = useAiChat();

  // Auto-scroll to bottom when messages change or while typing
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatMut.isPending]);

  async function handleSend(text?: string) {
    const content = (text ?? input).trim();
    if (!content || chatMut.isPending) return;

    const userMsg: ChatMessage = { role: "user", content };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");

    try {
      const res = await chatMut.mutateAsync(nextMessages);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            res.reply ||
            "Maaf, saya tidak bisa menjawab saat ini. Coba lagi nanti.",
        },
      ]);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Gagal menghubungi asisten AI.";
      toast.error(msg);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Maaf, terjadi kesalahan: ${msg}`,
        },
      ]);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const showSuggestions = messages.length <= 1;

  return (
    <Card className="flex h-[32rem] flex-col overflow-hidden p-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold">Asisten Keuangan</p>
          <p className="text-xs text-muted-foreground">
            Bertanya dalam Bahasa Indonesia
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="custom-scrollbar flex-1 space-y-3 overflow-y-auto bg-background p-4"
      >
        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
        {chatMut.isPending && <TypingIndicator />}
      </div>

      {/* Suggested questions */}
      {showSuggestions && (
        <div className="border-t border-border bg-muted/20 px-4 py-2.5">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Coba tanyakan
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                disabled={chatMut.isPending}
                className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-border bg-background p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan..."
          disabled={chatMut.isPending}
          className="flex-1"
          aria-label="Pesan ke asisten"
        />
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || chatMut.isPending}
          size="icon"
          className="h-10 w-10 shrink-0"
          aria-label="Kirim pesan"
        >
          {chatMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </Card>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div className="flex max-w-[85%] items-end gap-2">
        {!isUser && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </span>
        )}
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-end gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Bot className="h-4 w-4" />
        </span>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3 py-3">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// B. Boleh Jajan? — quick affordability check
// ============================================================

function BolehJajanCard() {
  const jajanCheck = useJajanCheck();
  const [amount, setAmount] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  const amountNum = Number(amount);
  const data = jajanCheck.data;
  const canAfford = data?.canAfford ?? null;
  const remaining = data?.remaining ?? null;

  function handleCheck(e?: React.FormEvent) {
    e?.preventDefault();
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Masukkan jumlah yang valid.");
      return;
    }
    if (!submitted) setSubmitted(true);
    jajanCheck.mutate(Math.round(amountNum), {
      onError: (err) =>
        toast.error(err.message || "Gagal mengecek. Coba lagi."),
    });
  }

  function reset() {
    setAmount("");
    setSubmitted(false);
    jajanCheck.reset();
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          <Wallet className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-semibold">Boleh Jajan?</h3>
          <p className="text-xs text-muted-foreground">
            Cek dulu apakah aman jajan sekali ini tanpa bikin uang saku bocor.
          </p>
        </div>
      </div>

      <form onSubmit={handleCheck} className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
              Rp
            </span>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              step={500}
              placeholder="cth. 25000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9"
              aria-label="Jumlah jajan"
            />
          </div>
          <Button
            type="submit"
            disabled={
              jajanCheck.isPending || !Number.isFinite(amountNum) || amountNum <= 0
            }
            className="gap-1.5"
          >
            {jajanCheck.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Check
          </Button>
        </div>

        {/* Quick chips */}
        <div className="flex flex-wrap gap-1.5">
          {[5000, 10000, 20000, 50000].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
            >
              {formatCurrency(v)}
            </button>
          ))}
        </div>
      </form>

      {/* Result bubble */}
      <AnimatePresence mode="wait">
        {submitted && data && (
          <motion.div
            key="reply"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mt-4 space-y-3"
          >
            {/* Chat bubble style reply */}
            <div className="flex items-end gap-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                <Bot className="h-4 w-4" />
              </span>
              <div className="rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2 text-sm leading-relaxed text-foreground">
                {data.reply}
              </div>
            </div>

            {/* Affordability badge */}
            <div className="flex flex-wrap items-center gap-2">
              {canAfford !== null && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "gap-1 border-transparent",
                    canAfford
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
                  )}
                >
                  {canAfford ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {canAfford ? "Boleh jajan" : "Sebaiknya tahan dulu"}
                </Badge>
              )}
              {remaining !== null && Number.isFinite(remaining) && (
                <Badge
                  variant="outline"
                  className="gap-1 text-muted-foreground"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Sisa budget: {formatCurrency(remaining)}
                </Badge>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={reset}
                className="h-7 px-2 text-xs text-muted-foreground"
              >
                Reset
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

// ============================================================
// C. Pindai Struk
// ============================================================

function PindaiStruk({
  onCreateTransaction,
}: {
  onCreateTransaction?: (data: CreateTransactionData) => void;
}) {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ReceiptResult | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const scanMut = useReceiptScan();
  const { data: categories } = useCategories();

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result as string);
      setResult(null);
    };
    reader.onerror = () => toast.error("Gagal membaca file gambar.");
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleScan() {
    if (!preview) {
      toast.error("Pilih gambar struk terlebih dahulu.");
      return;
    }
    scanMut.mutate(preview, {
      onSuccess: (data) => {
        const r = data as ReceiptResult;
        setResult(r);
        if (r.error) {
          toast.warning("Hasil pindai mungkin tidak akurat. Periksa kembali.");
        } else {
          toast.success("Struk berhasil dipindai!");
        }
      },
      onError: (err) => {
        toast.error(err.message || "Gagal memindai struk.");
      },
    });
  }

  function handleCreateTransaction() {
    if (!result || !onCreateTransaction) return;
    const categoryName = result.category || "Lainnya";
    const cat = (categories ?? []).find(
      (c) =>
        c.type === "EXPENSE" &&
        c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    const fallbackCat = (categories ?? []).find((c) => c.type === "EXPENSE");
    const categoryId = cat?.id ?? fallbackCat?.id ?? "";
    if (!categoryId) {
      toast.error("Tidak ada kategori pengeluaran. Buat kategori dulu.");
      return;
    }
    onCreateTransaction({
      type: "EXPENSE",
      amount: result.total ?? 0,
      description: result.merchant || "Struk",
      date: result.date ?? new Date().toISOString().slice(0, 10),
      categoryId,
      merchant: result.merchant,
    });
    toast.success("Transaksi dibuat dari struk.");
    handleReset();
  }

  function handleReset() {
    setPreview(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-base font-semibold">Pindai Struk</h3>
            <p className="text-xs text-muted-foreground">
              Unggah foto struk, AI akan mengekstrak data transaksi.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {!preview ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30",
            )}
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ImagePlus className="h-6 w-6" />
            </span>
            <div className="text-center">
              <p className="text-sm font-medium">
                Klik atau seret gambar ke sini
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Format JPG, PNG, WebP
              </p>
            </div>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30">
              <img
                src={preview}
                alt="Pratinjau struk"
                className="mx-auto max-h-72 object-contain"
              />
              <button
                onClick={handleReset}
                className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Hapus gambar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleScan}
                disabled={scanMut.isPending}
                className="gap-1.5"
              >
                {scanMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ScanLine className="h-4 w-4" />
                )}
                {scanMut.isPending ? "Memindai..." : "Pindai"}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-1.5"
                disabled={scanMut.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Ganti Gambar
              </Button>
            </div>
          </div>
        )}
      </Card>

      {scanMut.isPending && !result && (
        <Card className="p-5">
          <div className="space-y-3">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-20 w-full" />
          </div>
        </Card>
      )}

      {result && (
        <ReceiptResultCard
          result={result}
          onCreateTransaction={
            onCreateTransaction ? handleCreateTransaction : undefined
          }
        />
      )}
    </div>
  );
}

function ReceiptResultCard({
  result,
  onCreateTransaction,
}: {
  result: ReceiptResult;
  onCreateTransaction?: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Check className="h-4 w-4" />
          </span>
          <h3 className="text-base font-semibold">Hasil Pindai</h3>
        </div>
        {result.error && (
          <Badge
            variant="secondary"
            className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          >
            {result.error}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ResultField
          icon={<Store className="h-4 w-4" />}
          label="Merchant"
          value={result.merchant || "—"}
        />
        <ResultField
          icon={<Calendar className="h-4 w-4" />}
          label="Tanggal"
          value={result.date ? formatDate(result.date) : "—"}
        />
        <ResultField
          icon={<TagIcon className="h-4 w-4" />}
          label="Kategori"
          value={result.category || "—"}
        />
        <ResultField
          icon={<ShoppingBag className="h-4 w-4" />}
          label="Total"
          value={formatCurrency(result.total ?? 0)}
          highlight
        />
      </div>

      {result.items && result.items.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Item ({result.items.length})
          </p>
          <div className="custom-scrollbar max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2">
            <ul className="space-y-1">
              {result.items.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 rounded px-2 py-1 text-sm"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {onCreateTransaction && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button onClick={onCreateTransaction} className="gap-1.5">
            <ArrowRight className="h-4 w-4" />
            Buat Transaksi
          </Button>
        </div>
      )}
    </Card>
  );
}

function ResultField({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={cn(
          "truncate text-sm font-semibold",
          highlight && "text-primary",
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// D. Insight Otomatis
// ============================================================

function InsightOtomatis({
  onNavigateToAdd,
}: {
  onNavigateToAdd?: () => void;
}) {
  const { data, isLoading, refetch, isFetching } = useInsights();
  const insights = data?.insights ?? [];

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-base font-semibold">Insight Otomatis</h3>
            <p className="text-xs text-muted-foreground">
              Analisis pola keuangan 3 bulan terakhir
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isFetching}
          className="h-9 w-9 shrink-0"
          aria-label="Segarkan insight"
        >
          <RefreshCw
            className={cn("h-4 w-4", isFetching && "animate-spin")}
          />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
            <Sparkles className="h-6 w-6 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium">Belum ada insight</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tambahkan beberapa transaksi untuk mendapatkan insight otomatis.
            </p>
          </div>
          {onNavigateToAdd && (
            <Button
              onClick={onNavigateToAdd}
              size="sm"
              className="mt-1 gap-1"
            >
              <Plus className="h-4 w-4" />
              Tambah Transaksi
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {insights.map((text, i) => (
              <motion.div
                key={`${i}-${text.slice(0, 20)}`}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-border bg-muted/20 p-3"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm leading-relaxed text-foreground">
                  {text}
                </p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Card>
  );
}
