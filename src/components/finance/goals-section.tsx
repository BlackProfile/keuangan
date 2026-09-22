"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarIcon,
  Check,
  Flame,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  calculateStreak,
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateInput,
  parseDateLocal,
} from "@/lib/format";
import { GOAL_COLORS, GOAL_ICONS } from "@/lib/constants";
import { FUN_FACTS } from "@/lib/student-constants";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useTransactions,
  useUpdateGoal,
} from "@/lib/hooks";
import type { Goal, GoalInput } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Round-up + milestone helpers (localStorage-backed, client-only)    */
/* ------------------------------------------------------------------ */

const ROUNDUP_KEY = "dompetku:roundup-goal-id";
const PROCESSED_TX_KEY = "dompetku:roundup-processed-tx-ids";
const MILESTONE_SEEN_KEY = "dompetku:goal-milestones-seen";

function getRoundUpGoalId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ROUNDUP_KEY);
  } catch {
    return null;
  }
}

function setRoundUpGoalId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(ROUNDUP_KEY, id);
    else window.localStorage.removeItem(ROUNDUP_KEY);
  } catch {
    /* ignore */
  }
}

function getProcessedTxIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(PROCESSED_TX_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function markTxProcessed(id: string) {
  if (typeof window === "undefined") return;
  try {
    const set = getProcessedTxIds();
    if (set.has(id)) return;
    set.add(id);
    // Cap to last 500 ids
    const arr = Array.from(set).slice(-500);
    window.localStorage.setItem(PROCESSED_TX_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
}

/** Returns milestones (25/50/75/100) already seen (celebrated) for this goal. */
function getSeenMilestones(goalId: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(MILESTONE_SEEN_KEY);
    if (!raw) return new Set();
    const map = JSON.parse(raw) as Record<string, number[]>;
    return new Set(map[goalId] ?? []);
  } catch {
    return new Set();
  }
}

function markMilestoneSeen(goalId: string, milestone: number) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(MILESTONE_SEEN_KEY);
    const map: Record<string, number[]> = raw
      ? (JSON.parse(raw) as Record<string, number[]>)
      : {};
    const arr = Array.from(new Set([...(map[goalId] ?? []), milestone]));
    map[goalId] = arr;
    window.localStorage.setItem(MILESTONE_SEEN_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Find fun-fact comparison for the given amount (closest match below). */
function findFunFact(amount: number): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  // pick the largest FUN_FACTS amount <= given, otherwise smallest
  const sorted = [...FUN_FACTS].sort((a, b) => a.amount - b.amount);
  let match = sorted[0];
  for (const f of sorted) {
    if (f.amount <= amount) match = f;
  }
  if (!match) return null;
  return match.comparisons[0] ?? null;
}

const MILESTONES = [25, 50, 75, 100];

export function GoalsSection() {
  const { data: goals, isLoading } = useGoals();
  const { data: transactions } = useTransactions();
  const updateGoalMut = useUpdateGoal();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editGoal, setEditGoal] = React.useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] =
    React.useState<Goal | null>(null);
  const [confettiActive, setConfettiActive] = React.useState(false);

  // Round-up processor: for each new EXPENSE transaction, if a round-up goal is
  // active and not yet processed, round amount up to nearest Rp1000 and add the
  // difference to that goal.
  React.useEffect(() => {
    if (!transactions || transactions.length === 0) return;
    const roundUpGoalId = getRoundUpGoalId();
    if (!roundUpGoalId) return;
    const targetGoal = (goals ?? []).find((g) => g.id === roundUpGoalId);
    if (!targetGoal || targetGoal.completed) return;

    const processed = getProcessedTxIds();
    const newOnes = transactions.filter(
      (t) =>
        t.type === "EXPENSE" &&
        !processed.has(t.id) &&
        !t.id.startsWith("temp-") &&
        !t.isRecurringGenerated
    );
    if (newOnes.length === 0) return;

    let totalDiff = 0;
    for (const t of newOnes) {
      const rounded = Math.ceil(t.amount / 1000) * 1000;
      const diff = rounded - t.amount;
      if (diff > 0) totalDiff += diff;
      markTxProcessed(t.id);
    }
    // Mark temp/skipped transactions as processed too so they don't reprocess
    for (const t of transactions) {
      if (t.id.startsWith("temp-") || t.isRecurringGenerated) {
        markTxProcessed(t.id);
      }
    }
    if (totalDiff <= 0) return;
    const newAmount = targetGoal.currentAmount + totalDiff;
    updateGoalMut.mutate(
      { id: targetGoal.id, data: { currentAmount: newAmount } },
      {
        onSuccess: () => {
          toast.success(
            `Round-up +${formatCurrency(totalDiff)} masuk ke "${targetGoal.name}".`
          );
        },
      }
    );
  }, [transactions, goals, updateGoalMut]);

  // Milestone celebration: detect 25/50/75/100% crossings.
  React.useEffect(() => {
    if (!goals || goals.length === 0) return;
    let triggered: { goal: Goal; milestone: number } | null = null;
    for (const g of goals) {
      if (g.targetAmount <= 0) continue;
      const pct = (g.currentAmount / g.targetAmount) * 100;
      const seen = getSeenMilestones(g.id);
      for (const m of MILESTONES) {
        if (pct >= m && !seen.has(m)) {
          markMilestoneSeen(g.id, m);
          triggered = { goal: g, milestone: m };
          break;
        }
      }
      if (triggered) break;
    }
    if (triggered) {
      const { goal, milestone } = triggered;
      toast.success(
        `🎉 Target "${goal.name}" sudah ${milestone}%!`
      );
      setConfettiActive(true);
      const t = setTimeout(() => setConfettiActive(false), 3500);
      return () => clearTimeout(t);
    }
  }, [goals]);

  function openCreate() {
    setEditGoal(null);
    setDialogOpen(true);
  }

  function openEdit(g: Goal) {
    setEditGoal(g);
    setDialogOpen(true);
  }

  function openContribution(g: Goal) {
    setContributionGoal(g);
  }

  // Round-up state (which goal is currently active)
  const [roundUpGoalId, setRoundUpGoalIdState] = React.useState<string | null>(
    null
  );
  React.useEffect(() => {
    setRoundUpGoalIdState(getRoundUpGoalId());
  }, []);

  function toggleRoundUp(goalId: string) {
    const current = getRoundUpGoalId();
    const next = current === goalId ? null : goalId;
    setRoundUpGoalId(next);
    setRoundUpGoalIdState(next);
    if (next) {
      const g = (goals ?? []).find((x) => x.id === next);
      if (g) {
        toast.success(
          `Round-up aktif untuk "${g.name}". Setiap transaksi dibulatkan ke atas.`
        );
      }
    } else {
      toast.info("Round-up dimatikan.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Target Tabungan
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tetapkan tujuan finansial & lacak progresnya.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" />
          Tambah Target
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (goals ?? []).length === 0 ? (
        <EmptyState onCreate={openCreate} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(goals ?? []).map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              transactions={(transactions ?? []).filter(
                (t) => t.goalId === g.id
              )}
              roundUpActive={roundUpGoalId === g.id}
              onToggleRoundUp={() => toggleRoundUp(g.id)}
              onEdit={() => openEdit(g)}
              onContribute={() => openContribution(g)}
            />
          ))}
        </div>
      )}

      <GoalFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editGoal={editGoal}
      />

      <ContributionDialog
        goal={contributionGoal}
        onOpenChange={(o) => !o && setContributionGoal(null)}
      />

      {confettiActive && <ConfettiOverlay />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Confetti overlay — pure CSS                                         */
/* ------------------------------------------------------------------ */

function ConfettiOverlay() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 36 }).map((_, i) => {
        const colors = [
          "#10b981",
          "#f59e0b",
          "#ef4444",
          "#a855f7",
          "#06b6d4",
          "#ec4899",
        ];
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.8 + Math.random() * 1.2;
        const size = 6 + Math.random() * 8;
        const rotate = Math.random() * 360;
        return { id: i, color, left, delay, duration, size, rotate };
      }),
    []
  );
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: "-10%",
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.6,
            backgroundColor: p.color,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
            borderRadius: 1,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function ProgressRing({
  percentage,
  color,
  size = 64,
}: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const strokeWidth = 6;
  const r = (size - strokeWidth * 2) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(percentage, 0), 100);
  const offset = c - (clamped / 100) * c;
  return (
    <div
      className="relative inline-flex shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold tabular-nums text-foreground">
          {Math.round(clamped)}%
        </span>
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  transactions,
  roundUpActive,
  onToggleRoundUp,
  onEdit,
  onContribute,
}: {
  goal: Goal;
  transactions: Array<{ id: string; date: string | Date }>;
  roundUpActive: boolean;
  onToggleRoundUp: () => void;
  onEdit: () => void;
  onContribute: () => void;
}) {
  const deleteMut = useDeleteGoal();
  const percentage =
    goal.targetAmount > 0
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

  // Streak: consecutive days with a contribution (transaction) for this goal.
  const streak = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return calculateStreak(transactions.map((t) => t.date));
  }, [transactions]);

  const funFact = React.useMemo(() => {
    if (remaining <= 0) return null;
    return findFunFact(remaining);
  }, [remaining]);

  function handleDelete() {
    deleteMut.mutate(goal.id, {
      onSuccess: () =>
        toast.success(`Target "${goal.name}" dihapus.`),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus target."),
    });
  }

  return (
    <Card className="group relative p-4 transition-shadow hover:shadow-md">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProgressRing percentage={percentage} color={goal.color} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${goal.color}1a` }}
              >
                <LucideIcon
                  name={goal.icon}
                  className="h-4 w-4"
                  style={{ color: goal.color }}
                />
              </span>
              <p className="truncate text-sm font-semibold text-foreground">
                {goal.name}
              </p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {goal.targetDate
                ? `Target: ${formatDate(goal.targetDate)}`
                : "Tanpa tanggal target"}
            </p>
            {streak > 0 && (
              <Badge
                variant="secondary"
                className="mt-1.5 gap-0.5 border-transparent bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
                title={`${streak} hari berturut-turut menabung`}
              >
                <Flame className="h-3 w-3" />
                {streak} hari nabung berturut
              </Badge>
            )}
          </div>
        </div>

        {goal.completed && (
          <Badge className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Selesai
          </Badge>
        )}
      </div>

      {/* Amounts */}
      <div className="mt-4 space-y-2">
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] text-muted-foreground">
              Terkumpul
            </p>
            <p className="text-sm font-semibold tabular-nums text-income">
              {formatCurrency(goal.currentAmount)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Diperbarui {formatDate(goal.updatedAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Target</p>
            <p className="text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(goal.targetAmount)}
            </p>
          </div>
        </div>

        {/* Linear progress bar (in addition to ring) */}
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percentage)}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(percentage, 100)}%`,
              backgroundColor: goal.color,
            }}
          />
        </div>

        <p className="text-[11px] text-muted-foreground">
          {goal.completed
            ? "Target tercapai. Kerja bagus!"
            : `Sisa ${formatCurrencyCompact(remaining)} lagi`}
        </p>

        {/* Fun fact comparison */}
        {funFact && !goal.completed && (
          <p className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <Sparkles className="h-3 w-3 shrink-0" />
            <span>
              <span className="font-semibold">{formatCurrencyCompact(remaining)}</span>
              {" = "}
              {funFact}
            </span>
          </p>
        )}
      </div>

      {/* Round-up toggle */}
      {!goal.completed && (
        <button
          type="button"
          onClick={onToggleRoundUp}
          className={cn(
            "mt-3 flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors",
            roundUpActive
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-400"
              : "border-border bg-background text-muted-foreground hover:bg-muted/40"
          )}
          aria-pressed={roundUpActive}
          aria-label="Aktifkan round-up untuk target ini"
        >
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                roundUpActive
                  ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {roundUpActive ? <Check className="h-3 w-3" /> : "↑"}
            </span>
            Round-up ke target ini
          </span>
          <span
            className={cn(
              "relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors",
              roundUpActive ? "bg-emerald-500" : "bg-muted-foreground/30"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform",
                roundUpActive ? "translate-x-3.5" : "translate-x-0.5"
              )}
            />
          </span>
        </button>
      )}

      {/* Contribute button */}
      {!goal.completed && (
        <Button
          variant="outline"
          size="sm"
          onClick={onContribute}
          className="mt-3 w-full gap-1"
        >
          <Plus className="h-4 w-4" />
          Tambah Setoran
        </Button>
      )}

      {/* Hover actions */}
      <div className="absolute right-3 top-3 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              aria-label="Aksi target"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit} className="gap-2">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onSelect={(e) => e.preventDefault()}
                  disabled={deleteMut.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus target ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Target <strong>{goal.name}</strong> akan dihapus. Tindakan
                    ini tidak dapat dibatalkan.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deleteMut.isPending && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Target className="h-7 w-7 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada target tabungan
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tetapkan target finansial pertamamu & mulai menabung.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1">
        <Plus className="h-4 w-4" />
        Buat Target Pertama
      </Button>
    </Card>
  );
}

