"use client";

import * as React from "react";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateLong, relativeDay } from "@/lib/format";
import type { Transaction } from "@/lib/types";

export interface CardStackProps {
  transactions: Transaction[];
  onEdit: (t: Transaction) => void;
}

type SwipeDir = "right" | "left" | "up" | "down" | null;

interface Decision {
  txId: string;
  dir: SwipeDir;
}

/**
 * CardStack — Tinder-style swipeable transaction classification view.
 *
 * Gestures:
 *  - Swipe right (green) → "Need"
 *  - Swipe left (red)    → "Want"
 *  - Swipe up            → Edit (calls onEdit)
 *  - Swipe down          → Archive / hide
 */
export function CardStack({ transactions, onEdit }: CardStackProps) {
  // Limit to a manageable size — show up to 12 most recent
  const stack = React.useMemo(() => {
    return transactions.slice(0, 12);
  }, [transactions]);

  const [index, setIndex] = React.useState(0);
  const [decisions, setDecisions] = React.useState<Decision[]>([]);
  const [exitDir, setExitDir] = React.useState<SwipeDir>(null);

  // Reset when transactions change
  React.useEffect(() => {
    setIndex(0);
    setDecisions([]);
    setExitDir(null);
  }, [transactions]);

  const total = stack.length;
  const current = stack[index];
  const next = stack[index + 1];
  const isDone = index >= total;

  function handleSwipe(dir: Exclude<SwipeDir, null>) {
    if (!current) return;
    setExitDir(dir);
    setDecisions((d) => [...d, { txId: current.id, dir }]);
    // small delay so animation plays
    setTimeout(() => {
      setIndex((i) => i + 1);
      setExitDir(null);
    }, 220);

    if (dir === "up") {
      // defer edit so the card exit animation can start first
      setTimeout(() => onEdit(current), 250);
    }
  }

  function undo() {
    if (index === 0) return;
    setIndex((i) => i - 1);
    setDecisions((d) => d.slice(0, -1));
  }

  function reset() {
    setIndex(0);
    setDecisions([]);
    setExitDir(null);
  }

  // Summary counts
  const needCount = decisions.filter((d) => d.dir === "right").length;
  const wantCount = decisions.filter((d) => d.dir === "left").length;
  const editCount = decisions.filter((d) => d.dir === "up").length;
  const archiveCount = decisions.filter((d) => d.dir === "down").length;

  if (total === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Sparkles className="h-6 w-6 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-medium">Belum ada transaksi</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Tambahkan transaksi untuk mulai mengklasifikasi kartu.
          </p>
        </div>
      </Card>
    );
  }

  if (isDone) {
    return (
      <Card className="flex flex-col items-center gap-4 px-6 py-10 text-center">
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        >
          <Check className="h-7 w-7" />
        </motion.span>
        <div className="space-y-1">
          <p className="text-base font-bold">
            Kamu mengklasifikasi {total} transaksi!
          </p>
          <p className="text-sm text-muted-foreground">
            {needCount} Need · {wantCount} Want
            {editCount > 0 ? ` · ${editCount} diedit` : ""}
            {archiveCount > 0 ? ` · ${archiveCount} diarsip` : ""}
          </p>
        </div>
        <div className="grid w-full max-w-xs grid-cols-2 gap-3 pt-1">
          <SummaryPill label="Need" value={needCount} color="emerald" />
          <SummaryPill label="Want" value={wantCount} color="rose" />
        </div>
        <Button onClick={reset} variant="outline" className="mt-2 gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Mulai ulang
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Counter + undo */}
      <div className="flex items-center justify-between gap-3 px-1">
        <p className="text-xs font-medium text-muted-foreground">
          <span className="text-foreground">{index + 1}</span>
          <span className="mx-1">/</span>
          {total}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={index === 0}
            className="h-8 gap-1.5 text-xs"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Batal
          </Button>
        </div>
      </div>

      {/* Card stack area */}
      <div className="relative mx-auto h-[26rem] w-full max-w-md select-none">
        {/* Next card peek */}
        {next && (
          <motion.div
            className="absolute inset-0"
            initial={{ scale: 0.94, y: 14, opacity: 0 }}
            animate={{ scale: 0.96, y: 10, opacity: 0.55 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            aria-hidden
          >
            <SwipeCard transaction={next} variant="peek" />
          </motion.div>
        )}

        {/* Active card */}
        <AnimatePresence mode="popLayout">
          {current && (
            <SwipeCardMotion
              key={current.id}
              transaction={current}
              exitDir={exitDir}
              onSwipe={handleSwipe}
              onEdit={onEdit}
            />
          )}
        </AnimatePresence>

        {/* Empty fallback if no current */}
        {!current && (
          <Card className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Selesai
          </Card>
        )}
      </div>

      {/* Hint + action buttons */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Hint icon={<ArrowUp className="h-3 w-3" />} text="Edit" />
          <Hint icon={<ArrowDown className="h-3 w-3" />} text="Arsip" />
          <Hint icon={<span className="block h-2.5 w-2.5 rounded-full bg-rose-500" />} text="Want" />
          <Hint icon={<span className="block h-2.5 w-2.5 rounded-full bg-emerald-500" />} text="Need" />
        </div>
        <div className="flex items-center gap-2">
          <ActionButton
            label="Want"
            color="rose"
            onClick={() => handleSwipe("left")}
          />
          <ActionButton
            label="Edit"
            color="sky"
            onClick={() => handleSwipe("up")}
          />
          <ActionButton
            label="Arsip"
            color="amber"
            onClick={() => handleSwipe("down")}
          />
          <ActionButton
            label="Need"
            color="emerald"
            onClick={() => handleSwipe("right")}
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SwipeCard — single card with drag                                  */
/* ------------------------------------------------------------------ */

const SWIPE_THRESHOLD = 110;

function SwipeCardMotion({
  transaction,
  exitDir,
  onSwipe,
  onEdit,
}: {
  transaction: Transaction;
  exitDir: SwipeDir;
  onSwipe: (dir: Exclude<SwipeDir, null>) => void;
  onEdit: (t: Transaction) => void;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);

  // Overlay opacity for visual feedback
  const rightOverlay = useTransform(x, [40, 160], [0, 1]);
  const leftOverlay = useTransform(x, [-160, -40], [1, 0]);
  const upOverlay = useTransform(y, [-160, -40], [1, 0]);
  const downOverlay = useTransform(y, [40, 160], [0, 1]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const dx = info.offset.x;
    const dy = info.offset.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > SWIPE_THRESHOLD) onSwipe("right");
      else if (dx < -SWIPE_THRESHOLD) onSwipe("left");
    } else {
      if (dy < -SWIPE_THRESHOLD) onSwipe("up");
      else if (dy > SWIPE_THRESHOLD) onSwipe("down");
    }
  }

  // Build exit animation based on direction
  const exitProps = React.useMemo(() => {
    if (!exitDir) return {};
    switch (exitDir) {
      case "right":
        return { x: 320, y: 60, rotate: 18, opacity: 0 };
      case "left":
        return { x: -320, y: 60, rotate: -18, opacity: 0 };
      case "up":
        return { y: -360, opacity: 0 };
      case "down":
        return { y: 360, opacity: 0 };
    }
  }, [exitDir]);

  return (
    <motion.div
      className="absolute inset-0 cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragSnapToOrigin
      dragElastic={0.55}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={onDragEnd}
      initial={{ scale: 1, opacity: 1, x: 0, y: 0, rotate: 0 }}
      exit={{ ...exitProps, transition: { duration: 0.22, ease: "easeIn" } }}
      whileTap={{ cursor: "grabbing" }}
    >
      <SwipeCard transaction={transaction}>
        {/* Directional overlay indicators */}
        <motion.div
          style={{ opacity: rightOverlay }}
          className="pointer-events-none absolute inset-0 flex items-center justify-start rounded-2xl border-4 border-emerald-500 bg-emerald-500/10"
        >
          <div className="ml-5 rotate-[-12deg] rounded-lg border-3 border-emerald-500 px-3 py-1 text-sm font-bold uppercase tracking-wider text-emerald-600">
            Need ✓
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: leftOverlay }}
          className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl border-4 border-rose-500 bg-rose-500/10"
        >
          <div className="mr-5 rotate-[12deg] rounded-lg border-2 border-rose-500 px-3 py-1 text-sm font-bold uppercase tracking-wider text-rose-600">
            Want ✗
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: upOverlay }}
          className="pointer-events-none absolute inset-0 flex items-start justify-center rounded-2xl border-4 border-sky-500 bg-sky-500/10"
        >
          <div className="mt-5 rounded-lg border-2 border-sky-500 px-3 py-1 text-sm font-bold uppercase tracking-wider text-sky-600">
            Edit
          </div>
        </motion.div>
        <motion.div
          style={{ opacity: downOverlay }}
          className="pointer-events-none absolute inset-0 flex items-end justify-center rounded-2xl border-4 border-amber-500 bg-amber-500/10"
        >
          <div className="mb-5 rounded-lg border-2 border-amber-500 px-3 py-1 text-sm font-bold uppercase tracking-wider text-amber-600">
            Arsip
          </div>
        </motion.div>

        {/* Quick edit shortcut */}
        <button
          type="button"
          onClick={() => onEdit(transaction)}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-background/80 text-muted-foreground backdrop-blur hover:text-foreground"
          aria-label="Edit transaksi"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </SwipeCard>
    </motion.div>
  );
}

