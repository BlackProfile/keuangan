"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Calendar,
  Check,
  CheckCircle2,
  HandCoins,
  Loader2,
  Plus,
  Receipt,
  Scale,
  Trash2,
  Users,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateInput,
} from "@/lib/format";
import { SPLIT_BILL_CATEGORIES } from "@/lib/student-constants";
import {
  useCreateFriendDebt,
  useCreateSplitBill,
  useDeleteFriendDebt,
  useDeleteSplitBill,
  useFriendDebts,
  useMarkParticipantPaid,
  useSettleFriendDebt,
  useSettleSplitBill,
  useSplitBills,
} from "@/lib/hooks";
import type {
  FriendDebt,
  FriendDebtInput,
  SplitBill,
  SplitBillInput,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type SplitCategoryValue = "MAKAN" | "KOS" | "EVENT" | "TRANSPORT" | "OTHER";
type SplitTypeValue = "EQUAL" | "CUSTOM" | "PERCENTAGE";
type FriendDebtType = "DEBT" | "RECEIVABLE";

function splitCategoryMeta(value: string) {
  return (
    SPLIT_BILL_CATEGORIES.find((c) => c.value === value) ??
    SPLIT_BILL_CATEGORIES[SPLIT_BILL_CATEGORIES.length - 1]
  );
}

function isOverdue(dueDate: string | null, settled: boolean): boolean {
  if (!dueDate || settled) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < today.getTime();
}

/** True when the debt is older than `days` days and still unsettled. */
function isStaleByDays(
  dateISO: string | Date,
  settled: boolean,
  days: number
): boolean {
  if (settled) return false;
  const d = new Date(dateISO);
  if (Number.isNaN(d.getTime())) return false;
  const diffMs = Date.now() - d.getTime();
  return diffMs >= days * 24 * 60 * 60 * 1000;
}

/** Net balance per friend across unsettled FriendDebts.
 *  Positive → friend owes me; Negative → I owe friend. */
interface NetBalance {
  friendName: string;
  net: number; // positive = friend owes me
  iOwe: number;
  owedToMe: number;
}

function computeNetBalances(debts: FriendDebt[]): NetBalance[] {
  const map = new Map<string, NetBalance>();
  for (const d of debts) {
    if (d.settled) continue;
    const name = d.friendName.trim();
    if (!name) continue;
    let entry = map.get(name);
    if (!entry) {
      entry = { friendName: name, net: 0, iOwe: 0, owedToMe: 0 };
      map.set(name, entry);
    }
    if (d.type === "DEBT") {
      entry.iOwe += d.amount;
      entry.net -= d.amount;
    } else {
      entry.owedToMe += d.amount;
      entry.net += d.amount;
    }
  }
  return Array.from(map.values()).filter((e) => Math.abs(e.net) >= 1);
}

/* ------------------------------------------------------------------ */
/*  Main section                                                        */
/* ------------------------------------------------------------------ */

export function PatunganSection() {
  const { data: splitBills, isLoading: splitLoading } = useSplitBills();
  const { data: friendDebts, isLoading: debtsLoading } = useFriendDebts();

  const [splitDialogOpen, setSplitDialogOpen] = React.useState(false);
  const [debtDialogOpen, setDebtDialogOpen] = React.useState(false);
  const [quickDebtDialogOpen, setQuickDebtDialogOpen] = React.useState(false);
  const [settleSmartOpen, setSettleSmartOpen] = React.useState(false);
  const [debtTab, setDebtTab] = React.useState<FriendDebtType>("DEBT");

  const totals = React.useMemo(() => {
    const debts = friendDebts ?? [];
    const iOwe = debts
      .filter((d) => d.type === "DEBT" && !d.settled)
      .reduce((s, d) => s + d.amount, 0);
    const owedToMe = debts
      .filter((d) => d.type === "RECEIVABLE" && !d.settled)
      .reduce((s, d) => s + d.amount, 0);
    const splitUnsettled = (splitBills ?? [])
      .filter((b) => !b.settled)
      .reduce((s, b) => s + b.totalAmount, 0);
    return { iOwe, owedToMe, splitUnsettled };
  }, [friendDebts, splitBills]);

  const myDebts = (friendDebts ?? []).filter((d) => d.type === "DEBT");
  const theirDebts = (friendDebts ?? []).filter(
    (d) => d.type === "RECEIVABLE"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Patungan &amp; Hutang Teman
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kelola tagihan bersama dan ingat siapa belum lunas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => setQuickDebtDialogOpen(true)}
            className="gap-1"
            aria-label="Hutang Teman — catat cepat"
          >
            <Zap className="h-4 w-4 text-amber-500" />
            Hutang Teman
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDebtTab("DEBT");
              setDebtDialogOpen(true);
            }}
            className="gap-1"
          >
            <HandCoins className="h-4 w-4" />
            Tambah Hutang
          </Button>
          <Button
            onClick={() => setSplitDialogOpen(true)}
            className="gap-1 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Buat Patungan
          </Button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Saya berhutang"
          value={totals.iOwe}
          icon={<ArrowRight className="h-4 w-4" />}
          tone="expense"
        />
        <StatCard
          label="Teman berhutang"
          value={totals.owedToMe}
          icon={<ArrowRightLeft className="h-4 w-4" />}
          tone="income"
        />
        <StatCard
          label="Patungan belum settle"
          value={totals.splitUnsettled}
          icon={<Users className="h-4 w-4" />}
          tone="default"
        />
      </div>

      {/* Settle up smart action */}
      <div className="flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSettleSmartOpen(true)}
          className="gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        >
          <Scale className="h-4 w-4" />
          Settle Up Smart
        </Button>
      </div>

      {/* Split Bills */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Patungan</h3>
          <p className="text-sm text-muted-foreground">
            Bagi bill bareng teman, tandai siapa yang sudah bayar.
          </p>
        </div>

        {splitLoading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-2xl" />
            ))}
          </div>
        ) : (splitBills ?? []).length === 0 ? (
          <SplitBillEmptyState onCreate={() => setSplitDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(splitBills ?? []).map((b) => (
              <SplitBillCard key={b.id} bill={b} />
            ))}
          </div>
        )}
      </div>

      {/* Friend Debts */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">
            Hutang Teman
          </h3>
          <p className="text-sm text-muted-foreground">
            Catat utang piutang kecil dengan teman, lengkap dengan jatuh tempo.
          </p>
        </div>

        <Tabs
          value={debtTab}
          onValueChange={(v) => setDebtTab(v as FriendDebtType)}
        >
          <TabsList>
            <TabsTrigger value="DEBT" className="gap-1">
              <ArrowRight className="h-3.5 w-3.5" />
              Saya Berhutang
            </TabsTrigger>
            <TabsTrigger value="RECEIVABLE" className="gap-1">
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Teman Berhutang
            </TabsTrigger>
          </TabsList>

          <TabsContent value="DEBT" className="mt-3">
            {debtsLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : myDebts.length === 0 ? (
              <FriendDebtEmpty
                type="DEBT"
                onCreate={() => {
                  setDebtTab("DEBT");
                  setDebtDialogOpen(true);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {myDebts.map((d) => (
                  <FriendDebtCard key={d.id} debt={d} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="RECEIVABLE" className="mt-3">
            {debtsLoading ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : theirDebts.length === 0 ? (
              <FriendDebtEmpty
                type="RECEIVABLE"
                onCreate={() => {
                  setDebtTab("RECEIVABLE");
                  setDebtDialogOpen(true);
                }}
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {theirDebts.map((d) => (
                  <FriendDebtCard key={d.id} debt={d} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <SplitBillFormDialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen} />
      <FriendDebtFormDialog
        open={debtDialogOpen}
        onOpenChange={setDebtDialogOpen}
        defaultType={debtTab}
      />
      <QuickFriendDebtDialog
        open={quickDebtDialogOpen}
        onOpenChange={setQuickDebtDialogOpen}
      />
      <SettleUpSmartDialog
        open={settleSmartOpen}
        onOpenChange={setSettleSmartOpen}
        debts={friendDebts ?? []}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "default" | "income" | "expense";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <span className="text-muted-foreground/70">{icon}</span>
      </div>
      <p
        className={cn(
          "mt-1 text-xl font-bold tabular-nums",
          tone === "income" && "text-emerald-600 dark:text-emerald-400",
          tone === "expense" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {formatCurrency(value)}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Split Bill Card                                                     */
/* ------------------------------------------------------------------ */

function SplitBillCard({ bill }: { bill: SplitBill }) {
  const settleMut = useSettleSplitBill();
  const deleteMut = useDeleteSplitBill();
  const markPaidMut = useMarkParticipantPaid();

  const catMeta = splitCategoryMeta(bill.category);
  const paidCount = bill.participants.filter((p) => p.paid).length;
  const allPaid = paidCount === bill.participants.length && paidCount > 0;
  const isSettled = bill.settled || allPaid;

  const unpaidShare = bill.participants
    .filter((p) => !p.paid)
    .reduce((s, p) => s + p.share, 0);

  return (
    <Card className="flex flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${catMeta.color}1a`,
            color: catMeta.color,
          }}
        >
          <LucideIcon name={catMeta.icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">
            {bill.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Dibayar oleh <span className="font-medium">{bill.paidBy}</span> ·{" "}
            {formatDate(bill.date)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Badge
            variant="secondary"
            className="border-transparent"
            style={{
              backgroundColor: `${catMeta.color}1a`,
              color: catMeta.color,
            }}
          >
            {catMeta.label}
          </Badge>
          {isSettled && (
            <Badge
              variant="secondary"
              className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              <Check className="mr-0.5 h-3 w-3" />
              Lunas
            </Badge>
          )}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-end justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2">
        <div>
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-lg font-bold tabular-nums text-foreground">
            {formatCurrency(bill.totalAmount)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted-foreground">Belum dibayar</p>
          <p
            className={cn(
              "text-sm font-semibold tabular-nums",
              unpaidShare > 0
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(unpaidShare)}
          </p>
        </div>
      </div>

      {/* Participants */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Peserta ({paidCount}/{bill.participants.length} lunas)
        </p>
        <div className="max-h-40 overflow-y-auto pr-1">
          <ul className="space-y-1.5">
            {bill.participants.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2.5 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {p.paid ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <span className="h-4 w-4 shrink-0 rounded-full border border-muted-foreground/40" />
                  )}
                  <span
                    className={cn(
                      "truncate text-sm",
                      p.paid && "text-muted-foreground line-through"
                    )}
                  >
                    {p.name}
                    {bill.paidBy === p.name && (
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        (payer)
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatCurrencyCompact(p.share)}
                  </span>
                  {!p.paid && !bill.settled && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={markPaidMut.isPending}
                      onClick={() =>
                        markPaidMut.mutate(p.id, {
                          onSuccess: () =>
                            toast.success(`${p.name} ditandai lunas.`),
                          onError: (err) =>
                            toast.error(
                              err.message || "Gagal menandai peserta."
                            ),
                        })
                      }
                      className="h-7 px-2 text-xs text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
                    >
                      Tandai Lunas
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={settleMut.isPending || bill.settled}
          onClick={() =>
            settleMut.mutate(bill.id, {
              onSuccess: () =>
                toast.success(`Patungan "${bill.title}" ditandai lunas semua.`),
              onError: (err) =>
                toast.error(err.message || "Gagal menandai patungan."),
            })
          }
          className="gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        >
          {settleMut.isPending && settleMut.variables === bill.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Settle Semua
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={deleteMut.isPending}
              aria-label="Hapus patungan"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus patungan ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Patungan <strong>{bill.title}</strong> akan dihapus permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteMut.mutate(bill.id, {
                    onSuccess: () =>
                      toast.success(`Patungan "${bill.title}" dihapus.`),
                    onError: (err) =>
                      toast.error(err.message || "Gagal menghapus patungan."),
                  })
                }
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

/* ------------------------------------------------------------------ */
/*  Split Bill Form Dialog                                              */
/* ------------------------------------------------------------------ */

function SplitBillFormDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createMut = useCreateSplitBill();

  const [title, setTitle] = React.useState("");
  const [totalAmount, setTotalAmount] = React.useState("");
  const [paidBy, setPaidBy] = React.useState("");
  const [splitType, setSplitType] = React.useState<SplitTypeValue>("EQUAL");
  const [category, setCategory] = React.useState<SplitCategoryValue>("MAKAN");
  const [note, setNote] = React.useState("");
  const [participants, setParticipants] = React.useState<
    Array<{ name: string; share: string }>
  >([
    { name: "", share: "" },
    { name: "", share: "" },
  ]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setTotalAmount("");
    setPaidBy("");
    setSplitType("EQUAL");
    setCategory("MAKAN");
    setNote("");
    setParticipants([
      { name: "", share: "" },
      { name: "", share: "" },
    ]);
    setError(null);
  }, [open]);

  const totalNum = Number(totalAmount) || 0;

  // Recompute EQUAL shares when total/participant-count changes
  const computedParticipants = React.useMemo(() => {
    if (splitType !== "EQUAL") return participants;
    const validCount = participants.filter((p) => p.name.trim()).length;
    const share = validCount > 0 ? Math.round(totalNum / validCount) : 0;
    return participants.map((p) =>
      p.name.trim() ? { ...p, share: String(share) } : p
    );
  }, [participants, splitType, totalNum]);

  const shareSum = React.useMemo(() => {
    return computedParticipants
      .filter((p) => p.name.trim())
      .reduce((s, p) => s + (Number(p.share) || 0), 0);
  }, [computedParticipants]);

  const shareMismatch =
    splitType === "CUSTOM" && totalNum > 0 && shareSum !== totalNum;

  function addParticipant() {
    setParticipants((prev) => [...prev, { name: "", share: "" }]);
  }
  function removeParticipant(idx: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }
  function updateParticipant(idx: number, field: "name" | "share", value: string) {
    setParticipants((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Judul patungan wajib diisi.");
      return;
    }
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      setError("Total jumlah harus lebih dari 0.");
      return;
    }
    if (!paidBy.trim()) {
      setError("Isi siapa yang membayar.");
      return;
    }
    const valid = computedParticipants.filter((p) => p.name.trim());
    if (valid.length < 2) {
      setError("Minimal 2 peserta untuk patungan.");
      return;
    }
    if (shareMismatch) {
      setError(
        `Total share (${formatCurrency(shareSum)}) tidak sama dengan total (${formatCurrency(
          totalNum
        )}). Sesuaikan dulu.`
      );
      return;
    }

    const catMeta = splitCategoryMeta(category);
    const payload: SplitBillInput = {
      title: title.trim(),
      description: undefined,
      totalAmount: Math.round(totalNum),
      paidBy: paidBy.trim(),
      splitType,
      category,
      icon: catMeta.icon,
      color: catMeta.color,
      note: note.trim() || undefined,
      participants: valid.map((p) => ({
        name: p.name.trim(),
        share: splitType === "EQUAL" ? Math.round(totalNum / valid.length) : Math.round(Number(p.share) || 0),
      })),
    };

    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Patungan dibuat.");
        onOpenChange(false);
      },
      onError: (err) =>
        setError(err.message || "Gagal membuat patungan."),
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
              <DialogTitle className="text-base">Buat Patungan</DialogTitle>
              <DialogDescription className="text-xs">
                Bagi tagihan bareng teman, otomatis terhitung share-nya.
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
            <div className="space-y-1.5">
              <Label htmlFor="sb-title">Judul</Label>
              <Input
                id="sb-title"
                placeholder="cth. Makan Ayam Geprek"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                maxLength={60}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sb-total">Total (Rp)</Label>
                <Input
                  id="sb-total"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  placeholder="cth. 60000"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(e.target.value)}
                />
                {totalNum > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(totalNum)}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-paidby">Dibayar Oleh</Label>
                <Input
                  id="sb-paidby"
                  placeholder="cth. Aku / Andi"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  maxLength={40}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="sb-split">Tipe Bagi</Label>
                <Select
                  value={splitType}
                  onValueChange={(v) => setSplitType(v as SplitTypeValue)}
                >
                  <SelectTrigger id="sb-split" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EQUAL">Sama Rata</SelectItem>
                    <SelectItem value="CUSTOM">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sb-cat">Kategori</Label>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as SplitCategoryValue)}
                >
                  <SelectTrigger id="sb-cat" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPLIT_BILL_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        <span className="flex items-center gap-2">
                          <LucideIcon
                            name={c.icon}
                            className="h-4 w-4"
                            style={{ color: c.color }}
                          />
                          {c.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Peserta</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addParticipant}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  Tambah
                </Button>
              </div>

              <div className="space-y-2">
                {computedParticipants.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Nama peserta ${idx + 1}`}
                      value={p.name}
                      onChange={(e) =>
                        updateParticipant(idx, "name", e.target.value)
                      }
                      maxLength={40}
                    />
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="share"
                      value={p.share}
                      onChange={(e) =>
                        updateParticipant(idx, "share", e.target.value)
                      }
                      disabled={splitType === "EQUAL"}
                      className="w-28 tabular-nums"
                    />
                    {participants.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeParticipant(idx)}
                        className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                        aria-label="Hapus peserta"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {splitType === "EQUAL" && totalNum > 0 && (
                <p className="text-xs text-muted-foreground">
                  Share otomatis dihitung rata:{" "}
                  <span className="font-medium tabular-nums">
                    {formatCurrency(
                      computedParticipants.filter((p) => p.name.trim()).length >
                        0
                        ? Math.round(
                            totalNum /
                              computedParticipants.filter((p) =>
                                p.name.trim()
                              ).length
                          )
                        : 0
                    )}
                  </span>{" "}
                  / orang
                </p>
              )}
              {shareMismatch && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Total share ({formatCurrency(shareSum)}) belum sama dengan{" "}
                  {formatCurrency(totalNum)}.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sb-note">Catatan (opsional)</Label>
              <Textarea
                id="sb-note"
                placeholder="cth. Bayar di restoran depan kampus"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                className="min-h-16"
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
              <Plus className="h-4 w-4" />
              Buat Patungan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Split Bill Empty State                                             */
/* ------------------------------------------------------------------ */

function SplitBillEmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Receipt className="h-7 w-7 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          Belum ada patungan
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Bagi bill bareng teman biar gampang ngitung siapa bayar berapa.
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-4 w-4" />
        Buat Patungan Pertama
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Friend Debt Card                                                    */
/* ------------------------------------------------------------------ */

function FriendDebtCard({ debt }: { debt: FriendDebt }) {
  const settleMut = useSettleFriendDebt();
  const deleteMut = useDeleteFriendDebt();

  const overdue = isOverdue(debt.dueDate, debt.settled);
  const stale = isStaleByDays(debt.date, debt.settled, 7);
  const isOwe = debt.type === "DEBT";

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              isOwe
                ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
                : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            )}
          >
            <HandCoins className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {debt.friendName}
            </p>
            <p className="text-xs text-muted-foreground">
              {isOwe ? "Saya berhutang" : "Berhutang ke saya"} ·{" "}
              {formatDate(debt.date)}
            </p>
            {debt.description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                {debt.description}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          <p
            className={cn(
              "text-base font-bold tabular-nums",
              isOwe
                ? "text-rose-600 dark:text-rose-400"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {formatCurrency(debt.amount)}
          </p>
          {debt.settled ? (
            <Badge
              variant="secondary"
              className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
            >
              <Check className="mr-0.5 h-3 w-3" />
              Lunas
            </Badge>
          ) : overdue ? (
            <Badge
              variant="secondary"
              className="border-transparent bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
            >
              <AlertTriangle className="mr-0.5 h-3 w-3" />
              Jatuh tempo
            </Badge>
          ) : stale ? (
            <Badge
              variant="secondary"
              className="border-transparent bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400"
            >
              <Bell className="mr-0.5 h-3 w-3" />
              Reminder
            </Badge>
          ) : debt.dueDate ? (
            <Badge variant="outline" className="gap-1 text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {formatDate(debt.dueDate)}
            </Badge>
          ) : null}
        </div>
      </div>

      {debt.note && (
        <p className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground">
          {debt.note}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={settleMut.isPending || debt.settled}
          onClick={() =>
            settleMut.mutate(debt.id, {
              onSuccess: () =>
                toast.success(
                  `Utang dengan ${debt.friendName} dilunasi.`
                ),
              onError: (err) =>
                toast.error(err.message || "Gagal melunasi utang."),
            })
          }
          className="gap-1 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        >
          {settleMut.isPending && settleMut.variables === debt.id ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5" />
          )}
          Tandai Lunas
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              disabled={deleteMut.isPending}
              aria-label="Hapus utang"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus catatan ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Utang dengan <strong>{debt.friendName}</strong> akan dihapus
                permanen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deleteMut.mutate(debt.id, {
                    onSuccess: () =>
                      toast.success(`Catatan utang dihapus.`),
                    onError: (err) =>
                      toast.error(err.message || "Gagal menghapus utang."),
                  })
                }
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

/* ------------------------------------------------------------------ */
/*  Friend Debt Empty State                                             */
/* ------------------------------------------------------------------ */

function FriendDebtEmpty({
  type,
  onCreate,
}: {
  type: FriendDebtType;
  onCreate: () => void;
}) {
  const isOwe = type === "DEBT";
  return (
    <Card className="flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-2xl",
          isOwe
            ? "bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400"
            : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        )}
      >
        <HandCoins className="h-7 w-7" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">
          {isOwe ? "Belum ada utang ke teman" : "Belum ada piutang"}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {isOwe
            ? "Catat kalau kamu minjem ke teman biar gak lupa bayar."
            : "Catat kalau teman minjem ke kamu biar gengsi gak ngilu."}
        </p>
      </div>
      <Button onClick={onCreate} className="gap-1 bg-emerald-600 hover:bg-emerald-700">
        <Plus className="h-4 w-4" />
        Tambah
      </Button>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Friend Debt Form Dialog                                             */
/* ------------------------------------------------------------------ */

function FriendDebtFormDialog({
  open,
  onOpenChange,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType: FriendDebtType;
}) {
  const createMut = useCreateFriendDebt();

  const [friendName, setFriendName] = React.useState("");
  const [type, setType] = React.useState<FriendDebtType>(defaultType);
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setFriendName("");
    setType(defaultType);
    setAmount("");
    setDescription("");
    setDueDate("");
    setNote("");
    setError(null);
  }, [open, defaultType]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!friendName.trim()) {
      setError("Nama teman wajib diisi.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    const payload: FriendDebtInput = {
      friendName: friendName.trim(),
      type,
      amount: Math.round(amountNum),
      description: description.trim() || undefined,
      dueDate: dueDate || undefined,
      note: note.trim() || undefined,
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success("Catatan utang ditambahkan.");
        onOpenChange(false);
      },
      onError: (err) =>
        setError(err.message || "Gagal menambahkan utang."),
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
              <DialogTitle className="text-base">Tambah Catatan Utang</DialogTitle>
              <DialogDescription className="text-xs">
                Catat utang piutang kecil dengan teman.
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
              <Label htmlFor="fd-type">Tipe</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as FriendDebtType)}
              >
                <SelectTrigger id="fd-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBT">Saya berhutang ke teman</SelectItem>
                  <SelectItem value="RECEIVABLE">
                    Teman berhutang ke saya
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fd-name">Nama Teman</Label>
              <Input
                id="fd-name"
                placeholder="cth. Andi"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fd-amount">Jumlah (Rp)</Label>
              <Input
                id="fd-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="cth. 25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fd-desc">Keterangan</Label>
              <Input
                id="fd-desc"
                placeholder="cth. Bayar makan siang"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fd-due">Jatuh Tempo (opsional)</Label>
              <Input
                id="fd-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                min={formatDateInput(new Date())}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fd-note">Catatan (opsional)</Label>
              <Textarea
                id="fd-note"
                placeholder="cth. Akan dilunas waktu gajian"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={120}
                className="min-h-16"
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
              <Plus className="h-4 w-4" />
              Simpan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Friend Debt Dialog — fast: friendName + amount + Catat       */
/* ------------------------------------------------------------------ */

function QuickFriendDebtDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const createMut = useCreateFriendDebt();
  const [friendName, setFriendName] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [type, setType] = React.useState<FriendDebtType>("DEBT");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setFriendName("");
    setAmount("");
    setType("DEBT");
    setError(null);
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!friendName.trim()) {
      setError("Nama teman wajib diisi.");
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }
    const payload: FriendDebtInput = {
      friendName: friendName.trim(),
      type,
      amount: Math.round(amountNum),
    };
    createMut.mutate(payload, {
      onSuccess: () => {
        toast.success(
          `Catat: ${type === "DEBT" ? "berhutang ke" : "piutang dari"} ${friendName.trim()} ${formatCurrency(amountNum)}.`
        );
        onOpenChange(false);
      },
      onError: (err) =>
        setError(err.message || "Gagal menambahkan utang."),
    });
  }

  const pending = createMut.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-1.5 text-base">
                <Zap className="h-4 w-4 text-amber-500" />
                Hutang Teman
              </DialogTitle>
              <DialogDescription className="text-xs">
                Catat cepat — isi nama + jumlah saja.
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
          <div className="space-y-3 p-5">
            {/* Type toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("DEBT")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  type === "DEBT"
                    ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-500/50 dark:bg-rose-500/10 dark:text-rose-400"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
                aria-pressed={type === "DEBT"}
              >
                <ArrowRight className="h-3.5 w-3.5" />
                Saya berhutang
              </button>
              <button
                type="button"
                onClick={() => setType("RECEIVABLE")}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  type === "RECEIVABLE"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                )}
                aria-pressed={type === "RECEIVABLE"}
              >
                <ArrowRightLeft className="h-3.5 w-3.5" />
                Teman berhutang
              </button>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qd-name">Nama Teman</Label>
              <Input
                id="qd-name"
                placeholder="cth. Andi"
                value={friendName}
                onChange={(e) => setFriendName(e.target.value)}
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qd-amount">Jumlah (Rp)</Label>
              <Input
                id="qd-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                placeholder="cth. 25000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {amount && Number(amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(Number(amount))}
                </p>
              )}
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
              <Check className="h-4 w-4" />
              Catat
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Settle Up Smart — net debt between all friends                     */
/* ------------------------------------------------------------------ */

function SettleUpSmartDialog({
  open,
  onOpenChange,
  debts,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debts: FriendDebt[];
}) {
  const balances = React.useMemo(
    () => computeNetBalances(debts),
    [debts]
  );

  // Simple greedy matching: creditors (net > 0) match debtors (net < 0)
  const suggestions = React.useMemo(() => {
    const creditors = balances
      .filter((b) => b.net > 0)
      .sort((a, b) => b.net - a.net);
    const debtors = balances
      .filter((b) => b.net < 0)
      .sort((a, b) => a.net - b.net); // most negative first
    const out: Array<{ from: string; to: string; amount: number }> = [];
    let i = 0;
    let j = 0;
    const cRemain = creditors.map((c) => c.net);
    const dRemain = debtors.map((d) => Math.abs(d.net));
    while (i < debtors.length && j < creditors.length) {
      const dName = debtors[i].friendName;
      const cName = creditors[j].friendName;
      const transfer = Math.min(dRemain[i], cRemain[j]);
      if (transfer >= 1) {
        out.push({ from: dName, to: cName, amount: Math.round(transfer) });
      }
      dRemain[i] -= transfer;
      cRemain[j] -= transfer;
      if (dRemain[i] < 1) i++;
      if (cRemain[j] < 1) j++;
    }
    return out;
  }, [balances]);

  const totalCredit = balances
    .filter((b) => b.net > 0)
    .reduce((s, b) => s + b.net, 0);
  const totalDebit = balances
    .filter((b) => b.net < 0)
    .reduce((s, b) => s + Math.abs(b.net), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-1.5 text-base">
                <Scale className="h-4 w-4 text-emerald-600" />
                Settle Up Smart
              </DialogTitle>
              <DialogDescription className="text-xs">
                Konsolidasi semua utang jadi transfer minimum.
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto p-5 custom-scrollbar">
          {balances.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium">Semua sudah rata!</p>
              <p className="text-xs text-muted-foreground">
                Tidak ada utang piutang yang perlu diselesaikan.
              </p>
            </div>
          ) : (
            <>
              {/* Net balance per friend */}
              <div className="space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Saldo bersih per teman
                </p>
                <div className="max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-border bg-muted/20 p-2">
                  <ul className="space-y-1">
                    {balances
                      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
                      .map((b) => (
                        <li
                          key={b.friendName}
                          className="flex items-center justify-between rounded px-2 py-1.5 text-sm"
                        >
                          <span className="truncate text-foreground">
                            {b.friendName}
                          </span>
                          <span
                            className={cn(
                              "shrink-0 font-medium tabular-nums",
                              b.net > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : b.net < 0
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground"
                            )}
                          >
                            {b.net > 0 ? "+" : ""}
                            {formatCurrencyCompact(b.net)}
                          </span>
                        </li>
                      ))}
                  </ul>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    +{formatCurrency(totalCredit)}
                  </span>{" "}
                  piutang ·{" "}
                  <span className="text-rose-600 dark:text-rose-400">
                    −{formatCurrency(totalDebit)}
                  </span>{" "}
                  utang
                </p>
              </div>

              {/* Transfer suggestions */}
              <div className="mt-4 space-y-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Saran transfer minimum
                </p>
                {suggestions.length === 0 ? (
                  <p className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                    Tidak ada transfer diperlukan.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {suggestions.map((s, idx) => (
                      <li
                        key={`${s.from}-${s.to}-${idx}`}
                        className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2 dark:border-emerald-500/30 dark:bg-emerald-500/5"
                      >
                        <span className="rounded-md bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                          {s.from}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span className="rounded-md bg-background px-2 py-0.5 text-xs font-medium text-foreground">
                          {s.to}
                        </span>
                        <span className="ml-auto text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(s.amount)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="pt-1 text-[11px] text-muted-foreground">
                  Setelah transfer di atas, semua utang piutang dianggap lunas.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="border-t border-border bg-muted/30 p-4">
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Tutup
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
