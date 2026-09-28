"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useDashboard } from "@/lib/hooks";
import { getMonthKey } from "@/lib/format";

/* ------------------------------------------------------------------ */
/*  Level definitions                                                  */
/* ------------------------------------------------------------------ */

interface LevelDef {
  level: number;
  xp: number;
  name: string;
  avatar: string;
}

const LEVELS: LevelDef[] = [
  { level: 1, xp: 0, name: "Pemula", avatar: "🌱" },
  { level: 2, xp: 100, name: "Saver", avatar: "💸" },
  { level: 3, xp: 300, name: "Pengelola Cerdas", avatar: "📊" },
  { level: 4, xp: 700, name: "Sultan Micro", avatar: "🏆" },
  { level: 5, xp: 1500, name: "Master Finansial", avatar: "👑" },
];

function getLevel(xp: number): {
  currentLevel: LevelDef;
  nextLevel: LevelDef | null;
} {
  let currentLevel = LEVELS[0];
  let nextLevel: LevelDef | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] ?? null;
    }
  }
  return { currentLevel, nextLevel };
}

/* ------------------------------------------------------------------ */
/*  Confetti                                                           */
/* ------------------------------------------------------------------ */

interface ConfettiPiece {
  id: number;
  x: number;
  delay: number;
  emoji: string;
  duration: number;
}

