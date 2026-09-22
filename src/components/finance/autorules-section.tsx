"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  CheckCircle2,
  FlaskConical,
  Info,
  Loader2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  useAccounts,
  useAutoRules,
  useCategories,
  useCreateAutoRule,
  useDeleteAutoRule,
  useTestAutoRule,
  useToggleAutoRule,
} from "@/lib/hooks";
import type {
  AutoRule,
  AutoRuleAction,
  AutoRuleField,
  AutoRuleOperator,
} from "@/lib/types";

const FIELD_OPTIONS: { value: AutoRuleField; label: string }[] = [
  { value: "merchant", label: "Merchant" },
  { value: "description", label: "Deskripsi" },
  { value: "note", label: "Catatan" },
];

const OPERATOR_OPTIONS: { value: AutoRuleOperator; label: string }[] = [
  { value: "contains", label: "mengandung" },
  { value: "equals", label: "sama dengan" },
  { value: "startsWith", label: "diawali dengan" },
];

const ACTION_OPTIONS: {
  value: AutoRuleAction;
  label: string;
  icon: string;
}[] = [
  { value: "categorize", label: "Kategorikan", icon: "Folder" },
  { value: "tag", label: "Beri Tag", icon: "Tag" },
  { value: "account", label: "Pilih Akun", icon: "Wallet" },
];

function fieldLabel(f: AutoRuleField): string {
  return FIELD_OPTIONS.find((o) => o.value === f)?.label ?? f;
}
function operatorLabel(o: AutoRuleOperator): string {
  return OPERATOR_OPTIONS.find((x) => x.value === o)?.label ?? o;
}
function actionLabel(a: AutoRuleAction): string {
  return ACTION_OPTIONS.find((x) => x.value === a)?.label ?? a;
}

function getTargetName(rule: AutoRule): string | null {
  if (rule.action === "categorize") return rule.category?.name ?? null;
  if (rule.action === "account") return rule.account?.name ?? null;
  if (rule.action === "tag") return rule.targetId ?? rule.value;
  return null;
}

function getTargetIcon(rule: AutoRule): string {
  if (rule.action === "categorize") return rule.category?.icon ?? "Folder";
  if (rule.action === "account") return rule.account?.icon ?? "Wallet";
  if (rule.action === "tag") return "Tag";
  return "Circle";
}

function getTargetColor(rule: AutoRule): string {
  if (rule.action === "categorize") return rule.category?.color ?? "#10b981";
  if (rule.action === "account") return rule.account?.color ?? "#10b981";
  if (rule.action === "tag") return "#10b981";
  return "#10b981";
}