function GoalFormDialog({
  open,
  onOpenChange,
  editGoal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGoal: Goal | null;
}) {
  const isEdit = !!editGoal;
  const createMut = useCreateGoal();
  const updateMut = useUpdateGoal();

  const [name, setName] = React.useState("");
  const [targetAmount, setTargetAmount] = React.useState("");
  const [currentAmount, setCurrentAmount] = React.useState("");
  const [targetDate, setTargetDate] = React.useState<Date | undefined>(
    undefined
  );
  const [icon, setIcon] = React.useState(GOAL_ICONS[0]);
  const [color, setColor] = React.useState(GOAL_COLORS[0]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      if (editGoal) {
        setName(editGoal.name);
        setTargetAmount(String(editGoal.targetAmount));
        setCurrentAmount(String(editGoal.currentAmount));
        setTargetDate(
          editGoal.targetDate ? parseDateLocal(editGoal.targetDate) : undefined
        );
        setIcon(editGoal.icon);
        setColor(editGoal.color);
      } else {
        setName("");
        setTargetAmount("");
        setCurrentAmount("");
        setTargetDate(undefined);
        setIcon(GOAL_ICONS[0]);
        setColor(GOAL_COLORS[0]);
      }
      setError(null);
    }
  }, [open, editGoal]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Nama target wajib diisi.");
      return;
    }
    const target = Number(targetAmount);
    if (!Number.isFinite(target) || target <= 0) {
      setError("Target jumlah harus lebih dari 0.");
      return;
    }
    const current = Number(currentAmount || 0);
    if (!Number.isFinite(current) || current < 0) {
      setError("Jumlah saat ini tidak valid.");
      return;
    }

    const payload: GoalInput = {
      name: name.trim(),
      targetAmount: Math.round(target),
      currentAmount: Math.round(current),
      targetDate: targetDate ? formatDateInput(targetDate) : undefined,
      icon,
      color,
    };

    if (isEdit && editGoal) {
      updateMut.mutate(
        { id: editGoal.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Target diperbarui.");
            onOpenChange(false);
          },
          onError: (err) =>
            setError(err.message || "Gagal memperbarui target."),
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Target ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menambahkan target."),
      });
    }
  }

  const pending = createMut.isPending || updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-h-[90vh] max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">
                {isEdit ? "Ubah Target" : "Target Baru"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Perbarui detail target tabungan ini."
                  : "Tetapkan target finansial baru untuk ditgejar."}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[65vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Nama Target</Label>
              <Input
                id="goal-name"
                placeholder="cth. Liburan Bali, DP Rumah"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                autoFocus
              />
            </div>

            {/* Target + current amounts */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Target (Rp)</Label>
                <Input
                  id="goal-target"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  placeholder="10000000"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                />
                {targetAmount && Number(targetAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(targetAmount))}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="goal-current">Terkumpul (Rp)</Label>
                <Input
                  id="goal-current"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1000}
                  placeholder="0"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                />
                {currentAmount && Number(currentAmount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(Number(currentAmount))}
                  </p>
                )}
              </div>
            </div>

            {/* Target date */}
            <div className="space-y-1.5">
              <Label>Tanggal Target</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {targetDate
                      ? formatDate(targetDate)
                      : "Pilih tanggal target"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto p-0"
                  align="start"
                >
                  <Calendar
                    mode="single"
                    selected={targetDate}
                    onSelect={setTargetDate}
                    disabled={(d) =>
                      d < new Date(new Date().setHours(0, 0, 0, 0))
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {targetDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-fit px-2 text-xs text-muted-foreground"
                  onClick={() => setTargetDate(undefined)}
                >
                  Hapus tanggal
                </Button>
              )}
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Ikon</Label>
              <div className="grid max-h-32 grid-cols-7 gap-1.5 overflow-y-auto rounded-lg border border-border p-2 custom-scrollbar">
                {GOAL_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                      icon === ic
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    aria-label={ic}
                  >
                    <LucideIcon name={ic} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Warna</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((cl) => (
                  <button
                    key={cl}
                    type="button"
                    onClick={() => setColor(cl)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-transform",
                      color === cl &&
                        "ring-2 ring-ring ring-offset-2 ring-offset-background"
                    )}
                    style={{ backgroundColor: cl }}
                    aria-label={`Warna ${cl}`}
                  >
                    {color === cl && (
                      <Check className="h-4 w-4 text-white" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-1.5">
              <Label>Pratinjau</Label>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <ProgressRing
                  percentage={
                    Number(targetAmount) > 0
                      ? Math.min(
                          (Number(currentAmount || 0) /
                            Number(targetAmount)) *
                            100,
                          100
                        )
                      : 0
                  }
                  color={color}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${color}1a` }}
                    >
                      <LucideIcon
                        name={icon}
                        className="h-3.5 w-3.5"
                        style={{ color }}
                      />
                    </span>
                    <p className="truncate text-sm font-medium text-foreground">
                      {name || "Nama target"}
                    </p>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatCurrency(Number(currentAmount || 0))} /{" "}
                    {formatCurrency(Number(targetAmount || 0))}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
              >
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending} className="gap-1">
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? "Simpan Perubahan" : "Simpan Target"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ContributionDialog({
  goal,
  onOpenChange,
}: {
  goal: Goal | null;
  onOpenChange: (open: boolean) => void;
}) {
  const updateMut = useUpdateGoal();
  const [amount, setAmount] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (goal) {
      setAmount("");
      setError(null);
    }
  }, [goal]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal) return;
    setError(null);
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Jumlah setoran harus lebih dari 0.");
      return;
    }
    const newCurrent = goal.currentAmount + Math.round(amt);
    updateMut.mutate(
      {
        id: goal.id,
        data: { currentAmount: newCurrent },
      },
      {
        onSuccess: (updated) => {
          toast.success(
            `Setoran ${formatCurrency(amt)} ditambahkan ke "${goal.name}".`
          );
          if (updated && updated.completed) {
            toast.success(`Target "${goal.name}" tercapai! 🎉`);
          }
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menambah setoran."),
      }
    );
  }

  const remaining =
    goal && goal.targetAmount > goal.currentAmount
      ? goal.targetAmount - goal.currentAmount
      : 0;

  return (
    <Dialog open={!!goal} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">
                Tambah Setoran
              </DialogTitle>
              <DialogDescription className="text-xs">
                {goal
                  ? `Tambah setoran ke "${goal.name}"`
                  : "Tambah setoran"}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 p-5">
            {goal && (
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Terkumpul</span>
                  <span className="font-medium tabular-nums text-income">
                    {formatCurrency(goal.currentAmount)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Sisa</span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="contrib-amount">Jumlah Setoran (Rp)</Label>
              <Input
                id="contrib-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="cth. 500000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
              {/* Quick chips */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[50000, 100000, 250000, 500000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(String(v))}
                    className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted/70"
                  >
                    +{formatCurrencyCompact(v)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={updateMut.isPending}
              >
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={updateMut.isPending}
              className="gap-1"
            >
              {updateMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Tambah Setoran
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
