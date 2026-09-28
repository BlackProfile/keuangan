"use client";

import * as React from "react";
import {
  Home,
  ListPlus,
  Wallet,
  Target,
  Users,
  FileBarChart,
  Settings,
  Plus,
  Menu,
  X,
  Coffee,
  Bell,
  ArrowDown,
  ArrowUp,
  Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";
import { ThemePicker } from "@/components/finance/theme-picker";

/**
 * SectionId — simplified 7 main sections + hub sub-sections.
 *
 * Main 7 (sidebar / desktop):
 *   beranda, transaksi, uang-saku, target, patungan, laporan, pengaturan
 *
 * Hub sub-sections (navigated to from hub cards):
 *   patungan-bill, patungan-debt, laporan-insight, laporan-export,
 *   pengaturan-keamanan, pengaturan-akun, pengaturan-kategori,
 *   pengaturan-tagihan, pengaturan-anggaran
 */
export type SectionId =
  | "beranda"
  | "transaksi"
  | "uang-saku"
  | "target"
  | "patungan"
  | "patungan-bill"
  | "patungan-debt"
  | "laporan"
  | "laporan-insight"
  | "laporan-export"
  | "pengaturan"
  | "pengaturan-keamanan"
  | "pengaturan-akun"
  | "pengaturan-kategori"
  | "pengaturan-tagihan"
  | "pengaturan-anggaran";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "beranda", label: "Beranda", icon: <Home className="h-4 w-4" /> },
  { id: "transaksi", label: "Transaksi", icon: <ListPlus className="h-4 w-4" /> },
  { id: "uang-saku", label: "Uang Saku", icon: <Wallet className="h-4 w-4" /> },
  { id: "target", label: "Target", icon: <Target className="h-4 w-4" /> },
  { id: "patungan", label: "Patungan", icon: <Users className="h-4 w-4" /> },
  { id: "laporan", label: "Laporan", icon: <FileBarChart className="h-4 w-4" /> },
  { id: "pengaturan", label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { id: "beranda", label: "Home", icon: <Home className="h-5 w-5" />, badge: false },
  { id: "transaksi", label: "Catat", icon: <ListPlus className="h-5 w-5" />, badge: false },
  { id: "uang-saku", label: "Saku", icon: <Wallet className="h-5 w-5" />, badge: false },
  { id: "target", label: "Target", icon: <Target className="h-5 w-5" />, badge: false },
  { id: "patungan", label: "Bagi", icon: <Users className="h-5 w-5" />, badge: false },
  { id: "pengaturan", label: "Lainnya", icon: <Settings className="h-5 w-5" />, badge: false },
];

interface Props {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  onAdd: () => void;
  onJajan: () => void;
  onOpenSearch?: () => void;
  children: React.ReactNode;
}