export function AutorulesSection() {
  const { data: rules, isLoading } = useAutoRules();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const createMut = useCreateAutoRule();
  const deleteMut = useDeleteAutoRule();
  const toggleMut = useToggleAutoRule();
  const testMut = useTestAutoRule();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [testText, setTestText] = React.useState("");

  // Form state
  const [form, setForm] = React.useState<{
    field: AutoRuleField;
    operator: AutoRuleOperator;
    value: string;
    action: AutoRuleAction;
    targetId: string;
    tagValue: string;
  }>({
    field: "merchant",
    operator: "contains",
    value: "",
    action: "categorize",
    targetId: "",
    tagValue: "",
  });

  function openCreate() {
    setForm({
      field: "merchant",
      operator: "contains",
      value: "",
      action: "categorize",
      targetId: "",
      tagValue: "",
    });
    setDialogOpen(true);
  }

  function handleToggle(rule: AutoRule, next: boolean) {
    toggleMut.mutate(
      { id: rule.id, active: next },
      {
        onSuccess: () => {
          toast.success(
            next ? "Aturan diaktifkan" : "Aturan dinonaktifkan"
          );
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }

  function handleDelete(rule: AutoRule) {
    deleteMut.mutate(rule.id, {
      onSuccess: () => toast.success("Aturan dihapus"),
      onError: (e) => toast.error(e.message),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.value.trim()) {
      toast.error("Nilai pencocokan wajib diisi");
      return;
    }
    if (form.action === "categorize" && !form.targetId) {
      toast.error("Kategori target wajib dipilih");
      return;
    }
    if (form.action === "account" && !form.targetId) {
      toast.error("Akun target wajib dipilih");
      return;
    }
    if (form.action === "tag" && !form.tagValue.trim()) {
      toast.error("Nama tag wajib diisi");
      return;
    }
    createMut.mutate(
      {
        field: form.field,
        operator: form.operator,
        value: form.value.trim(),
        action: form.action,
        targetId:
          form.action === "tag" ? form.tagValue.trim() : form.targetId,
        active: true,
      },
      {
        onSuccess: () => {
          toast.success("Aturan otomatis dibuat");
          setDialogOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  }

  function runTest() {
    const text = testText.trim();
    if (!text) return;
    testMut.mutate(text, {
      onError: (e) => toast.error(e.message),
    });
  }

  const testResult = testMut.data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Wand2 className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Aturan Otomatis</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Otomatis kategorikan transaksi berdasarkan aturan
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Tambah Aturan
        </Button>
      </div>

      {/* Rules list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : !rules || rules.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 border-dashed p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold">Belum ada aturan otomatis</p>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Buat aturan pertama Anda untuk secara otomatis mengkategorikan,
              memberi tag, atau memilih akun pada transaksi baru sesuai kondisi
              tertentu — misalnya: “Jika merchant mengandung ‘kopken’ →
              kategorikan ke Makanan”.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="mt-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Buat Aturan Pertama
          </Button>
        </Card>
      ) : (
        <div className="grid gap-3">
          {rules.map((rule) => {
            const targetName = getTargetName(rule);
            const targetIcon = getTargetIcon(rule);
            const targetColor = getTargetColor(rule);
            return (
              <Card
                key={rule.id}
                className={cn(
                  "border p-4 transition-colors",
                  rule.active
                    ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
                    : "border-border bg-card opacity-70"
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: targetColor }}
                    >
                      <LucideIcon name={targetIcon} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm leading-relaxed">
                        <span className="font-medium">Jika</span>{" "}
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                          {fieldLabel(rule.field)}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {operatorLabel(rule.operator)}
                        </span>{" "}
                        <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                          &apos;{rule.value}&apos;
                        </code>{" "}
                        <ArrowRight className="mx-1 inline h-3 w-3 text-muted-foreground" />{" "}
                        <Badge
                          variant="secondary"
                          className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                        >
                          {actionLabel(rule.action)}
                        </Badge>{" "}
                        <span className="font-medium">ke</span>{" "}
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                          {targetName ?? "—"}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dibuat {new Date(rule.createdAt).toLocaleDateString(
                          "id-ID",
                          { day: "numeric", month: "short", year: "numeric" }
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={rule.active}
                      onCheckedChange={(v) => handleToggle(rule, v)}
                      disabled={toggleMut.isPending}
                      aria-label="Aktifkan aturan"
                    />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Hapus aturan"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus aturan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Aturan ini akan dihapus permanen dan tidak bisa
                            dibatalkan.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Batal</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(rule)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Hapus
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Test area */}
      <Card className="border-emerald-200 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
            <FlaskConical className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">Uji Aturan</p>
            <p className="text-xs text-muted-foreground">
              Masukkan teks contoh (merchant / deskripsi / catatan) untuk
              melihat aturan mana yang cocok
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="cth: KOPI KENANGAN PUSAT #0021"
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                runTest();
              }
            }}
          />
          <Button
            onClick={runTest}
            disabled={testMut.isPending || !testText.trim()}
            variant="outline"
            className="border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
          >
            {testMut.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-1.5 h-4 w-4" />
            )}
            Uji
          </Button>
        </div>
        {testMut.isPending ? null : testResult?.matched ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-background p-3 dark:border-emerald-500/30">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-medium">
                Cocok dengan aturan →{" "}
                <span className="text-emerald-700 dark:text-emerald-400">
                  {actionLabel(testResult.rule!.action)}
                </span>{" "}
                ke{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                  {testResult.targetName ?? "—"}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Aturan: jika {fieldLabel(testResult.rule!.field)}{" "}
                {operatorLabel(testResult.rule!.operator)} &apos;
                {testResult.rule!.value}&apos;
              </p>
            </div>
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
              style={{ backgroundColor: testResult.targetColor ?? "#10b981" }}
            >
              <LucideIcon
                name={testResult.targetIcon ?? "Circle"}
                className="h-4 w-4"
              />
            </div>
          </div>
        ) : testResult && !testResult.matched ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-muted bg-background p-3 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Tidak ada aturan aktif yang cocok dengan teks tersebut.
            </p>
          </div>
        ) : null}
      </Card>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Buat Aturan Otomatis</DialogTitle>
            <DialogDescription>
              Aturan akan diterapkan saat transaksi baru dibuat dan cocok dengan
              kondisi berikut.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-field">Field yang diperiksa</Label>
              <Select
                value={form.field}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, field: v as AutoRuleField }))
                }
              >
                <SelectTrigger id="rule-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Operator */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-op">Operator</Label>
              <Select
                value={form.operator}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, operator: v as AutoRuleOperator }))
                }
              >
                <SelectTrigger id="rule-op">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OPERATOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Value */}
            <div className="space-y-1.5">
              <Label htmlFor="rule-value">Nilai pencocokan</Label>
              <Input
                id="rule-value"
                value={form.value}
                onChange={(e) =>
                  setForm((f) => ({ ...f, value: e.target.value }))
                }
                placeholder="cth: kopi, indomaret, ATM BCA"
                autoFocus
              />
            </div>
            {/* Action */}
            <div className="space-y-1.5">
              <Label>Aksi</Label>
              <div className="grid grid-cols-3 gap-2">
                {ACTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({ ...f, action: opt.value }))
                    }
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors",
                      form.action === opt.value
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "border-border hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5"
                    )}
                    aria-pressed={form.action === opt.value}
                  >
                    <LucideIcon name={opt.icon} className="h-5 w-5" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Target */}
            {form.action === "categorize" ? (
              <div className="space-y-1.5">
                <Label htmlFor="rule-target-cat">Kategori target</Label>
                <Select
                  value={form.targetId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, targetId: v }))
                  }
                >
                  <SelectTrigger id="rule-target-cat">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {(categories ?? []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <LucideIcon
                            name={c.icon}
                            className="h-4 w-4"
                            style={{ color: c.color }}
                          />
                          {c.name}
                          <span className="text-xs text-muted-foreground">
                            ({c.type === "INCOME" ? "Pemasukan" : "Pengeluaran"})
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : form.action === "account" ? (
              <div className="space-y-1.5">
                <Label htmlFor="rule-target-acc">Akun target</Label>
                <Select
                  value={form.targetId}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, targetId: v }))
                  }
                >
                  <SelectTrigger id="rule-target-acc">
                    <SelectValue placeholder="Pilih akun" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72 overflow-y-auto">
                    {(accounts ?? []).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        <span className="flex items-center gap-2">
                          <LucideIcon
                            name={a.icon}
                            className="h-4 w-4"
                            style={{ color: a.color }}
                          />
                          {a.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="rule-target-tag">Nama tag</Label>
                <div className="relative">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="rule-target-tag"
                    value={form.tagValue}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, tagValue: e.target.value }))
                    }
                    placeholder="cth: jajan, prioritas, wishlist"
                    className="pl-9"
                  />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {createMut.isPending ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1.5 h-4 w-4" />
                )}
                Simpan Aturan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
