"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  ArrowDown,
  ArrowUp,
  Coins,
  CornerDownLeft,
  Eye,
  ListPlus,
  Moon,
  Palette,
  Plus,
  Search,
  Sparkles,
  Sun,
  Target,
  Users,
  UtensilsCrossed,
  Car,
  ShoppingCart,
  ReceiptText,
  Clapperboard,
  HeartPulse,
  Home as HomeIcon,
  GraduationCap,
  Dumbbell,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useCategories } from "@/lib/hooks";

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdd: () => void;
  onNavigate: (section: string) => void;
}

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  keywords?: string[];
  group: "Aksi" | "Navigasi" | "Tema" | "Kategori";
  run: () => void;
}

const RECENT_KEY = "dompetku:cmd-recent";
const MAX_RECENT = 4;

/**
 * CommandPalette — Cmd+K / Ctrl+K quick navigation overlay.
 *
 * Features:
 *  - Cmd/Ctrl+K toggles open
 *  - Search filterable commands
 *  - Arrow keys + Enter + Esc
 *  - Recent commands shown when input empty
 *  - framer-motion slide-in animation
 */
export function CommandPalette({
  open,
  onOpenChange,
  onAdd,
  onNavigate,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [recentIds, setRecentIds] = React.useState<string[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const { theme, setTheme } = useTheme();
  const { data: categories } = useCategories();

  // Load recent commands from localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRecentIds(arr.slice(0, MAX_RECENT));
      }
    } catch {
      // ignore
    }
  }, []);

  // Build command list (memoized for stability)
  const commands = React.useMemo<CommandItem[]>(() => {
    const base: CommandItem[] = [
      {
        id: "add",
        label: "Tambah transaksi",
        hint: "Buat transaksi baru",
        icon: <Plus className="h-4 w-4 text-emerald-500" />,
        keywords: ["tambah", "transaksi", "baru", "add", "create", "pemasukan", "pengeluaran"],
        group: "Aksi",
        run: () => {
          onAdd();
        },
      },
      {
        id: "nav-transaksi",
        label: "Lihat transaksi",
        hint: "Buka daftar semua transaksi",
        icon: <ListPlus className="h-4 w-4 text-sky-500" />,
        keywords: ["lihat", "transaksi", "list", "riwayat", "history"],
        group: "Navigasi",
        run: () => onNavigate("transaksi"),
      },
      {
        id: "nav-anggaran",
        label: "Anggaran",
        hint: "Atur anggaran per kategori",
        icon: <Coins className="h-4 w-4 text-amber-500" />,
        keywords: ["anggaran", "budget", "limit", "pengeluaran"],
        group: "Navigasi",
        run: () => onNavigate("pengaturan-anggaran"),
      },
      {
        id: "nav-target",
        label: "Target tabungan",
        hint: "Lihat target & progress tabungan",
        icon: <Target className="h-4 w-4 text-violet-500" />,
        keywords: ["target", "tujuan", "goal", "tabungan", "saving"],
        group: "Navigasi",
        run: () => onNavigate("target"),
      },
      {
        id: "nav-patungan",
        label: "Patungan",
        hint: "Bagi tagihan dengan teman",
        icon: <Users className="h-4 w-4 text-fuchsia-500" />,
        keywords: ["patungan", "split", "bill", "bagi", "tagihan"],
        group: "Navigasi",
        run: () => onNavigate("patungan"),
      },
      {
        id: "nav-beranda",
        label: "Beranda",
        hint: "Kembali ke dashboard",
        icon: <Sparkles className="h-4 w-4 text-primary" />,
        keywords: ["beranda", "home", "dashboard", "utama"],
        group: "Navigasi",
        run: () => onNavigate("beranda"),
      },
      {
        id: "theme-picker",
        label: "Ganti tema",
        hint: "Pilih tema tampilan (glass, neo, dll)",
        icon: <Palette className="h-4 w-4 text-pink-500" />,
        keywords: ["tema", "theme", "warna", "tampilan", "ganti"],
        group: "Tema",
        run: () => onNavigate("pengaturan"),
      },
      {
        id: "toggle-dark",
        label: "Mode gelap",
        hint: "Aktif/nonaktifkan dark mode",
        icon:
          theme === "dark" ? (
            <Sun className="h-4 w-4 text-amber-500" />
          ) : (
            <Moon className="h-4 w-4 text-indigo-500" />
          ),
        keywords: ["dark", "gelap", "terang", "light", "mode", "malam"],
        group: "Tema",
        run: () => {
          setTheme(theme === "dark" ? "light" : "dark");
        },
      },
    ];

    // Quick category filters (top 8 expense categories by default)
    const catIconMap: Record<string, React.ReactNode> = {
      Makanan: <UtensilsCrossed className="h-4 w-4 text-red-500" />,
      Transportasi: <Car className="h-4 w-4 text-orange-500" />,
      Belanja: <ShoppingCart className="h-4 w-4 text-pink-500" />,
      Tagihan: <ReceiptText className="h-4 w-4 text-rose-500" />,
      Hiburan: <Clapperboard className="h-4 w-4 text-purple-500" />,
      Kesehatan: <HeartPulse className="h-4 w-4 text-rose-600" />,
      Pendidikan: <GraduationCap className="h-4 w-4 text-violet-600" />,
      Perumahan: <HomeIcon className="h-4 w-4 text-cyan-600" />,
      Olahraga: <Dumbbell className="h-4 w-4 text-teal-500" />,
    };

    const categoryCmds: CommandItem[] = (categories ?? [])
      .filter((c) => c.type === "EXPENSE")
      .slice(0, 9)
      .map((c) => ({
        id: `cat-${c.id}`,
        label: `Filter: ${c.name}`,
        hint: `Tampilkan transaksi ${c.name.toLowerCase()}`,
        icon: catIconMap[c.name] ?? <Eye className="h-4 w-4 text-muted-foreground" />,
        keywords: [c.name.toLowerCase(), "kategori", "filter", "expense"],
        group: "Kategori",
        run: () => onNavigate("transaksi"),
      }));

    return [...base, ...categoryCmds];
  }, [categories, onAdd, onNavigate, setTheme, theme]);

  // Filter commands by query
  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => {
      const hay = [
        c.label.toLowerCase(),
        c.hint?.toLowerCase() ?? "",
        ...(c.keywords ?? []),
        c.group.toLowerCase(),
      ].join(" ");
      return hay.includes(q);
    });
  }, [commands, query]);

  // Sort: recent first when query empty
  const orderedFiltered = React.useMemo(() => {
    if (query.trim() || recentIds.length === 0) return filtered;
    const recent = recentIds
      .map((id) => filtered.find((c) => c.id === id))
      .filter((c): c is CommandItem => Boolean(c));
    const rest = filtered.filter((c) => !recentIds.includes(c.id));
    return [...recent, ...rest];
  }, [filtered, query, recentIds]);

  // Reset selection when open or query changes
  React.useEffect(() => {
    setActiveIdx(0);
  }, [query, open]);

  // Focus input when opening
  React.useEffect(() => {
    if (open) {
      setQuery("");
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Esc to close (handled in keydown below)
  // Cmd/Ctrl+K to toggle
  React.useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Lock body scroll when open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Track recent
  const trackRecent = React.useCallback((id: string) => {
    setRecentIds((prev) => {
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const selectCmd = React.useCallback(
    (cmd: CommandItem) => {
      trackRecent(cmd.id);
      onOpenChange(false);
      // Defer execution so the palette can close first
      setTimeout(() => cmd.run(), 50);
    },
    [onOpenChange, trackRecent],
  );

  // Keyboard nav inside palette
  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, orderedFiltered.length - 1));
      scrollActiveIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
      scrollActiveIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = orderedFiltered[activeIdx];
      if (cmd) selectCmd(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  }

  function scrollActiveIntoView() {
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector<HTMLElement>(
        `[data-cmd-idx="${activeIdx}"]`,
      );
      el?.scrollIntoView({ block: "nearest" });
    });
  }

  // Group for section rendering
  const grouped = React.useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const c of orderedFiltered) {
      const arr = map.get(c.group) ?? [];
      arr.push(c);
      map.set(c.group, arr);
    }
    // Preserve order: Aksi, Navigasi, Tema, Kategori
    const order = ["Aksi", "Navigasi", "Tema", "Kategori"];
    return order
      .filter((g) => map.has(g))
      .map((g) => ({ group: g, items: map.get(g)! }));
  }, [orderedFiltered]);

  // Build a flat index for selection
  const flatIds = orderedFiltered.map((c) => c.id);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh] sm:pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          {/* Backdrop */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Tutup command palette"
            onClick={() => onOpenChange(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onKeyDown={onKeyDown}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik perintah atau cari… (mis. tambah, makanan, mode gelap)"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              className="max-h-[60vh] overflow-y-auto custom-scrollbar p-2"
            >
              {orderedFiltered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Search className="h-6 w-6 text-muted-foreground/60" />
                  <p className="text-sm font-medium text-foreground">
                    Tidak ada hasil untuk &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Coba kata kunci lain atau buat transaksi baru.
                  </p>
                </div>
              ) : (
                grouped.map((section) => (
                  <div key={section.group} className="mb-2">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.group}
                      {section.group === "Aksi" && !query.trim() && recentIds.length > 0
                        ? " · Terakhir"
                        : ""}
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map((cmd) => {
                        const idx = flatIds.indexOf(cmd.id);
                        const active = idx === activeIdx;
                        return (
                          <button
                            key={cmd.id}
                            data-cmd-idx={idx}
                            type="button"
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => selectCmd(cmd)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                              active
                                ? "bg-accent text-accent-foreground"
                                : "hover:bg-accent/60",
                            )}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted/60">
                              {cmd.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-foreground">
                                {cmd.label}
                              </p>
                              {cmd.hint && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {cmd.hint}
                                </p>
                              )}
                            </div>
                            {active && (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  navigasi
                </span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" />
                  pilih
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono">
                    Esc
                  </kbd>
                  tutup
                </span>
              </div>
              <span className="hidden sm:inline">
                {orderedFiltered.length} perintah
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