const CONFETTI_EMOJIS = ["🎉", "🎊", "✨", "💫", "⭐", "🌟", "🎈"];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function GamificationBar() {
  const monthKey = getMonthKey(new Date());
  const { data, isLoading } = useDashboard(monthKey);

  // Compute XP from transaction count, budget adherence, goal milestones
  const { xp, breakdown } = React.useMemo(() => {
    const txCount = data?.summary.transactionCount ?? 0;
    const budgets = data?.budgetStatuses ?? [];
    const goals = data?.goals ?? [];

    // +10 XP per transaction logged
    const fromTx = txCount * 10;
    // +50 XP per budget stayed under limit
    const underBudgetCount = budgets.filter((b) => b.spent <= b.amount).length;
    const fromBudgets = underBudgetCount * 50;
    // +100 XP per goal milestone (every 25% progress) reached
    let goalMilestones = 0;
    for (const g of goals) {
      const pct = Math.min(
        100,
        (g.currentAmount / Math.max(g.targetAmount, 1)) * 100,
      );
      goalMilestones += Math.floor(pct / 25);
    }
    const fromGoals = goalMilestones * 100;

    return {
      xp: fromTx + fromBudgets + fromGoals,
      breakdown: {
        txCount,
        underBudgetCount,
        goalMilestones,
        fromTx,
        fromBudgets,
        fromGoals,
      },
    };
  }, [data]);

  const { currentLevel, nextLevel } = getLevel(xp);
  const xpForCurrent = currentLevel.xp;
  const xpForNext = nextLevel?.xp ?? currentLevel.xp;
  const progressPct =
    nextLevel != null
      ? Math.min(
          100,
          Math.round(
            ((xp - xpForCurrent) / Math.max(xpForNext - xpForCurrent, 1)) *
              100,
          ),
        )
      : 100;
  const xpToNext = nextLevel != null ? Math.max(0, xpForNext - xp) : 0;

  // Detect level-up — trigger confetti
  const prevLevelRef = React.useRef(currentLevel.level);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [confettiPieces, setConfettiPieces] = React.useState<ConfettiPiece[]>([]);
  React.useEffect(() => {
    if (currentLevel.level > prevLevelRef.current) {
      const pieces: ConfettiPiece[] = Array.from({ length: 18 }).map((_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 100,
        delay: Math.random() * 0.4,
        emoji: CONFETTI_EMOJIS[Math.floor(Math.random() * CONFETTI_EMOJIS.length)],
        duration: 2.2 + Math.random() * 1.5,
      }));
      setConfettiPieces(pieces);
      setShowConfetti(true);
      const t = setTimeout(() => {
        setShowConfetti(false);
        setConfettiPieces([]);
      }, 3800);
      prevLevelRef.current = currentLevel.level;
      return () => clearTimeout(t);
    }
    prevLevelRef.current = currentLevel.level;
    return undefined;
  }, [currentLevel.level]);

  // Next achievement hint
  const hint = React.useMemo(() => {
    if (!nextLevel) return `🎉 Maks level tercapai! Kamu jenius finansial!`;
    const xpNeeded = xpForNext - xp;
    if (xpNeeded <= 0) return `Naik level berikutnya!`;
    const txNeeded = Math.ceil(xpNeeded / 10);
    if (txNeeded <= 3) {
      return `Catat ${txNeeded} transaksi lagi untuk level up!`;
    }
    return `Butuh ${xpNeeded} XP lagi untuk Level ${nextLevel.level} — ${nextLevel.name}`;
  }, [nextLevel, xp, xpForNext]);

  // Badges row
  const streak = data?.streak ?? 0;
  const budgets = data?.budgetStatuses ?? [];
  const goals = data?.goals ?? [];
  const badges: Array<{ emoji: string; label: string; unlocked: boolean }> = [
    { emoji: "🔥", label: "7-day streak", unlocked: streak >= 7 },
    { emoji: "💰", label: "First budget", unlocked: budgets.length > 0 },
    { emoji: "🎯", label: "First goal", unlocked: goals.length > 0 },
    { emoji: "📊", label: "10 transaksi", unlocked: breakdown.txCount >= 10 },
    {
      emoji: "💎",
      label: "Hemat budget",
      unlocked: breakdown.underBudgetCount > 0,
    },
    {
      emoji: "🏆",
      label: "Goal tercapai",
      unlocked: goals.some(
        (g) => g.completed || g.currentAmount >= g.targetAmount,
      ),
    },
  ];

  return (
    <Card className="relative overflow-hidden border-0 p-4 text-white shadow-lg shadow-emerald-900/20 gradient-hero">
      {/* Decorative orb */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-2xl" />

      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {confettiPieces.map((piece) => (
              <motion.div
                key={piece.id}
                className="absolute text-xl"
                style={{ left: `${piece.x}%`, top: -20 }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{
                  y: 360,
                  opacity: [1, 1, 0],
                  rotate: 360,
                }}
                transition={{
                  duration: piece.duration,
                  delay: piece.delay,
                  ease: "easeIn",
                }}
              >
                {piece.emoji}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Header — avatar + level + XP total */}
        <div className="flex items-center gap-3">
          <motion.div
            key={currentLevel.level}
            initial={{ scale: 0.5, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 12 }}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl backdrop-blur-md"
          >
            {currentLevel.avatar}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/70">
              Level {currentLevel.level}
            </p>
            {isLoading ? (
              <Skeleton className="mt-1 h-4 w-32 bg-white/20" />
            ) : (
              <p className="truncate text-base font-bold">{currentLevel.name}</p>
            )}
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-2.5 py-1 text-right backdrop-blur-md">
            <p className="text-[10px] text-white/70">XP</p>
            <p className="text-sm font-bold tabular-nums">{xp}</p>
          </div>
        </div>

        {/* XP bar */}
        <div className="mt-3">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-white/70">
            <span className="tabular-nums">{xpForCurrent} XP</span>
            <span className="tabular-nums">
              {nextLevel ? `${xpForNext} XP` : "MAX"}
            </span>
          </div>
        </div>

        {/* Hint */}
        <div className="mt-3 rounded-xl bg-white/10 px-3 py-2 backdrop-blur-md">
          {isLoading ? (
            <Skeleton className="h-3 w-44 bg-white/20" />
          ) : (
            <>
              <p className="text-xs font-medium text-white/90">{hint}</p>
              {nextLevel && (
                <p className="mt-0.5 text-[10px] text-white/60">
                  {xpToNext} XP menuju Level {nextLevel.level} —{" "}
                  {nextLevel.name} {nextLevel.avatar}
                </p>
              )}
            </>
          )}
        </div>

        {/* Badges row */}
        <div className="mt-3">
          <p className="mb-2 text-[10px] font-medium text-white/70">Achievement</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b, i) => (
              <div
                key={i}
                title={b.label}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-base transition-all",
                  b.unlocked
                    ? "bg-white/20 ring-1 ring-white/30"
                    : "bg-white/5 opacity-40 grayscale",
                )}
              >
                {b.unlocked ? b.emoji : "🔒"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Level-up banner */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ y: -40, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white/95 px-5 py-3 text-center shadow-2xl"
          >
            <p className="text-xs font-medium text-emerald-600">LEVEL UP!</p>
            <p className="text-lg font-bold text-emerald-700">
              {currentLevel.avatar} Level {currentLevel.level}
            </p>
            <p className="text-xs text-emerald-600">{currentLevel.name}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
