"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CornerDownLeft,
  Hash,
  Inbox,
  Loader2,
  Save,
  Search,
  Sparkles,
  Target,
  Wallet,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useCreateSavedSearch,
  useDeleteSavedSearch,
  useSavedSearches,
  useSmartSearch,
} from "@/lib/hooks";
import { LucideIcon } from "@/components/lucide-icon";
import type { SmartSearchResult, SmartSearchResults } from "@/lib/types";

interface SmartSearchProps {
  onNavigate?: (section: string, id?: string) => void;
}

const SECTION_META: Record<
  "transactions" | "categories" | "accounts" | "goals",
  { label: string; section: string; icon: string }
> = {
  transactions: { label: "Transaksi", section: "transactions", icon: "Receipt" },
  categories: { label: "Kategori", section: "categories", icon: "Folder" },
  accounts: { label: "Akun", section: "accounts", icon: "Wallet" },
  goals: { label: "Tujuan", section: "goals", icon: "Target" },
};

const BADGE_CLASS: Record<string, string> = {
  Transaksi: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Pemasukan: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  Pengeluaran: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
  Kategori: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  Akun: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400",
  Tujuan: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400",
};

function ResultRow({
  result,
  onNavigate,
  onClose,
}: {
  result: SmartSearchResult;
  onNavigate: (section: string, id?: string) => void;
  onClose: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        const section = result.type === "transaction"
          ? SECTION_META.transactions.section
          : result.type === "category"
            ? SECTION_META.categories.section
            : result.type === "account"
              ? SECTION_META.accounts.section
              : SECTION_META.goals.section;
        onNavigate(section, result.id);
        onClose();
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
    >
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: result.color }}
      >
        <LucideIcon name={result.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{result.name}</p>
        {result.subtitle && (
          <p className="truncate text-xs text-muted-foreground">
            {result.subtitle}
          </p>
        )}
      </div>
      <Badge
        variant="secondary"
        className={cn(
          "shrink-0 text-xs",
          BADGE_CLASS[result.badge] ??
            "bg-muted text-muted-foreground"
        )}
      >
        {result.badge}
      </Badge>
    </button>
  );
}

function SectionGroup({
  label,
  icon,
  results,
  onNavigate,
  onClose,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  results: SmartSearchResult[];
  onNavigate: (section: string, id?: string) => void;
  onClose: () => void;
}) {
  if (results.length === 0) return null;
  const Icon = icon;
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
        <span className="text-muted-foreground/60">· {results.length}</span>
      </div>
      {results.map((r) => (
        <ResultRow
          key={`${r.type}-${r.id}`}
          result={r}
          onNavigate={onNavigate}
          onClose={onClose}
        />
      ))}
    </div>
  );
}