function SwipeCard({
  transaction,
  variant = "active",
  children,
}: {
  transaction: Transaction;
  variant?: "active" | "peek";
  children?: React.ReactNode;
}) {
  const cat = transaction.category;
  const isIncome = transaction.type === "INCOME";
  const color = cat?.color ?? (isIncome ? "#10b981" : "#f43f5e");

  // Build a gradient based on category color
  const gradient = `linear-gradient(135deg, ${color} 0%, ${darken(color, 0.18)} 100%)`;

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-2xl border border-border/60 text-white shadow-xl",
        variant === "peek" && "pointer-events-none",
      )}
      style={{ backgroundImage: gradient }}
    >
      {/* Decorative orbs */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-black/15 blur-2xl" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
            <LucideIcon
              name={cat?.icon ?? "Circle"}
              className="h-6 w-6"
              style={{ color: "#fff" }}
            />
          </span>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[11px] uppercase tracking-wider text-white/70">
              {cat?.name ?? "Tanpa kategori"}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white/90">
              {isIncome ? "Pemasukan" : "Pengeluaran"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-2xl font-bold leading-tight tabular-nums sm:text-3xl">
            {isIncome ? "+" : "−"}
            {formatCurrency(transaction.amount)}
          </p>
          <p className="mt-2 line-clamp-2 text-base font-medium text-white/95">
            {transaction.description}
          </p>
          {transaction.note && (
            <p className="mt-1 line-clamp-2 text-xs text-white/70">
              {transaction.note}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-white/80">
          <span>{relativeDay(transaction.date)}</span>
          <span className="hidden sm:inline">{formatDateLong(transaction.date)}</span>
        </div>
      </div>

      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small UI helpers                                                   */
/* ------------------------------------------------------------------ */

function ActionButton({
  label,
  color,
  onClick,
}: {
  label: string;
  color: "emerald" | "rose" | "sky" | "amber";
  onClick: () => void;
}) {
  const colorClasses: Record<typeof color, string> = {
    emerald:
      "border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:text-emerald-400",
    rose: "border-rose-500 text-rose-600 hover:bg-rose-500 hover:text-white dark:text-rose-400",
    sky: "border-sky-500 text-sky-600 hover:bg-sky-500 hover:text-white dark:text-sky-400",
    amber:
      "border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white dark:text-amber-400",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border-2 bg-card px-3 py-1.5 text-xs font-semibold transition-colors",
        colorClasses[color],
      )}
    >
      {label}
    </button>
  );
}

function Hint({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5">
      {icon}
      <span>{text}</span>
    </span>
  );
}

function SummaryPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "emerald" | "rose";
}) {
  const cls =
    color === "emerald"
      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
      : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400";
  return (
    <div className={cn("rounded-xl px-3 py-2 text-center", cls)}>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide opacity-80">
        {label}
      </p>
    </div>
  );
}

/** Darken a hex color by a factor (0..1) — for gradient stops. */
function darken(hex: string, factor: number): string {
  try {
    const h = hex.replace("#", "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const dr = Math.max(0, Math.round(r * (1 - factor)));
    const dg = Math.max(0, Math.round(g * (1 - factor)));
    const db = Math.max(0, Math.round(b * (1 - factor)));
    return `#${dr.toString(16).padStart(2, "0")}${dg.toString(16).padStart(2, "0")}${db.toString(16).padStart(2, "0")}`;
  } catch {
    return hex;
  }
}

// Avoid unused import warning if X is unused
void X;
