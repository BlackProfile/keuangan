"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

import { AppShell, type SectionId } from "@/components/layout/app-shell";
import { TransactionForm } from "@/components/finance/transaction-form";
import { DashboardTab } from "@/components/finance/dashboard-tab";
import { TransactionList } from "@/components/finance/transaction-list";
import { JajanButton } from "@/components/finance/jajan-button";
import { LockScreen } from "@/components/finance/lock-screen";
import { GoalsSection } from "@/components/finance/goals-section";
import { BudgetsSection } from "@/components/finance/budgets-section";
import { CommandPalette } from "@/components/finance/command-palette";
import {
  PengaturanHub,
  PatunganHub,
  LaporanHub,
} from "@/components/finance/hub-pages";
import { Breadcrumb } from "@/components/finance/breadcrumb";

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

/* ------------------------------------------------------------------ */
/*  Lazy-loaded sections                                              */
/* ------------------------------------------------------------------ */

const StudentSection = React.lazy(() =>
  import("@/components/finance/student-section").then((m) => ({
    default: m.StudentSection,
  })),
);

const PatunganSection = React.lazy(() =>
  import("@/components/finance/patungan-section").then((m) => ({
    default: m.PatunganSection,
  })),
);

const DebtsSection = React.lazy(() =>
  import("@/components/finance/debts-section").then((m) => ({
    default: m.DebtsSection,
  })),
);

const AccountsSection = React.lazy(() =>
  import("@/components/finance/accounts-section").then((m) => ({
    default: m.AccountsSection,
  })),
);

// BillsSection = RecurringSection (alias, since "Bills" is the recurring bills)
const BillsSection = React.lazy(() =>
  import("@/components/finance/recurring-section").then((m) => ({
    default: m.RecurringSection,
  })),
);

const CategoryManager = React.lazy(() =>
  import("@/components/finance/category-manager").then((m) => ({
    default: m.CategoryManager,
  })),
);

const SecuritySection = React.lazy(() =>
  import("@/components/finance/security-section").then((m) => ({
    default: m.SecuritySection,
  })),
);

const ExportSection = React.lazy(() =>
  import("@/components/finance/export-section").then((m) => ({
    default: m.ExportSection,
  })),
);

// InsightsSection = AnalyticsSection (alias)
const InsightsSection = React.lazy(() =>
  import("@/components/finance/analytics-section").then((m) => ({
    default: m.AnalyticsSection,
  })),
);

/* ------------------------------------------------------------------ */
/*  Section skeleton (lazy fallback)                                   */
/* ------------------------------------------------------------------ */

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-6 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-32 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
      <div className="h-24 animate-pulse rounded-xl bg-muted" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Prefill type                                                      */
/* ------------------------------------------------------------------ */