export function SmartSearch({ onNavigate }: SmartSearchProps) {
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [savedName, setSavedName] = React.useState("");
  const [showSaveForm, setShowSaveForm] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  // Debounce 300ms
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const { data, isFetching } = useSmartSearch(debounced, open);
  const { data: savedSearches } = useSavedSearches();
  const createSavedMut = useCreateSavedSearch();
  const deleteSavedMut = useDeleteSavedSearch();

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowSaveForm(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const totalResults = data
    ? data.transactions.length +
      data.categories.length +
      data.accounts.length +
      data.goals.length
    : 0;

  const hasParsedDates =
    !!data?.parsedQuery.from ||
    !!data?.parsedQuery.to ||
    !!data?.parsedQuery.prevMonth;

  function handleSave() {
    const name = savedName.trim() || debounced;
    if (!debounced) {
      toast.error("Belum ada kata kunci untuk disimpan");
      return;
    }
    createSavedMut.mutate(
      {
        name,
        filters: JSON.stringify({ query: debounced }),
      },
      {
        onSuccess: () => {
          toast.success(`Pencarian "${name}" disimpan`);
          setSavedName("");
          setShowSaveForm(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }

  function applySavedSearch(filters: string) {
    try {
      const obj = JSON.parse(filters) as { query?: string };
      if (obj.query) {
        setQuery(obj.query);
        setOpen(true);
      }
    } catch {
      // ignore
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setShowSaveForm(false);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Cari transaksi, kategori, akun..."
          className="h-10 pl-9 pr-9"
          aria-label="Cari cerdas"
        />
        {isFetching && open ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebounced("");
              setOpen(false);
            }}
            aria-label="Bersihkan"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {/* Saved search chips */}
      {(savedSearches?.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Tersimpan:</span>
          {(savedSearches ?? []).map((s) => (
            <div
              key={s.id}
              className="group flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 py-0.5 pl-2.5 pr-1 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400"
            >
              <button
                type="button"
                onClick={() => applySavedSearch(s.filters)}
                className="font-medium hover:underline"
              >
                {s.name}
              </button>
              <button
                type="button"
                onClick={() =>
                  deleteSavedMut.mutate(s.id, {
                    onSuccess: () =>
                      toast.success("Pencarian tersimpan dihapus"),
                    onError: (e) => toast.error(e.message),
                  })
                }
                className="rounded-full p-0.5 text-emerald-600/70 hover:bg-emerald-100 hover:text-emerald-700 dark:hover:bg-emerald-500/20"
                aria-label={`Hapus ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {open && debounced && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Hasil untuk{" "}
              <span className="font-medium text-foreground">
                &quot;{debounced}&quot;
              </span>
              {totalResults > 0 && ` · ${totalResults} cocok`}
            </p>
            <div className="flex items-center gap-1.5">
              {hasParsedDates && (
                <Badge
                  variant="secondary"
                  className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                >
                  <Sparkles className="mr-1 h-3 w-3" />
                  Filter waktu aktif
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setShowSaveForm((v) => !v)}
                disabled={!debounced}
              >
                <Save className="mr-1 h-3 w-3" />
                Simpan
              </Button>
            </div>
          </div>

          {showSaveForm && (
            <div className="flex items-center gap-2 border-b bg-emerald-50/50 p-2 dark:bg-emerald-500/5">
              <Input
                value={savedName}
                onChange={(e) => setSavedName(e.target.value)}
                placeholder="Nama pencarian (cth: Jajan kopi bulan lalu)"
                className="h-8"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={handleSave}
                disabled={createSavedMut.isPending}
                className="h-8 bg-emerald-600 hover:bg-emerald-700"
              >
                {createSavedMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Simpan"
                )}
              </Button>
            </div>
          )}

          <div className="max-h-[60vh] overflow-y-auto p-1.5">
            {isFetching && !data ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Mencari...
              </div>
            ) : !data || totalResults === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Tidak ada hasil untuk &quot;{debounced}&quot;.
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Coba: &quot;kopi bulan lalu&quot;, &quot;gaji&quot;, atau
                  &quot;transportasi kemarin&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <SectionGroup
                  label="Transaksi"
                  icon={Hash}
                  results={data.transactions}
                  onNavigate={(s, id) => onNavigate?.(s, id)}
                  onClose={() => setOpen(false)}
                />
                <SectionGroup
                  label="Kategori"
                  icon={({ className }) => (
                    <LucideIcon name="Folder" className={className} />
                  )}
                  results={data.categories}
                  onNavigate={(s, id) => onNavigate?.(s, id)}
                  onClose={() => setOpen(false)}
                />
                <SectionGroup
                  label="Akun"
                  icon={Wallet}
                  results={data.accounts}
                  onNavigate={(s, id) => onNavigate?.(s, id)}
                  onClose={() => setOpen(false)}
                />
                <SectionGroup
                  label="Tujuan"
                  icon={Target}
                  results={data.goals}
                  onNavigate={(s, id) => onNavigate?.(s, id)}
                  onClose={() => setOpen(false)}
                />
                {data.parsedQuery.prevMonth && (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3 text-emerald-600" />
                    Pencarian difilter ke bulan lalu.
                  </p>
                )}
                <div className="flex items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground/70">
                  <CornerDownLeft className="h-3 w-3" />
                  Tekan enter pada baris untuk membuka
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
