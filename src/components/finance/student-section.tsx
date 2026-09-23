"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  Coffee,
  Flame,
  GraduationCap,
  Loader2,
  Minimize2,
  Music,
  Pencil,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  Trophy,
  Users,
  Wallet,
  X,
  Zap,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDateInput,
  formatDateLong,
} from "@/lib/format";
import {
  ACADEMIC_MODES,
  FUN_FACTS,
  JAJAN_PRESETS,
  LEVEL_MILESTONES,
  XP_PER_LEVEL,
} from "@/lib/student-constants";
import {
  useCategories,
  useChallengeParticipations,
  useChallenges,
  useCreateTransaction,
  useDailyAllowance,
  useDashboard,
  useJajanCheck,
  useJoinChallenge,
  useAbandonChallenge,
  useStudentProfile,
  useUpdateStudentProfile,
} from "@/lib/hooks";
import type {
  AcademicMode,
  Category,
  Challenge,
  ChallengeParticipation,
  DailyAllowanceInfo,
  StudentProfile,
  TransactionInput,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function todayInput(): string {
  return formatDateInput(new Date());
}
function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function resolveCategoryId(
  categories: Category[] | undefined,
  name: string
): string | undefined {
  if (!categories || categories.length === 0) return undefined;
  const target = name.trim().toLowerCase();
  const expense = categories.filter((c) => c.type === "EXPENSE");
  const exact = expense.find((c) => c.name.toLowerCase() === target);
  if (exact) return exact.id;
  const partial = expense.find((c) => c.name.toLowerCase().includes(target));
  if (partial) return partial.id;
  const makanan = expense.find((c) => c.name.toLowerCase() === "makanan");
  return makanan?.id;
}

interface LevelInfo {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  progress: number;
  title: string;
}

function calcLevel(totalXP: number): LevelInfo {
  const safe = Math.max(0, Math.floor(totalXP));
  const level = Math.floor(safe / XP_PER_LEVEL) + 1;
  const xpInLevel = safe % XP_PER_LEVEL;
  const xpToNext = XP_PER_LEVEL - xpInLevel;
  const progress = (xpInLevel / XP_PER_LEVEL) * 100;
  const milestone =
    [...LEVEL_MILESTONES]
      .sort((a, b) => b.minXP - a.minXP)
      .find((m) => safe >= m.minXP) ?? LEVEL_MILESTONES[0];
  return { level, xpInLevel, xpToNext, progress, title: milestone.title };
}

function calcFunFact(savedAmount: number): {
  text: string;
  tone: "good" | "neutral";
} | null {
  if (!Number.isFinite(savedAmount) || savedAmount <= 0) return null;
  const sorted = [...FUN_FACTS].sort((a, b) => b.amount - a.amount);
  const fact = sorted.find((f) => savedAmount >= f.amount);
  if (fact) {
    return {
      text: `Kamu hemat ${formatCurrency(savedAmount)} = ${fact.comparisons[0]}`,
      tone: "good",
    };
  }
  return {
    text: `Kamu mulai nabung ${formatCurrency(savedAmount)}! Sedikit lagi sampai ${formatCurrency(
      FUN_FACTS[0].amount
    )} ya.`,
    tone: "neutral",
  };
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */

export function StudentSection() {
  const { data: profile, isLoading: profileLoading } = useStudentProfile();
  const { data: daily, isLoading: dailyLoading } = useDailyAllowance();
  const { data: challenges } = useChallenges();
  const { data: participations } = useChallengeParticipations();
  const { data: categories } = useCategories("EXPENSE");
  const { data: dashboard } = useDashboard();

  const [profileOpen, setProfileOpen] = React.useState(false);
  const [customOpen, setCustomOpen] = React.useState(false);

  const transactionCount = dashboard?.summary.transactionCount ?? 0;
  const streak = dashboard?.streak ?? 0;
  const totalXP = React.useMemo(() => {
    const xpFromParticipations = (participations ?? []).reduce(
      (s, p) => s + (p.xpEarned || 0),
      0
    );
    return xpFromParticipations + transactionCount * 10;
  }, [participations, transactionCount]);

  const levelInfo = calcLevel(totalXP);

  const participationsByChallenge = React.useMemo(() => {
    const map = new Map<string, ChallengeParticipation>();
    for (const p of participations ?? []) {
      map.set(p.challengeId, p);
    }
    return map;
  }, [participations]);

  const activeParticipations = (participations ?? []).filter(
    (p) => p.status === "ACTIVE"
  );
  const completedParticipations = (participations ?? []).filter(
    (p) => p.status === "COMPLETED"
  );

  const savedThisMonth = daily ? Math.max(0, daily.remainingThisMonth) : 0;
  const funFact = calcFunFact(savedThisMonth);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Mode Mahasiswa
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Atur uang saku, jajan cepat, ikut challenge, dan kumpulkan XP.
          </p>
        </div>
      </div>

      {/* Hero: Uang Saku */}
      {profileLoading || dailyLoading ? (
        <Skeleton className="h-56 rounded-2xl" />
      ) : !profile ? (
        <UangSakuEmpty onAtur={() => setProfileOpen(true)} />
      ) : (
        <UangSakuHero
          profile={profile}
          daily={daily}
          onEdit={() => setProfileOpen(true)}
        />
      )}

      {/* Quick Jajan */}
      <QuickJajanGrid
        categories={categories}
        onCustom={() => setCustomOpen(true)}
      />

      {/* Gamification stats */}
      <GamificationStats
        levelInfo={levelInfo}
        streak={streak}
        funFact={funFact}
        transactionCount={transactionCount}
      />

      {/* Challenges */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold tracking-tight">Challenge</h3>
            <p className="text-sm text-muted-foreground">
              Selesaikan misi, dapatkan badge &amp; XP.
            </p>
          </div>
        </div>

        {activeParticipations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sedang Berjalan
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {activeParticipations.map((p) => (
                <ActiveChallengeCard
                  key={p.id}
                  participation={p}
                  challenge={
                    p.challenge ??
                    challenges?.find((c) => c.id === p.challengeId)
                  }
                />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Tersedia
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {(challenges ?? [])
            .filter((c) => c.active)
            .map((c) => (
              <ChallengeCard
                key={c.id}
                challenge={c}
                participation={participationsByChallenge.get(c.id)}
              />
            ))}
        </div>

        {completedParticipations.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Selesai
            </p>
            <div className="flex flex-wrap gap-2">
              {completedParticipations.map((p) => {
                const ch =
                  p.challenge ?? challenges?.find((c) => c.id === p.challengeId);
                return (
                  <Badge
                    key={p.id}
                    variant="secondary"
                    className="gap-1 border-transparent bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                  >
                    <Check className="h-3.5 w-3.5" />
                    {ch?.name ?? "Challenge"}
                    <span className="ml-1 text-emerald-600/80 dark:text-emerald-400/80">
                      +{p.xpEarned} XP
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <StudentProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        profile={profile ?? null}
      />
      <CustomJajanDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        categories={categories ?? []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Uang Saku Hero                                                      */
/* ------------------------------------------------------------------ */

function UangSakuEmpty({ onAtur }: { onAtur: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center sm:p-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        <Wallet className="h-7 w-7" />
      </span>
      <div>
        <p className="text-base font-semibold text-foreground">
          Atur Uang Sakumu dulu
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Kamu dapat saran harian otomatis &amp; deteksi uang saku akan habis
          tanggal berapa.
        </p>
      </div>
      <Button onClick={onAtur} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
        <Wallet className="h-4 w-4" />
        Atur Uang Saku
      </Button>
    </Card>
  );
}

function UangSakuHero({
  profile,
  daily,
  onEdit,
}: {
  profile: StudentProfile;
  daily?: DailyAllowanceInfo;
  onEdit: () => void;
}) {
  const mode = ACADEMIC_MODES.find((m) => m.value === profile.academicMode);
  const modeLabel = mode?.label ?? profile.academicMode;
  const modeIcon = mode?.icon ?? "BookOpen";
  const modeColor = mode?.color ?? "#10b981";

  const dailyAllowance = daily?.dailyAllowance ?? 0;
  const dailySpent = daily?.dailySpent ?? 0;
  const dailyRemaining = daily?.dailyRemaining ?? dailyAllowance - dailySpent;
  const dailyPct =
    dailyAllowance > 0
      ? Math.min(100, (dailySpent / dailyAllowance) * 100)
      : 0;

  const monthlyAllowance = daily?.monthlyAllowance ?? profile.monthlyAllowance;
  const monthlySpent = daily?.spentThisMonth ?? 0;
  const monthlyRemaining =
    daily?.remainingThisMonth ?? monthlyAllowance - monthlySpent;
  const monthlyPct =
    monthlyAllowance > 0
      ? Math.min(100, (monthlySpent / monthlyAllowance) * 100)
      : 0;

  const projection = daily?.projection;
  const willRunOut = projection?.willRunOutDay != null;
  const isOverDaily = dailyRemaining < 0;

  return (
    <Card className="gap-0 overflow-hidden p-0">
      <div className="relative bg-gradient-to-br from-emerald-600 via-emerald-600 to-emerald-700 p-5 text-white sm:p-6">
        <div className="absolute right-4 top-4 flex items-center gap-2">
          <Badge
            variant="secondary"
            className="border-transparent bg-white/15 px-2.5 py-1 text-xs text-white backdrop-blur"
          >
            <LucideIcon name={modeIcon} className="mr-1 h-3.5 w-3.5" />
            {modeLabel}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="h-8 w-8 text-white hover:bg-white/15 hover:text-white"
            aria-label="Ubah uang saku"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2 text-emerald-50/90">
          <Wallet className="h-4 w-4" />
          <span className="text-sm font-medium">Uang Saku Bulanan</span>
        </div>
        <p className="mt-1 text-3xl font-bold tabular-nums sm:text-4xl">
          {formatCurrency(monthlyAllowance)}
        </p>
        {profile.university && (
          <p className="mt-1 text-xs text-emerald-50/80">
            {profile.university}
            {profile.major ? ` · ${profile.major}` : ""}
            {profile.semester ? ` · Smt ${profile.semester}` : ""}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          {/* Today */}
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <p className="text-[11px] text-emerald-50/80">Hari ini</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {formatCurrencyCompact(dailyRemaining)}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isOverDaily ? "bg-rose-300" : "bg-white"
                )}
                style={{ width: `${dailyPct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-emerald-50/70">
              {formatCurrencyCompact(dailySpent)} / {formatCurrencyCompact(dailyAllowance)}
            </p>
          </div>

          {/* This month */}
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <p className="text-[11px] text-emerald-50/80">Sisa bulan ini</p>
            <p className="mt-0.5 text-lg font-bold tabular-nums">
              {formatCurrencyCompact(monthlyRemaining)}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${monthlyPct}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-emerald-50/70">
              {formatCurrencyCompact(monthlySpent)} / {formatCurrencyCompact(monthlyAllowance)}
            </p>
          </div>
        </div>
      </div>

      {/* Projection footer */}
      <div
        className={cn(
          "flex items-start gap-2 px-5 py-3 text-sm sm:px-6",
          willRunOut
            ? "bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
            : "bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300"
        )}
      >
        {willRunOut ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        )}
        <p className="leading-snug">
          {projection?.message ?? "Hitung ulang untuk lihat proyeksi bulan ini."}
        </p>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Student Profile Dialog                                             */
/* ------------------------------------------------------------------ */

function StudentProfileDialog({
  open,
  onOpenChange,
  profile,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: StudentProfile | null;
}) {
  const updateMut = useUpdateStudentProfile();

  const [monthlyAllowance, setMonthlyAllowance] = React.useState("");
  const [allowanceDay, setAllowanceDay] = React.useState("1");
  const [semester, setSemester] = React.useState("");
  const [academicMode, setAcademicMode] = React.useState<AcademicMode>("KULIAH");
  const [university, setUniversity] = React.useState("");
  const [major, setMajor] = React.useState("");
  const [academicYear, setAcademicYear] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    if (profile) {
      setMonthlyAllowance(String(profile.monthlyAllowance));
      setAllowanceDay(String(profile.allowanceDay));
      setSemester(profile.semester ?? "");
      setAcademicMode(profile.academicMode);
      setUniversity(profile.university ?? "");
      setMajor(profile.major ?? "");
      setAcademicYear(profile.academicYear ?? "");
    } else {
      setMonthlyAllowance("");
      setAllowanceDay("1");
      setSemester("");
      setAcademicMode("KULIAH");
      setUniversity("");
      setMajor("");
      setAcademicYear("");
    }
    setError(null);
  }, [open, profile]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(monthlyAllowance);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Uang saku bulanan harus lebih dari 0.");
      return;
    }
    const dayNum = Number(allowanceDay);
    if (
      !Number.isFinite(dayNum) ||
      dayNum < 1 ||
      dayNum > 28
    ) {
      setError("Tanggal uang saku harus antara 1-28.");
      return;
    }
    updateMut.mutate(
      {
        monthlyAllowance: Math.round(amount),
        allowanceDay: dayNum,
        semester: semester.trim() || undefined,
        academicMode,
        university: university.trim() || undefined,
        major: major.trim() || undefined,
        academicYear: academicYear.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Uang saku tersimpan.");
          onOpenChange(false);
        },
        onError: (err) =>
          setError(err.message || "Gagal menyimpan uang saku."),
      }
    );
  }

  const pending = updateMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">
                {profile ? "Ubah Uang Saku" : "Atur Uang Saku"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Kami hitung sisa harian otomatis berdasarkan data ini.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
            {/* Monthly allowance */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-allowance">Uang Saku Bulanan (Rp)</Label>
              <Input
                id="sp-allowance"
                type="number"
                inputMode="numeric"
                min={0}
                step={10000}
                placeholder="cth. 1500000"
                value={monthlyAllowance}
                onChange={(e) => setMonthlyAllowance(e.target.value)}
                autoFocus
              />
              {monthlyAllowance && Number(monthlyAllowance) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(monthlyAllowance))} per bulan
                </p>
              )}
            </div>

            {/* Allowance day */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-day">Tanggal Cair Uang Saku</Label>
              <Select value={allowanceDay} onValueChange={setAllowanceDay}>
                <SelectTrigger id="sp-day" className="w-full">
                  <SelectValue placeholder="Pilih tanggal" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <SelectItem key={i + 1} value={String(i + 1)}>
                      Tanggal {i + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Academic mode */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-mode">Mode Akademik</Label>
              <Select
                value={academicMode}
                onValueChange={(v) => setAcademicMode(v as AcademicMode)}
              >
                <SelectTrigger id="sp-mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACADEMIC_MODES.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={m.icon}
                          className="h-4 w-4"
                          style={{ color: m.color }}
                        />
                        {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Semester */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-semester">Semester</Label>
              <Input
                id="sp-semester"
                placeholder="cth. 5"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                maxLength={3}
              />
            </div>

            {/* University */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-uni">Kampus / Universitas</Label>
              <Input
                id="sp-uni"
                placeholder="cth. Universitas Indonesia"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Major */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-major">Jurusan</Label>
              <Input
                id="sp-major"
                placeholder="cth. Teknik Informatika"
                value={major}
                onChange={(e) => setMajor(e.target.value)}
                maxLength={100}
              />
            </div>

            {/* Academic year */}
            <div className="space-y-1.5">
              <Label htmlFor="sp-year">Tahun Ajaran</Label>
              <Input
                id="sp-year"
                placeholder="cth. 2024/2025"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                maxLength={20}
              />
            </div>

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {profile ? "Simpan Perubahan" : "Simpan Uang Saku"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Jajan Grid                                                    */
/* ------------------------------------------------------------------ */

function QuickJajanGrid({
  categories,
  onCustom,
}: {
  categories: Category[] | undefined;
  onCustom: () => void;
}) {
  const createMut = useCreateTransaction();
  const pending = createMut.isPending;

  function handlePreset(preset: (typeof JAJAN_PRESETS)[number]) {
    const categoryId = resolveCategoryId(categories, preset.category);
    if (!categoryId) {
      toast.error(
        `Kategori "${preset.category}" belum ada. Tambah dulu di tab Kategori.`
      );
      return;
    }
    const payload: TransactionInput = {
      type: "EXPENSE",
      amount: preset.amount,
      description: preset.label,
      date: todayInput(),
      categoryId,
      time: nowTime(),
    };
    createMut.mutate(payload, {
      onSuccess: () =>
        toast.success(
          `Jajan ${preset.label} ${formatCurrency(preset.amount)} tercatat!`
        ),
      onError: (err) =>
        toast.error(err.message || "Gagal mencatat jajan."),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Jajan Cepat</h3>
          <p className="text-sm text-muted-foreground">
            Satu ketuk untuk catat jajan harian.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {JAJAN_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={pending}
            onClick={() => handlePreset(p)}
            className={cn(
              "group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all",
              "hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm",
              "dark:hover:border-emerald-500/50 dark:hover:bg-emerald-500/10",
              "disabled:cursor-not-allowed disabled:opacity-50"
            )}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-100 group-hover:text-emerald-700 dark:group-hover:bg-emerald-500/15 dark:group-hover:text-emerald-400">
              <LucideIcon name={p.icon} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {p.label}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {formatCurrency(p.amount)}
              </p>
            </div>
          </button>
        ))}

        {/* Custom jajan button */}
        <button
          type="button"
          onClick={onCustom}
          className={cn(
            "group flex items-center gap-3 rounded-xl border border-dashed border-emerald-400 bg-emerald-50/50 p-3 text-left transition-all",
            "hover:border-emerald-500 hover:bg-emerald-50",
            "dark:border-emerald-500/40 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10"
          )}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Plus className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Jangan lain
            </p>
            <p className="text-xs text-muted-foreground">Catat manual</p>
          </div>
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Custom Jajan Dialog                                                 */
/* ------------------------------------------------------------------ */

function CustomJajanDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  categories: Category[];
}) {
  const createMut = useCreateTransaction();
  const jajanCheck = useJajanCheck();

  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setAmount("");
      setDescription("");
      setError(null);
    }
  }, [open]);

  const amountNum = Number(amount);
  const canAfford = jajanCheck.data?.canAfford;

  React.useEffect(() => {
    if (!open) return;
    if (!Number.isFinite(amountNum) || amountNum <= 0) return;
    const t = setTimeout(() => {
      jajanCheck.mutate(amountNum);
    }, 500);
    return () => clearTimeout(t);
  }, [amount, amountNum, jajanCheck, open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Masukkan jumlah yang valid.");
      return;
    }
    const desc = description.trim() || "Jajan";
    const categoryId = resolveCategoryId(categories, "Makanan");
    if (!categoryId) {
      setError("Kategori Makanan belum ada. Tambah dulu di tab Kategori.");
      return;
    }
    const payload: TransactionInput = {
      type: "EXPENSE",
      amount: Math.round(amountNum),
      description: desc,
      date: todayInput(),
      categoryId,
      time: nowTime(),
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(
          `Jajan ${desc} ${formatCurrency(amountNum)} tercatat!`
        );
        onOpenChange(false);
      },
      onError: (err) =>
        setError(err.message || "Gagal mencatat jajan."),
    });
  }

  const pending = createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-base">Catat Jajan Lain</DialogTitle>
              <DialogDescription className="text-xs">
                Isi jumlah &amp; keterangan, kami catat sebagai pengeluaran.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="cj-amount">Jumlah (Rp)</Label>
              <Input
                id="cj-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={500}
                placeholder="cth. 8500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cj-desc">Keterangan</Label>
              <Textarea
                id="cj-desc"
                placeholder="cth. Cireng tukang sebelah, sekalian beli teman"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={120}
                className="min-h-16"
              />
            </div>

            {amount && Number(amount) > 0 && jajanCheck.data && (
              <div
                className={cn(
                  "flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
                  canAfford
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                )}
              >
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{jajanCheck.data.reply}</span>
              </div>
            )}

            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border bg-muted/30 p-4">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={pending}
              className="gap-1 bg-emerald-600 hover:bg-emerald-700"
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              <Plus className="h-4 w-4" />
              Catat Jajan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Challenge Card (available)                                          */
/* ------------------------------------------------------------------ */

const CHALLENGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  PiggyBank,
  Flame,
  TrendingDown,
  Minimize2,
  ShieldCheck,
  Music,
  Trophy,
  Target,
  Users,
};

function ChallengeCard({
  challenge,
  participation,
}: {
  challenge: Challenge;
  participation?: ChallengeParticipation;
}) {
  const joinMut = useJoinChallenge();
  const isJoined = !!participation;

  const Icon =
    CHALLENGE_ICONS[challenge.icon] ??
    CHALLENGE_ICONS[challenge.type] ??
    Trophy;

  const targetText =
    challenge.targetDays != null
      ? `${challenge.targetDays} hari`
      : challenge.targetAmount != null
      ? formatCurrencyCompact(challenge.targetAmount)
      : "—";

  return (
    <Card className="group flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${challenge.color}1a`,
            color: challenge.color,
          }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {challenge.name}
          </p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {challenge.description}
          </p>
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 border-transparent bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
        >
          <Zap className="mr-0.5 h-3 w-3" />
          {challenge.xpReward} XP
        </Badge>
      </div>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Target className="h-3 w-3" />
          {targetText}
        </span>
        {challenge.reward && (
          <span className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            {challenge.reward}
          </span>
        )}
      </div>

      {isJoined && participation ? (
        <ProgressBar
          progress={participation.progress}
          color={challenge.color}
        />
      ) : (
        <Button
          size="sm"
          className="w-full gap-1 bg-emerald-600 hover:bg-emerald-700"
          disabled={joinMut.isPending}
          onClick={() =>
            joinMut.mutate(challenge.id, {
              onSuccess: () =>
                toast.success(`Kamu gabung challenge "${challenge.name}"!`),
              onError: (err) =>
                toast.error(err.message || "Gagal bergabung challenge."),
            })
          }
        >
          {joinMut.isPending && joinMut.variables === challenge.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Gabung
        </Button>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Active Challenge Card                                               */
/* ------------------------------------------------------------------ */

function ActiveChallengeCard({
  participation,
  challenge,
}: {
  participation: ChallengeParticipation;
  challenge?: Challenge;
}) {
  const abandonMut = useAbandonChallenge();

  const Icon = challenge
    ? CHALLENGE_ICONS[challenge.icon] ?? Trophy
    : Trophy;
  const color = challenge?.color ?? "#10b981";
  const name = challenge?.name ?? "Challenge";

  const daysRemaining = React.useMemo(() => {
    if (!challenge?.targetDays) return null;
    const start = new Date(participation.startDate);
    const today = new Date();
    const elapsed = Math.floor(
      (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remaining = challenge.targetDays - elapsed;
    return Math.max(0, remaining);
  }, [participation.startDate, challenge]);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}1a`, color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {name}
            </p>
            <Badge
              variant="secondary"
              className="shrink-0 border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              Aktif
            </Badge>
          </div>
          {challenge?.description && (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {challenge.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <ProgressBar progress={participation.progress} color={color} />
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">
            {participation.progress.toFixed(0)}% selesai
          </span>
          {daysRemaining != null && (
            <span className="text-muted-foreground">
              {daysRemaining > 0 ? `${daysRemaining} hari lagi` : "Selesai hari ini"}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          Mulai {formatDateLong(participation.startDate)}
        </span>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={abandonMut.isPending}
              className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
              Tinggalkan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tinggalkan challenge?</AlertDialogTitle>
              <AlertDialogDescription>
                Progress pada <strong>{name}</strong> akan ditandai sebagai
                ditinggalkan. Kamu bisa gabung lagi nanti.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  abandonMut.mutate(participation.id, {
                    onSuccess: () =>
                      toast.success(`Kamu meninggalkan "${name}".`),
                    onError: (err) =>
                      toast.error(err.message || "Gagal meninggalkan challenge."),
                  })
                }
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {abandonMut.isPending && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                Tinggalkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Gamification Stats                                                  */
/* ------------------------------------------------------------------ */

function GamificationStats({
  levelInfo,
  streak,
  funFact,
  transactionCount,
}: {
  levelInfo: LevelInfo;
  streak: number;
  funFact: { text: string; tone: "good" | "neutral" } | null;
  transactionCount: number;
}) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Level */}
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-lg font-bold text-foreground">
                Level {levelInfo.level}
              </p>
              <Badge
                variant="secondary"
                className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
              >
                {levelInfo.title}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {levelInfo.xpInLevel} / {XP_PER_LEVEL} XP · sisa{" "}
              {levelInfo.xpToNext} XP ke level {levelInfo.level + 1}
            </p>
          </div>
        </div>

        {/* Streak & count */}
        <div className="flex gap-3">
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-500">
              <Flame className="h-4 w-4" />
            </div>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {streak}
            </p>
            <p className="text-[10px] text-muted-foreground">hari streak</p>
          </div>
          <div className="rounded-xl bg-muted/50 px-3 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-600 dark:text-emerald-400">
              <Coffee className="h-4 w-4" />
            </div>
            <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
              {transactionCount}
            </p>
            <p className="text-[10px] text-muted-foreground">transaksi</p>
          </div>
        </div>
      </div>

      {/* XP progress bar */}
      <div className="mt-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(levelInfo.progress)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
            style={{ width: `${Math.min(100, levelInfo.progress)}%` }}
          />
        </div>
      </div>

      {/* Fun fact */}
      {funFact && (
        <div
          className={cn(
            "mt-4 flex items-start gap-2 rounded-lg px-3 py-2 text-xs",
            funFact.tone === "good"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{funFact.text}</span>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared progress bar                                                 */
/* ------------------------------------------------------------------ */

function ProgressBar({
  progress,
  color,
}: {
  progress: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, progress));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-muted"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
