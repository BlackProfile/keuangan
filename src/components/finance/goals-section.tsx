"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarIcon,
  Check,
  Loader2,
  Pencil,
  Plus,
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
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateInput,
  parseDateLocal,
} from "@/lib/format";
import { GOAL_COLORS, GOAL_ICONS } from "@/lib/constants";
import {
  useCreateGoal,
  useDeleteGoal,
  useGoals,
  useUpdateGoal,
} from "@/lib/hooks";
import type { Goal, GoalInput } from "@/lib/types";

export function GoalsSection() {
  const { data: goals, isLoading } = useGoals();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editGoal, setEditGoal] = React.useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] =
    React.useState<Goal | null>(null);

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
  onEdit,
  onContribute,
}: {
  goal: Goal;
  onEdit: () => void;
  onContribute: () => void;
}) {
  const deleteMut = useDeleteGoal();
  const percentage =
    goal.targetAmount > 0
      ? (goal.currentAmount / goal.targetAmount) * 100
      : 0;
  const remaining = Math.max(goal.targetAmount - goal.currentAmount, 0);

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
      </div>

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
      <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label="Ubah target"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              disabled={deleteMut.isPending}
              aria-label="Hapus target"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
