"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  ListChecks,
  Tags,
  Plus,
  Wallet,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeToggle } from "@/components/theme-toggle";
import { TransactionForm } from "@/components/finance/transaction-form";
import { DashboardTab } from "@/components/finance/dashboard-tab";
import { TransactionList } from "@/components/finance/transaction-list";
import { CategoryManager } from "@/components/finance/category-manager";
import { useCategories, useSeed } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";
import { cn } from "@/lib/utils";

type TabValue = "dashboard" | "transactions" | "categories";

export default function Home() {
  const [tab, setTab] = React.useState<TabValue>("dashboard");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const seedMut = useSeed();

  // Auto-seed default categories (and sample data) on first load if empty
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (seededRef.current) return;
    if (catsLoading) return;
    if (categories && categories.length === 0 && !seedMut.isPending) {
      seededRef.current = true;
      seedMut.mutate();
    }
  }, [categories, catsLoading, seedMut]);

  function openAdd() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setFormOpen(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Wallet className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-bold tracking-tight text-foreground">
                DompetKu
              </h1>
              <p className="hidden text-[11px] text-muted-foreground sm:block">
                Catatan Pemasukan & Pengeluaran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <Button
              onClick={openAdd}
              size="sm"
              className="gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Transaksi</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs nav */}
      <nav className="sticky top-16 z-30 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as TabValue)}
            className="w-full"
          >
            <TabsList className="h-12 w-full justify-start gap-1 rounded-none border-0 bg-transparent p-0">
              <TabTrigger
                value="dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
                label="Dashboard"
              />
              <TabTrigger
                value="transactions"
                icon={<ListChecks className="h-4 w-4" />}
                label="Transaksi"
              />
              <TabTrigger
                value="categories"
                icon={<Tags className="h-4 w-4" />}
                label="Kategori"
              />
            </TabsList>
          </Tabs>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            {tab === "dashboard" && (
              <DashboardTab
                onAdd={openAdd}
                onEdit={openEdit}
                onViewAll={() => setTab("transactions")}
              />
            )}
            {tab === "transactions" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Semua Transaksi
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Kelola dan tinjau seluruh catatan keuangan Anda.
                  </p>
                </div>
                <TransactionList onEdit={openEdit} />
              </div>
            )}
            {tab === "categories" && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">
                    Kategori
                  </h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Atur kategori untuk pemasukan dan pengeluaran.
                  </p>
                </div>
                <CategoryManager />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-muted/30">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-xs text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <span className="flex items-center gap-1.5">
            <Wallet className="h-3.5 w-3.5 text-primary" />
            <span>
              <strong className="font-medium text-foreground">DompetKu</strong>{" "}
              · Catatan keuangan pribadi
            </span>
          </span>
          <span>
            Dibuat dengan Next.js &amp; Prisma · {new Date().getFullYear()}
          </span>
        </div>
      </footer>

      {/* Floating Action Button (mobile) */}
      <button
        onClick={openAdd}
        className="fixed bottom-6 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 sm:hidden"
        aria-label="Tambah transaksi"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Loading overlay for seed */}
      {seedMut.isPending && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-5 shadow-xl">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Menyiapkan data...</p>
          </div>
        </div>
      )}

      {/* Transaction Form Dialog */}
      <TransactionForm
        open={formOpen}
        onOpenChange={setFormOpen}
        transaction={editing}
      />
    </div>
  );
}

function TabTrigger({
  value,
  icon,
  label,
}: {
  value: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "h-12 gap-1.5 rounded-none border-b-2 border-transparent px-3 text-sm font-medium text-muted-foreground",
        "data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none",
        "hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </TabsTrigger>
  );
}