export function AppShell({ active, onNavigate, onAdd, onJajan, onOpenSearch, children }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [fabExpanded, setFabExpanded] = React.useState(false);

  // Resolve which main section the active id belongs to (for highlighting).
  const activeMain: SectionId = (() => {
    if (active.startsWith("patungan")) return "patungan";
    if (active.startsWith("laporan")) return "laporan";
    if (active.startsWith("pengaturan")) return "pengaturan";
    return active;
  })();

  function handleNavigate(id: SectionId) {
    onNavigate(id);
    setMobileOpen(false);
  }

  const activeLabel =
    NAV_ITEMS.find((i) => i.id === activeMain)?.label ?? "DompetKu";

  return (
    <div className="flex min-h-screen bg-background">
      {/* ============ Desktop sidebar ============ */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card/50 backdrop-blur-sm lg:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Wallet className="h-5 w-5" />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">DompetKu</p>
            <p className="text-[11px] text-muted-foreground">Keuangan Pribadi</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4">
          <div className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeMain === item.id}
                onClick={() => handleNavigate(item.id)}
              />
            ))}
          </div>
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <Button
            onClick={onJajan}
            variant="outline"
            className="w-full gap-1.5"
          >
            <Coffee className="h-4 w-4" />
            Jajan Cepat
          </Button>
          <Button onClick={onAdd} className="w-full gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Tambah Transaksi
          </Button>
        </div>
      </aside>

      {/* ============ Main area ============ */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:hidden">
          <div className="flex items-center gap-2.5">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigasi</SheetTitle>
                <div className="flex h-16 items-center justify-between gap-2 border-b border-border px-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Wallet className="h-5 w-5" />
                    </span>
                    <span className="text-sm font-bold">DompetKu</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setMobileOpen(false)}
                    aria-label="Tutup menu"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav
                  className="overflow-y-auto custom-scrollbar p-3"
                  style={{ height: "calc(100vh - 4rem)" }}
                >
                  <div className="space-y-0.5">
                    {NAV_ITEMS.map((item) => (
                      <NavButton
                        key={item.id}
                        item={item}
                        active={activeMain === item.id}
                        onClick={() => handleNavigate(item.id)}
                      />
                    ))}
                  </div>
                  <div className="mt-3 space-y-2 border-t border-border pt-3">
                    <Button
                      onClick={() => {
                        onJajan();
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full gap-1.5"
                    >
                      <Coffee className="h-4 w-4" />
                      Jajan Cepat
                    </Button>
                    <Button
                      onClick={() => {
                        onAdd();
                        setMobileOpen(false);
                      }}
                      className="w-full gap-1.5"
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Transaksi
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="h-4 w-4" />
              </span>
              <span className="text-sm font-bold">DompetKu</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {onOpenSearch && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={onOpenSearch}
                aria-label="Cari perintah (Cmd+K)"
                title="Cari perintah (Cmd+K)"
              >
                <Search className="h-4 w-4" />
              </Button>
            )}
            <ThemePicker />
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-6 backdrop-blur-md lg:flex">
          <h1 className="text-lg font-bold tracking-tight">{activeLabel}</h1>
          <div className="flex items-center gap-1.5">
            {onOpenSearch && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSearch}
                className="gap-2 text-muted-foreground"
                aria-label="Cari perintah (Cmd+K)"
              >
                <Search className="h-4 w-4" />
                <span className="hidden xl:inline">Cari…</span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium sm:inline">
                  ⌘K
                </kbd>
              </Button>
            )}
            <ThemePicker />
            <NotificationsBell />
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 py-4 pb-32 sm:px-6 sm:py-6 lg:pb-6">
          <div className="mx-auto w-full lg:max-w-5xl xl:max-w-6xl">
            {children}
          </div>
        </main>

        {/* Footer (desktop only — mobile uses bottom nav) */}
        <footer className="mt-auto hidden border-t border-border bg-muted/40 lg:block">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6">
            <div className="flex flex-col items-center justify-between gap-2 text-center text-[11px] text-muted-foreground sm:flex-row sm:text-left">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <strong className="font-medium text-foreground">DompetKu</strong>
                {" · "}Data tersimpan lokal di perangkat Anda
              </span>
              <span>{new Date().getFullYear()} · Next.js + Prisma</span>
            </div>
          </div>
        </footer>
      </div>

      {/* ============ Mobile bottom navigation (Material 3 style) ============ */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch justify-around border-t border-border bg-background/95 backdrop-blur-md lg:hidden">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = activeMain === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavigate(item.id)}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              <span
                className={cn(
                  "relative flex items-center justify-center rounded-full px-3 py-1.5 transition-colors duration-200",
                  isActive ? "bg-primary/15" : "bg-transparent",
                )}
              >
                <motion.span
                  animate={{ scale: isActive ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  className={cn(
                    "flex items-center justify-center",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.icon}
                </motion.span>
                {item.badge && (
                  <span
                    className="absolute right-1 top-0 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background"
                    aria-hidden="true"
                  />
                )}
              </span>
              <span
                className={cn(
                  "transition-colors",
                  isActive
                    ? "text-primary font-medium"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ============ Mobile expandable FAB (Material 3 Speed Dial) ============ */}
      {/* Dark scrim when expanded */}
      <AnimatePresence>
        {fabExpanded && (
          <motion.button
            key="fab-scrim"
            onClick={() => setFabExpanded(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm sm:hidden"
            aria-label="Tutup menu aksi cepat"
            tabIndex={fabExpanded ? 0 : -1}
          />
        )}
      </AnimatePresence>

      {/* FAB + speed dial options */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-2 sm:hidden">
        <AnimatePresence>
          {fabExpanded && (
            <>
              <motion.button
                key="fab-pemasukan"
                onClick={() => {
                  onAdd();
                  setFabExpanded(false);
                }}
                initial={{ opacity: 0, y: 24, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.85 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                  delay: 0,
                }}
                className="flex items-center gap-2 rounded-full bg-emerald-600 py-2 pl-4 pr-2 text-white shadow-lg shadow-emerald-600/30"
                aria-label="Tambah pemasukan"
              >
                <span className="text-sm font-medium">Pemasukan</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/50">
                  <ArrowDown className="h-4 w-4" />
                </span>
              </motion.button>

              <motion.button
                key="fab-pengeluaran"
                onClick={() => {
                  onAdd();
                  setFabExpanded(false);
                }}
                initial={{ opacity: 0, y: 24, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.85 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                  delay: 0.05,
                }}
                className="flex items-center gap-2 rounded-full bg-rose-500 py-2 pl-4 pr-2 text-white shadow-lg shadow-rose-500/30"
                aria-label="Tambah pengeluaran"
              >
                <span className="text-sm font-medium">Pengeluaran</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-400/50">
                  <ArrowUp className="h-4 w-4" />
                </span>
              </motion.button>

              <motion.button
                key="fab-jajan"
                onClick={() => {
                  onJajan();
                  setFabExpanded(false);
                }}
                initial={{ opacity: 0, y: 24, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.85 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 22,
                  delay: 0.1,
                }}
                className="flex items-center gap-2 rounded-full bg-amber-500 py-2 pl-4 pr-2 text-white shadow-lg shadow-amber-500/30"
                aria-label="Jajan cepat"
              >
                <span className="text-sm font-medium">Jajan cepat</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400/50">
                  <Coffee className="h-4 w-4" />
                </span>
              </motion.button>
            </>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => setFabExpanded((v) => !v)}
          whileTap={{ scale: 0.9 }}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30"
          aria-label={fabExpanded ? "Tutup menu aksi cepat" : "Tambah transaksi"}
          aria-expanded={fabExpanded}
          aria-haspopup="menu"
        >
          <motion.span
            animate={{ rotate: fabExpanded ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            className="flex items-center justify-center"
          >
            <Plus className="h-6 w-6" />
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
      aria-current={active ? "page" : undefined}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </button>
  );
}
