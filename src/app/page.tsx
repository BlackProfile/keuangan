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
import { DebtsSection } from "@/components/finance/debts-section";
import { TemplatesSection } from "@/components/finance/templates-section";
import { LockScreen } from "@/components/finance/lock-screen";
import { SecuritySection } from "@/components/finance/security-section";
import { AuditSection } from "@/components/finance/audit-section";
import { SharesSection } from "@/components/finance/shares-section";
import { ExportSection } from "@/components/finance/export-section";
import { StudentSection } from "@/components/finance/student-section";
import { PatunganSection } from "@/components/finance/patungan-section";
import { JajanButton } from "@/components/finance/jajan-button";
import {
  useCategories,
  useCreateTransaction,
  useRunRecurring,
  useSeed,
  useSecuritySettings,
  usePanicWipe,
} from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";
import type { SecurityConfig } from "@/lib/security-defaults";
import {
  DEFAULT_SECURITY_CONFIG,
  parseSecurityConfig,
} from "@/lib/security-defaults";
import { useSecurityStore } from "@/lib/security-store";
import { useSecuritySync } from "@/lib/use-security-sync";
import { auditLog, AUDIT_ACTIONS } from "@/lib/audit";
import {
  useRealtimeSync,
  useSecurityLockSync,
  broadcastLock,
  broadcastUnlock,
} from "@/lib/use-realtime-sync";

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
  const [isBlurred, setIsBlurred] = React.useState(false);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: securityRaw } = useSecuritySettings();
  const seedMut = useSeed();
  const recurringMut = useRunRecurring();
  const createMut = useCreateTransaction();
  const panicWipeMut = usePanicWipe();
  const securityStore = useSecurityStore();

  // Sync security secrets (pinHash, passwordHash, duressPinHash) from server
  // to local store — ensures same PIN works across all devices.
  useSecuritySync();

  // Realtime sync — invalidates queries when data changes on other devices
  useRealtimeSync();

  // When another device locks, lock this device too
  useSecurityLockSync((reason) => {
    if (lockEnabled && !securityStore.isLocked) {
      securityStore.lock();
      auditLog(AUDIT_ACTIONS.LOCK, reason || "synced from other device");
    }
  });

  // Broadcast lock/unlock events to other devices
  const prevLockedRef = React.useRef(securityStore.isLocked);
  React.useEffect(() => {
    const nowLocked = securityStore.isLocked;
    if (nowLocked !== prevLockedRef.current) {
      prevLockedRef.current = nowLocked;
      if (nowLocked) {
        broadcastLock("manual lock");
      } else {
        broadcastUnlock();
      }
    }
  }, [securityStore.isLocked]);

  // Parse security config
  const securityConfig: SecurityConfig = React.useMemo(() => {
    if (!securityRaw) return DEFAULT_SECURITY_CONFIG;
    return parseSecurityConfig(securityRaw);
  }, [securityRaw]);

  // Determine if app should be locked (only if any lock method enabled)
  const lockEnabled =
    securityConfig.pinEnabled ||
    securityConfig.passwordEnabled ||
    securityConfig.biometricEnabled ||
    securityConfig.patternEnabled;

  // On mount: if lock enabled and store says locked, keep locked. If lock disabled, ensure unlocked.
  React.useEffect(() => {
    if (!lockEnabled) {
      if (securityStore.isLocked) securityStore.unlock();
    } else {
      // If lock enabled and not yet locked, lock on first load
      if (!securityStore.isLocked && !securityStore.unlockedAt) {
        securityStore.lock();
      }
    }
  }, [lockEnabled, securityStore]);

  // Auto-lock on idle
  React.useEffect(() => {
    if (!securityConfig.autoLockEnabled || !lockEnabled) return;
    if (securityStore.isLocked) return;
    const minutes = securityConfig.autoLockMinutes;
    const interval = setInterval(() => {
      const idleMs = Date.now() - securityStore.lastActivity;
      if (idleMs >= minutes * 60_000) {
        securityStore.lock();
        auditLog(AUDIT_ACTIONS.LOCK, "auto-lock idle");
      }
    }, 10_000); // check every 10s
    return () => clearInterval(interval);
  }, [
    securityConfig.autoLockEnabled,
    securityConfig.autoLockMinutes,
    lockEnabled,
    securityStore,
  ]);

  // Touch on activity (mouse/keyboard)
  React.useEffect(() => {
    if (!securityConfig.autoLockEnabled || !lockEnabled) return;
    const handler = () => securityStore.touch();
    const events: Array<keyof WindowEventMap> = [
      "mousemove",
      "keydown",
      "click",
      "scroll",
      "touchstart",
    ];
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [securityConfig.autoLockEnabled, lockEnabled, securityStore]);

  // Lock on tab switch (visibilitychange)
  React.useEffect(() => {
    if (!securityConfig.lockOnTabSwitch || !lockEnabled) return;
    const handler = () => {
      if (document.visibilityState === "hidden") {
        securityStore.lock();
        auditLog(AUDIT_ACTIONS.LOCK, "tab switch");
      } else if (securityConfig.blurOnBackground) {
        setIsBlurred(false);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [securityConfig.lockOnTabSwitch, securityConfig.blurOnBackground, lockEnabled, securityStore]);

  // Blur on background (when window loses focus)
  React.useEffect(() => {
    if (!securityConfig.blurOnBackground) return;
    const handler = () => {
      if (document.visibilityState === "hidden" || !document.hasFocus()) {
        setIsBlurred(true);
      } else {
        setIsBlurred(false);
      }
    };
    const events: Array<keyof WindowEventMap> = ["blur", "focus"];
    events.forEach((e) => window.addEventListener(e, handler));
    document.addEventListener("visibilitychange", handler);
    return () => {
      events.forEach((e) => window.removeEventListener(e, handler));
      document.removeEventListener("visibilitychange", handler);
    };
  }, [securityConfig.blurOnBackground]);

  // Lock on app close (beforeunload)
  React.useEffect(() => {
    if (!securityConfig.lockOnAppClose || !lockEnabled) return;
    const handler = () => {
      securityStore.lock();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [securityConfig.lockOnAppClose, lockEnabled, securityStore]);

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
    createMut.mutate(data, {
      onError: () => {
        setPrefill(data);
        setEditing(null);
        setFormOpen(true);
      },
    });
  }

  function handlePanic() {
    panicWipeMut.mutate(undefined, {
      onSuccess: () => {
        auditLog(AUDIT_ACTIONS.PANIC_WIPE, "gesture triggered");
        window.location.reload();
      },
    });
  }

  // Show lock screen if locked and lock is enabled
  const showLockScreen = lockEnabled && securityStore.isLocked;

  return (
    <>
      <div className={isBlurred ? "blur-sm transition-all duration-200" : "transition-all duration-200"}>
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
              {section === "debts" && <DebtsSection />}
              {section === "templates" && <TemplatesSection />}
              {section === "student" && <StudentSection />}
              {section === "patungan" && <PatunganSection />}
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
              {section === "security" && <SecuritySection />}
              {section === "audit" && <AuditSection />}
              {section === "shares" && <SharesSection />}
              {section === "export" && <ExportSection />}
              {section === "settings" && <SecuritySection />}
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

          {/* Quick Jajan Button (student feature) */}
          <JajanButton />
        </AppShell>
      </div>

      {/* Lock Screen Overlay */}
      {showLockScreen && (
        <LockScreen
          config={securityConfig}
          onUnlock={() => {
            // unlocked via store; will re-render
          }}
          onDecoy={() => {
            // decoy mode active; could show decoy data
          }}
          onPanic={securityConfig.panicWipeEnabled ? handlePanic : undefined}
        />
      )}
    </>
  );
}