interface PrefillData {
  type?: TransactionType;
  amount?: number;
  description?: string;
  date?: string;
  categoryId?: string;
  merchant?: string;
}

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function Home() {
  const [section, setSection] = React.useState<SectionId>("beranda");
  const [formOpen, setFormOpen] = React.useState(false);
  const [jajanOpen, setJajanOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [prefill, setPrefill] = React.useState<PrefillData | null>(null);
  const [isBlurred, setIsBlurred] = React.useState(false);
  const [cmdOpen, setCmdOpen] = React.useState(false);

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: securityRaw } = useSecuritySettings();
  const seedMut = useSeed();
  const recurringMut = useRunRecurring();
  const createMut = useCreateTransaction();
  const panicWipeMut = usePanicWipe();
  const securityStore = useSecurityStore();

  // Sync security secrets (pinHash, passwordHash, duressPinHash) from server
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

  const lockEnabled =
    securityConfig.pinEnabled ||
    securityConfig.passwordEnabled ||
    securityConfig.biometricEnabled ||
    securityConfig.patternEnabled;

  React.useEffect(() => {
    if (!lockEnabled) {
      if (securityStore.isLocked) securityStore.unlock();
    } else {
      if (!securityStore.isLocked && !securityStore.unlockedAt) {
        securityStore.lock();
      }
    }
  }, [lockEnabled, securityStore]);

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
    }, 10_000);
    return () => clearInterval(interval);
  }, [
    securityConfig.autoLockEnabled,
    securityConfig.autoLockMinutes,
    lockEnabled,
    securityStore,
  ]);

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
    events.forEach((e) =>
      window.addEventListener(e, handler, { passive: true }),
    );
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [securityConfig.autoLockEnabled, lockEnabled, securityStore]);

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
  }, [
    securityConfig.lockOnTabSwitch,
    securityConfig.blurOnBackground,
    lockEnabled,
    securityStore,
  ]);

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

  function goBackToHub() {
    if (section.startsWith("patungan")) setSection("patungan");
    else if (section.startsWith("laporan")) setSection("laporan");
    else if (section.startsWith("pengaturan")) setSection("pengaturan");
    else setSection("beranda");
  }

  const showLockScreen = lockEnabled && securityStore.isLocked;
  const locked = showLockScreen;

  /* -------------------- Render helpers -------------------- */

  function renderSection() {
    switch (section) {
      case "beranda":
        return (
          <DashboardTab
            onAdd={openAdd}
            onEdit={openEdit}
            onViewAll={() => setSection("transaksi")}
          />
        );

      case "transaksi":
        return (
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
        );

      case "uang-saku":
        return (
          <React.Suspense fallback={<SectionSkeleton />}>
            <StudentSection />
          </React.Suspense>
        );

      case "target":
        return <GoalsSection />;

      case "patungan":
        return <PatunganHub onNavigate={setSection} />;

      case "patungan-bill":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Patungan", "Split Bill"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <PatunganSection />
            </React.Suspense>
          </div>
        );

      case "patungan-debt":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Patungan", "Hutang & Piutang"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <DebtsSection />
            </React.Suspense>
          </div>
        );

      case "laporan":
        return <LaporanHub onNavigate={setSection} />;

      case "laporan-insight":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Laporan", "Insight & Tips"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <InsightsSection />
            </React.Suspense>
          </div>
        );

      case "laporan-export":
        return (
          <div className="space-y-4">
            <Breadcrumb crumbs={["Laporan", "Export Data"]} onBack={goBackToHub} />
            <React.Suspense fallback={<SectionSkeleton />}>
              <ExportSection />
            </React.Suspense>
          </div>
        );

      case "pengaturan":
        return <PengaturanHub onNavigate={setSection} />;

      case "pengaturan-keamanan":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Pengaturan", "Keamanan"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <SecuritySection />
            </React.Suspense>
          </div>
        );

      case "pengaturan-akun":
        return (
          <div className="space-y-4">
            <Breadcrumb crumbs={["Pengaturan", "Akun"]} onBack={goBackToHub} />
            <React.Suspense fallback={<SectionSkeleton />}>
              <AccountsSection />
            </React.Suspense>
          </div>
        );

      case "pengaturan-kategori":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Pengaturan", "Kategori"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <CategoryManager />
            </React.Suspense>
          </div>
        );

      case "pengaturan-tagihan":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Pengaturan", "Tagihan"]}
              onBack={goBackToHub}
            />
            <React.Suspense fallback={<SectionSkeleton />}>
              <BillsSection />
            </React.Suspense>
          </div>
        );

      case "pengaturan-anggaran":
        return (
          <div className="space-y-4">
            <Breadcrumb
              crumbs={["Pengaturan", "Anggaran"]}
              onBack={goBackToHub}
            />
            <BudgetsSection />
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <>
      <div
        className={
          isBlurred
            ? "blur-sm transition-all duration-200"
            : "transition-all duration-200"
        }
      >
        <AppShell
          active={section}
          onNavigate={setSection}
          onAdd={openAdd}
          onJajan={() => setJajanOpen(true)}
          onOpenSearch={() => setCmdOpen(true)}
        >
          <div
            className={
              locked
                ? "pointer-events-none opacity-0"
                : "opacity-100"
            }
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={section}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                {renderSection()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Loading overlay for seed */}
          {seedMut.isPending && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-card px-6 py-5 shadow-xl">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Menyiapkan data...
                </p>
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

          {/* Quick Jajan Sheet (controlled by AppShell FABs) */}
          <JajanButton open={jajanOpen} onOpenChange={setJajanOpen} />

          {/* Command Palette (Cmd+K) */}
          <CommandPalette
            open={cmdOpen}
            onOpenChange={setCmdOpen}
            onAdd={openAdd}
            onNavigate={(s) => setSection(s as SectionId)}
          />
        </AppShell>
      </div>

      {/* Lock Screen Overlay */}
      {showLockScreen && (
        <LockScreen
          config={securityConfig}
          onUnlock={() => {
            /* unlocked via store; will re-render */
          }}
          onDecoy={() => {
            /* decoy mode active */
          }}
          onPanic={securityConfig.panicWipeEnabled ? handlePanic : undefined}
        />
      )}
    </>
  );
}
