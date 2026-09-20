"use client";

import * as React from "react";
import {
  LayoutDashboard,
  ListChecks,
  Wallet,
  Target,
  Landmark,
  RefreshCw,
  CalendarDays,
  BarChart3,
  Bot,
  Tags,
  Settings,
  Plus,
  Menu,
  Moon,
  Sun,
  X,
  HandCoins,
  Zap,
  ShieldCheck,
  Activity,
  Share2,
  Download,
  GraduationCap,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/theme-toggle";
import { LucideIcon } from "@/components/lucide-icon";

export type SectionId =
  | "dashboard"
  | "transactions"
  | "budgets"
  | "goals"
  | "accounts"
  | "recurring"
  | "debts"
  | "templates"
  | "student"
  | "patungan"
  | "calendar"
  | "analytics"
  | "ai"
  | "categories"
  | "shares"
  | "security"
  | "audit"
  | "export"
  | "settings";

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}
interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: "Utama",
    items: [
      { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
      { id: "transactions", label: "Transaksi", icon: <ListChecks className="h-4 w-4" /> },
    ],
  },
  {
    title: "Keuangan",
    items: [
      { id: "budgets", label: "Anggaran", icon: <Wallet className="h-4 w-4" /> },
      { id: "goals", label: "Target", icon: <Target className="h-4 w-4" /> },
      { id: "accounts", label: "Akun", icon: <Landmark className="h-4 w-4" /> },
      { id: "recurring", label: "Berulang", icon: <RefreshCw className="h-4 w-4" /> },
      { id: "debts", label: "Hutang & Piutang", icon: <HandCoins className="h-4 w-4" /> },
      { id: "templates", label: "Template", icon: <Zap className="h-4 w-4" /> },
    ],
  },
  {
    title: "Mahasiswa",
    items: [
      { id: "student", label: "Uang Saku", icon: <GraduationCap className="h-4 w-4" /> },
      { id: "patungan", label: "Patungan", icon: <Users className="h-4 w-4" /> },
    ],
  },
  {
    title: "Insight",
    items: [
      { id: "calendar", label: "Kalender", icon: <CalendarDays className="h-4 w-4" /> },
      { id: "analytics", label: "Analitik", icon: <BarChart3 className="h-4 w-4" /> },
      { id: "ai", label: "AI Asisten", icon: <Bot className="h-4 w-4" /> },
    ],
  },
  {
    title: "Lainnya",
    items: [
      { id: "categories", label: "Kategori", icon: <Tags className="h-4 w-4" /> },
      { id: "shares", label: "Link Berbagi", icon: <Share2 className="h-4 w-4" /> },
      { id: "export", label: "Export Data", icon: <Download className="h-4 w-4" /> },
      { id: "security", label: "Pengaturan", icon: <Settings className="h-4 w-4" /> },
      { id: "audit", label: "Audit Log", icon: <Activity className="h-4 w-4" /> },
    ],
  },
];

interface Props {
  active: SectionId;
  onNavigate: (id: SectionId) => void;
  onAdd: () => void;
  children: React.ReactNode;
}

export function AppShell({ active, onNavigate, onAdd, children }: Props) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  function handleNavigate(id: SectionId) {
    onNavigate(id);
    setMobileOpen(false);
  }

  const activeLabel =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.id === active)?.label ??
    "DompetKu";

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
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
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavButton
                    key={item.id}
                    item={item}
                    active={active === item.id}
                    onClick={() => handleNavigate(item.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <Button onClick={onAdd} className="w-full gap-1.5 shadow-sm">
            <Plus className="h-4 w-4" />
            Tambah Transaksi
          </Button>
        </div>
      </aside>

      {/* Main area */}
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
                </div>
                <nav className="overflow-y-auto custom-scrollbar p-3" style={{ height: "calc(100vh - 4rem)" }}>
                  {NAV_GROUPS.map((group) => (
                    <div key={group.title} className="mb-4">
                      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.title}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <NavButton
                            key={item.id}
                            item={item}
                            active={active === item.id}
                            onClick={() => handleNavigate(item.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 px-3">
                    <Button onClick={() => { onAdd(); setMobileOpen(false); }} className="w-full gap-1.5">
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
            <ThemeToggle />
          </div>
        </header>

        {/* Desktop header */}
        <header className="sticky top-0 z-30 hidden h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-6 backdrop-blur-md lg:flex">
          <h1 className="text-lg font-bold tracking-tight">{activeLabel}</h1>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 px-4 py-5 pb-24 sm:px-6 sm:py-6 lg:pb-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border bg-muted/40">
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

      {/* Mobile FAB */}
      <button
        onClick={onAdd}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl shadow-primary/30 transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label="Tambah transaksi"
      >
        <Plus className="h-6 w-6" />
      </button>
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
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {item.icon}
      <span className="truncate">{item.label}</span>
    </button>
  );
}
