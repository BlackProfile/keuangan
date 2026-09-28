"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  getGreeting,
  getMonthKey,
  relativeDay,
} from "@/lib/format";
import { useDashboard } from "@/lib/hooks";
import type { Transaction } from "@/lib/types";

interface Props {
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onViewAll: () => void;
}

type TimeOfDay = "morning" | "noon" | "evening" | "night";

function getTimeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 15) return "noon";
  if (h >= 15 && h < 19) return "evening";
  return "night";
}

const TIME_COLORS: Record<
  TimeOfDay,
  { primary: string; sub: string; particle: string; bg: string }
> = {
  morning: {
    primary: "#FBBF24", // amber-400
    sub: "rgba(251,191,36,0.55)",
    particle: "rgba(251,191,36,0.45)",
    bg: "#020617", // slate-950
  },
  noon: {
    primary: "#FFFFFF", // white
    sub: "rgba(255,255,255,0.55)",
    particle: "rgba(255,255,255,0.4)",
    bg: "#020617",
  },
  evening: {
    primary: "#FB923C", // orange-400
    sub: "rgba(251,146,60,0.55)",
    particle: "rgba(251,146,60,0.45)",
    bg: "#020617",
  },
  night: {
    primary: "#60A5FA", // blue-400
    sub: "rgba(96,165,250,0.55)",
    particle: "rgba(96,165,250,0.45)",
    bg: "#020617",
  },
};

// CSS keyframes injected once for particle drift animation
const PARTICLE_CSS = `
@keyframes ambient-drift {
  0%   { transform: translate(0, 0) scale(1);     opacity: 0.0; }
  10%  { opacity: 1; }
  50%  { transform: translate(var(--dx, 20px), var(--dy, -40px)) scale(1.2); opacity: 0.8; }
  90%  { opacity: 0.4; }
  100% { transform: translate(calc(var(--dx, 20px) * 1.5), calc(var(--dy, -40px) * 1.6)) scale(0.6); opacity: 0; }
}
.ambient-particle {
  animation: ambient-drift var(--dur, 14s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
}
`;

