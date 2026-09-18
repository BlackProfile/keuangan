"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { AppShell, type SectionId } from "@/components/layout/app-shell";
import { TransactionForm } from "@/components/finance/transaction-form";
import { DashboardTab } from "@/components/finance/dashboard-tab";
import { TransactionList } from "@/components/finance/transaction-list";
import { CategoryManager } from "@/components/finance/category-manager";
import { BudgetsSection } from "@/components/finance/budgets-section";
import { GoalsSection } from "@/components/finance/goals-section";
import { AccountsSection } from "@/components/finance/accounts-section";
import { RecurringSection } from "@/components/finance/recurring-section";
import { CalendarSection } from "@/components/finance/calendar-section";
import { AnalyticsSection } from "@/components/finance/analytics-section";
import { AiSection } from "@/components/finance/ai-section";
import { SettingsSection } from "@/components/finance/settings-section";
import { useCategories, useCreateTransaction, useRunRecurring, useSeed } from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";

interface PrefillData {
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  merchant?: string;
}

export default function Home() {
  const [section, setSection] = React.useState<SectionId>("dashboard");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [prefill, setPrefill] = React.useState<PrefillData | null>(null);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const seedMut = useSeed();
  const recurringMut = useRunRecurring();
  const createMut = useCreateTransaction();

  // Auto-seed on first load
  const seededRef = React.useRef(false);
  React.useEffect(() => {
    if (seededRef.current) return;
    if (catsLoading) return;
    if (categories && categories.length === 0 && !seedMut.isPending) {
      seededRef.current = true;
      seedMut.mutate();
    }
  }, [categories, catsLoading, seedMut]);

  // Run recurring on load (once per session)
  const recurringRanRef = React.useRef(false);
  React.useEffect(() => {
    if (recurringRanRef.current) return;
    if (categories && categories.length > 0 && !recurringMut.isPending) {
      recurringRanRef.current = true;
      recurringMut.mutate();
    }
  }, [categories, recurringMut]);

  function openAdd() {
    setEditing(null);
    setPrefill(null);
    setFormOpen(true);
  }

  function openEdit(t: Transaction) {
    setEditing(t);
    setPrefill(null);
    setFormOpen(true);
  }

  function handleAiCreateTransaction(data: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    merchant?: string;
  }) {
    // Find category by id or name; if not found, open form prefilled
    createMut.mutate(data, {
      onSuccess: () => {
        // toast handled by hook? no, show here
      },
      onError: () => {
        // Fallback: open the form prefilled
        setPrefill(data);
        setEditing(null);
        setFormOpen(true);
      },
    });
  }

  return (
    <AppShell active={section} onNavigate={setSection} onAdd={openAdd}>
      <AnimatePresence mode="wait">
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
        >
          {section === "dashboard" && (
            <DashboardTab
              onAdd={openAdd}
              onEdit={openEdit}
              onViewAll={() => setSection("transactions")}
            />
          )}
          {section === "transactions" && (
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
          {section === "budgets" && <BudgetsSection />}
          {section === "goals" && <GoalsSection />}
          {section === "accounts" && <AccountsSection />}
          {section === "recurring" && <RecurringSection />}
          {section === "calendar" && <CalendarSection />}
          {section === "analytics" && <AnalyticsSection />}
          {section === "ai" && (
            <AiSection
              onCreateTransaction={handleAiCreateTransaction}
              onNavigateToAdd={openAdd}
            />
          )}
          {section === "categories" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight">Kategori</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Atur kategori untuk pemasukan dan pengeluaran.
                </p>
              </div>
              <CategoryManager />
            </div>
          )}
          {section === "settings" && <SettingsSection />}
        </motion.div>
      </AnimatePresence>

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
        prefill={prefill}
      />
    </AppShell>
  );
}