export function DashboardAmbient({ onAdd, onEdit, onViewAll }: Props) {
  const [greeting, setGreeting] = React.useState<string>("");
  const [tod, setTod] = React.useState<TimeOfDay>("night");
  const [show, setShow] = React.useState(true);

  React.useEffect(() => {
    setGreeting(getGreeting());
    setTod(getTimeOfDay());
    // Re-evaluate every 5 minutes in case the user keeps the app open across hour boundaries
    const interval = setInterval(() => setTod(getTimeOfDay()), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);

  const summary = data?.summary;
  const recent = data?.recentTransactions ?? [];

  const colors = TIME_COLORS[tod];

  return (
    <div
      className="relative min-h-[80vh] overflow-hidden"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Inject particle keyframes once */}
      <style dangerouslySetInnerHTML={{ __html: PARTICLE_CSS }} />

      {/* Floating particles */}
      <Particles color={colors.particle} count={14} />

      {/* Main content — centered big number */}
      <div className="relative flex min-h-[70vh] flex-col items-center justify-center px-4 py-12 text-center">
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-sm tracking-[0.3em] uppercase"
          style={{ color: colors.sub }}
        >
          {greeting || "Halo"}
        </motion.p>

        {/* Saldo */}
        <div className="mt-6 flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="flex items-baseline justify-center"
          >
            {isLoading ? (
              <p
                className="font-thin tabular-nums"
                style={{
                  color: colors.primary,
                  fontSize: "3.5rem",
                  opacity: 0.5,
                }}
              >
                ···
              </p>
            ) : show ? (
              <>
                <span
                  className="font-thin"
                  style={{
                    color: colors.primary,
                    opacity: 0.7,
                    fontSize: "1.5rem",
                  }}
                >
                  Rp
                </span>
                <span
                  className="ml-2 font-thin tabular-nums"
                  style={{
                    color: colors.primary,
                    fontSize: "3.5rem",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {Math.round(summary?.balance ?? 0).toLocaleString("id-ID")}
                </span>
              </>
            ) : (
              <p
                className="font-thin"
                style={{ color: colors.primary, fontSize: "3.5rem" }}
              >
                ••••••
              </p>
            )}
          </motion.div>

          {/* Show/hide toggle */}
          <button
            onClick={() => setShow((p) => !p)}
            className="transition-opacity hover:opacity-100"
            style={{ color: colors.sub, opacity: 0.6 }}
            aria-label={show ? "Sembunyikan saldo" : "Tampilkan saldo"}
          >
            {show ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-3 text-xs tracking-[0.2em] uppercase"
          style={{ color: colors.sub, opacity: 0.7 }}
        >
          Saldo Total
        </motion.p>

        {/* Add button — minimal */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10"
        >
          <button
            onClick={onAdd}
            className={cn(
              "flex items-center gap-2 rounded-full px-5 py-2 transition-all duration-300 hover:scale-105 active:scale-95",
            )}
            style={{
              color: colors.primary,
              border: `1px solid ${colors.sub}`,
              backgroundColor: "rgba(255,255,255,0.03)",
              backdropFilter: "blur(4px)",
            }}
          >
            <Plus className="h-4 w-4" />
            <span className="text-xs tracking-[0.2em] uppercase">Tambah</span>
          </button>
        </motion.div>
      </div>

      {/* Recent transactions — minimal, just description + amount */}
      <div className="mx-auto max-w-md px-4 pb-24">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-4 text-center text-[10px] tracking-[0.3em] uppercase"
          style={{ color: colors.sub, opacity: 0.6 }}
        >
          Terbaru
        </motion.p>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-8 animate-pulse rounded"
                style={{ backgroundColor: "rgba(255,255,255,0.05)" }}
              />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p
            className="py-6 text-center text-xs"
            style={{ color: colors.sub, opacity: 0.5 }}
          >
            Belum ada transaksi.
          </p>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {recent.slice(0, 3).map((t, idx) => {
                const isIncome = t.type === "INCOME";
                return (
                  <motion.button
                    key={t.id}
                    onClick={() => onEdit(t)}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4, delay: 0.9 + idx * 0.1 }}
                    className="flex w-full items-center justify-between border-b py-2 text-left transition-colors"
                    style={{
                      borderColor: `${colors.sub}22`,
                    }}
                  >
                    <span
                      className="truncate pr-3 text-sm font-light"
                      style={{ color: colors.primary, opacity: 0.85 }}
                    >
                      {t.description}
                    </span>
                    <span
                      className="shrink-0 text-xs font-light tabular-nums"
                      style={{
                        color: isIncome ? "#81B29A" : colors.primary,
                        opacity: isIncome ? 1 : 0.7,
                      }}
                    >
                      {isIncome ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </span>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 3-dot nav at bottom */}
      <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-full px-4 py-2">
          <button
            aria-label="Beranda"
            className="group flex items-center justify-center"
            onClick={onViewAll}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: colors.primary,
                width: 20,
                height: 6,
                borderRadius: 4,
              }}
            />
          </button>
          <button
            aria-label="Transaksi"
            className="group flex items-center justify-center"
            onClick={onViewAll}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: colors.sub,
                opacity: 0.5,
              }}
            />
          </button>
          <button
            aria-label="Tambah"
            className="group flex items-center justify-center"
            onClick={onAdd}
          >
            <span
              className="block h-1.5 w-1.5 rounded-full transition-all duration-300"
              style={{
                backgroundColor: colors.sub,
                opacity: 0.5,
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Particles — floating dots via CSS animation                        */
/* ------------------------------------------------------------------ */

function Particles({ color, count }: { color: string; count: number }) {
  // Deterministic pseudo-random so they don't jump around on rerenders
  const particles = React.useMemo(() => {
    const arr: Array<{
      id: number;
      x: number;
      y: number;
      size: number;
      dur: number;
      delay: number;
      dx: number;
      dy: number;
    }> = [];
    for (let i = 0; i < count; i++) {
      const seed = (i * 9301 + 49297) % 233280;
      const r = seed / 233280;
      const r2 = ((i * 1234 + 5678) % 9999) / 9999;
      const r3 = ((i * 7654 + 123) % 9999) / 9999;
      arr.push({
        id: i,
        x: Math.round(r * 100), // % across width
        y: Math.round(r2 * 100), // % across height
        size: 2 + Math.round(r3 * 4),
        dur: 10 + Math.round(r2 * 12),
        delay: Math.round(r * 6),
        dx: Math.round((r - 0.5) * 60),
        dy: -20 - Math.round(r2 * 60),
      });
    }
    return arr;
  }, [count]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="ambient-particle absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            // CSS custom props consumed by keyframes
            ["--dx" as string]: `${p.dx}px`,
            ["--dy" as string]: `${p.dy}px`,
            ["--dur" as string]: `${p.dur}s`,
            ["--delay" as string]: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
