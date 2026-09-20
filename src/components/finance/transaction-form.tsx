"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ImageOff,
  Loader2,
  Plus,
  ScanLine,
  Trash2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDateInput } from "@/lib/format";
import {
  useAccounts,
  useCategories,
  useCreateGroup,
  useCreateTransaction,
  useDeleteTransaction,
  useGoals,
  useGroups,
  useUpdateTransaction,
} from "@/lib/hooks";
import type {
  Mood,
  PaymentMethod,
  PaymentStatus,
  Priority,
  Transaction,
  TransactionInput,
  TransactionType,
} from "@/lib/types";
import {
  COMMON_MERCHANTS,
  CURRENCIES,
  FALLBACK_EXCHANGE_RATES,
  GROUP_COLORS,
  GROUP_ICONS,
  MOOD_OPTIONS,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  PRIORITY_OPTIONS,
  QUICK_ADD_PRESETS,
} from "@/lib/constants";
import { ReceiptScanner, type ScannedReceiptData } from "@/components/finance/receipt-scanner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction?: Transaction | null;
  prefill?: {
    type?: TransactionType;
    amount?: number;
    description?: string;
    date?: string;
    categoryId?: string;
    merchant?: string;
  } | null;
}

type TabValue = "utama" | "detail" | "lainnya";

interface SplitRow {
  amount: string;
  categoryId: string;
  note: string;
}

interface ReceiptRow {
  name: string;
  qty: string;
  price: string;
}

const EMPTY_SPLIT: SplitRow = { amount: "", categoryId: "", note: "" };
const EMPTY_RECEIPT: ReceiptRow = { name: "", qty: "1", price: "" };

function isImageUrl(value: string): boolean {
  return value.startsWith("data:image") || /^https?:\/\//i.test(value);
}

export function TransactionForm({
  open,
  onOpenChange,
  transaction,
  prefill,
}: Props) {
  const isEdit = !!transaction;

  // --- core fields ---
  const [type, setType] = React.useState<TransactionType>("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [accountId, setAccountId] = React.useState("");
  const [date, setDate] = React.useState(formatDateInput(new Date()));
  const [note, setNote] = React.useState("");
  const [merchant, setMerchant] = React.useState("");
  const [tags, setTags] = React.useState("");

  // --- detail fields ---
  const [time, setTime] = React.useState("");
  const [mood, setMood] = React.useState<Mood | "">("");
  const [priority, setPriority] = React.useState<Priority | "">("");
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus | "">("");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod | "">("");
  const [recipient, setRecipient] = React.useState("");
  const [currency, setCurrency] = React.useState("IDR");
  const [originalAmount, setOriginalAmount] = React.useState("");
  const [exchangeRate, setExchangeRate] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");

  // --- "lainnya" toggles ---
  const [isSplit, setIsSplit] = React.useState(false);
  const [splits, setSplits] = React.useState<SplitRow[]>([{ ...EMPTY_SPLIT }]);
  const [isDebt, setIsDebt] = React.useState(false);
  const [debtDueDate, setDebtDueDate] = React.useState("");
  const [creditor, setCreditor] = React.useState("");
  const [isReimbursable, setIsReimbursable] = React.useState(false);
  const [isSubscription, setIsSubscription] = React.useState(false);
  const [isTaxDeductible, setIsTaxDeductible] = React.useState(false);
  const [isBusinessExpense, setIsBusinessExpense] = React.useState(false);
  const [excludeFromBudget, setExcludeFromBudget] = React.useState(false);
  const [excludeFromStats, setExcludeFromStats] = React.useState(false);
  const [isHidden, setIsHidden] = React.useState(false);
  const [goalId, setGoalId] = React.useState("");
  const [assignedTo, setAssignedTo] = React.useState("");
  const [cashbackAmount, setCashbackAmount] = React.useState("");
  const [originalPrice, setOriginalPrice] = React.useState("");
  const [discountAmount, setDiscountAmount] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [receiptItems, setReceiptItems] = React.useState<ReceiptRow[]>([]);

  // --- inline new group creation ---
  const [showNewGroup, setShowNewGroup] = React.useState(false);
  const [newGroupName, setNewGroupName] = React.useState("");
  const [newGroupColor, setNewGroupColor] = React.useState(GROUP_COLORS[0]);
  const [newGroupIcon, setNewGroupIcon] = React.useState(GROUP_ICONS[0]);

  const [activeTab, setActiveTab] = React.useState<TabValue>("utama");
  const [error, setError] = React.useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = React.useState(false);

  // Handle scan result — auto-fill form fields from scanned receipt
  function handleScanResult(data: ScannedReceiptData) {
    if (data.total && data.total > 0) {
      setAmount(String(data.total));
      setType("EXPENSE"); // receipts are expenses
    }
    if (data.merchant) {
      setDescription(data.merchant);
      setMerchant(data.merchant);
    }
    if (data.date) {
      setDate(data.date);
    }
    if (data.categoryId) {
      setCategoryId(data.categoryId);
    }
    if (data.photoUrl) {
      setPhotoUrl(data.photoUrl);
    }
    if (data.items && data.items.length > 0) {
      // Convert items to receipt items format
      const newItems = data.items.map((name) => ({
        name,
        qty: 1,
        price: 0,
        total: 0,
      }));
      setReceiptItems(newItems);
      // Enable split-like note with items
      if (!note) {
        setNote(`Item: ${data.items.join(", ")}`);
      }
    }
    toast.success("Data struk diterapkan ke form.");
  }

  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: groups } = useGroups();
  const { data: goals } = useGoals();
  const createMut = useCreateTransaction();
  const updateMut = useUpdateTransaction();
  const deleteMut = useDeleteTransaction();
  const createGroupMut = useCreateGroup();

  // Filter categories by selected type
  const filteredCategories = React.useMemo(
    () => (categories ?? []).filter((c) => c.type === type),
    [categories, type]
  );

  // Reset category if it doesn't match the new type
  React.useEffect(() => {
    if (!categoryId) return;
    const cat = categories?.find((c) => c.id === categoryId);
    if (cat && cat.type !== type) setCategoryId("");
  }, [type, categories, categoryId]);

  // Auto-compute IDR amount when using a foreign currency
  React.useEffect(() => {
    if (currency === "IDR") return;
    const oa = Number(originalAmount);
    const er = Number(exchangeRate);
    if (Number.isFinite(oa) && oa > 0 && Number.isFinite(er) && er > 0) {
      setAmount(String(Math.round(oa * er)));
    }
  }, [currency, originalAmount, exchangeRate]);

  // Sync form state when opening
  React.useEffect(() => {
    if (!open) return;

    setActiveTab("utama");
    setError(null);
    setShowNewGroup(false);
    setNewGroupName("");

    if (transaction) {
      setType(transaction.type);
      setAmount(String(transaction.amount));
      setDescription(transaction.description);
      setCategoryId(transaction.categoryId);
      setAccountId(transaction.accountId ?? "");
      setDate(formatDateInput(transaction.date));
      setNote(transaction.note ?? "");
      setMerchant(transaction.merchant ?? "");
      setTags(transaction.tags ?? "");

      setTime(transaction.time ?? "");
      setMood(transaction.mood ?? "");
      setPriority(transaction.priority ?? "");
      setPaymentStatus(transaction.paymentStatus ?? "");
      setPaymentMethod(transaction.paymentMethod ?? "");
      setRecipient(transaction.recipient ?? "");
      setCurrency(transaction.currency ?? "IDR");
      setOriginalAmount(
        transaction.originalAmount != null
          ? String(transaction.originalAmount)
          : ""
      );
      setExchangeRate(
        transaction.exchangeRate != null
          ? String(transaction.exchangeRate)
          : ""
      );
      setPhotoUrl(transaction.photoUrl ?? "");
      setLinkUrl(transaction.linkUrl ?? "");

      setIsSplit(transaction.isSplit);
      setSplits(
        transaction.splits && transaction.splits.length > 0
          ? transaction.splits.map((s) => ({
              amount: String(s.amount),
              categoryId: s.categoryId,
              note: s.note ?? "",
            }))
          : [{ ...EMPTY_SPLIT }]
      );
      setIsDebt(transaction.isDebt);
      setDebtDueDate(transaction.debtDueDate ?? "");
      setCreditor(transaction.creditor ?? "");
      setIsReimbursable(transaction.isReimbursable);
      setIsSubscription(transaction.isSubscription);
      setIsTaxDeductible(transaction.isTaxDeductible);
      setIsBusinessExpense(transaction.isBusinessExpense);
      setExcludeFromBudget(transaction.excludeFromBudget);
      setExcludeFromStats(transaction.excludeFromStats);
      setIsHidden(transaction.isHidden);
      setGoalId(transaction.goalId ?? "");
      setAssignedTo(transaction.assignedTo ?? "");
      setCashbackAmount(
        transaction.cashbackAmount != null
          ? String(transaction.cashbackAmount)
          : ""
      );
      setOriginalPrice(
        transaction.originalPrice != null
          ? String(transaction.originalPrice)
          : ""
      );
      setDiscountAmount(
        transaction.discountAmount != null
          ? String(transaction.discountAmount)
          : ""
      );
      setGroupId(transaction.groupId ?? "");
      setReceiptItems(
        transaction.receiptItems && transaction.receiptItems.length > 0
          ? transaction.receiptItems.map((r) => ({
              name: r.name,
              qty: String(r.qty),
              price: String(r.price),
            }))
          : []
      );
    } else if (prefill) {
      setType(prefill.type ?? "EXPENSE");
      setAmount(prefill.amount ? String(prefill.amount) : "");
      setDescription(prefill.description ?? "");
      setCategoryId(prefill.categoryId ?? "");
      setAccountId("");
      setDate(prefill.date ?? formatDateInput(new Date()));
      setNote("");
      setMerchant(prefill.merchant ?? "");
      setTags("");

      setTime("");
      setMood("");
      setPriority("");
      setPaymentStatus("");
      setPaymentMethod("");
      setRecipient("");
      setCurrency("IDR");
      setOriginalAmount("");
      setExchangeRate("");
      setPhotoUrl("");
      setLinkUrl("");

      setIsSplit(false);
      setSplits([{ ...EMPTY_SPLIT }]);
      setIsDebt(false);
      setDebtDueDate("");
      setCreditor("");
      setIsReimbursable(false);
      setIsSubscription(false);
      setIsTaxDeductible(false);
      setIsBusinessExpense(false);
      setExcludeFromBudget(false);
      setExcludeFromStats(false);
      setIsHidden(false);
      setGoalId("");
      setAssignedTo("");
      setCashbackAmount("");
      setOriginalPrice("");
      setDiscountAmount("");
      setGroupId("");
      setReceiptItems([]);
    } else {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setCategoryId("");
      setAccountId("");
      setDate(formatDateInput(new Date()));
      setNote("");
      setMerchant("");
      setTags("");

      setTime("");
      setMood("");
      setPriority("");
      setPaymentStatus("");
      setPaymentMethod("");
      setRecipient("");
      setCurrency("IDR");
      setOriginalAmount("");
      setExchangeRate("");
      setPhotoUrl("");
      setLinkUrl("");

      setIsSplit(false);
      setSplits([{ ...EMPTY_SPLIT }]);
      setIsDebt(false);
      setDebtDueDate("");
      setCreditor("");
      setIsReimbursable(false);
      setIsSubscription(false);
      setIsTaxDeductible(false);
      setIsBusinessExpense(false);
      setExcludeFromBudget(false);
      setExcludeFromStats(false);
      setIsHidden(false);
      setGoalId("");
      setAssignedTo("");
      setCashbackAmount("");
      setOriginalPrice("");
      setDiscountAmount("");
      setGroupId("");
      setReceiptItems([]);
    }
  }, [open, transaction, prefill]);

  const submitting =
    createMut.isPending || updateMut.isPending || deleteMut.isPending;

  // --- derived values for splits & receipt items ---
  const splitsTotal = React.useMemo(
    () =>
      splits.reduce((sum, s) => {
        const v = Number(s.amount.replace(/[^\d.-]/g, ""));
        return sum + (Number.isFinite(v) ? v : 0);
      }, 0),
    [splits]
  );

  const receiptSubtotal = React.useMemo(
    () =>
      receiptItems.reduce((sum, r) => {
        const qty = Number(r.qty.replace(/[^\d.-]/g, ""));
        const price = Number(r.price.replace(/[^\d.-]/g, ""));
        const t =
          Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0;
        return sum + t;
      }, 0),
    [receiptItems]
  );

  const computedForeignAmount = React.useMemo(() => {
    if (currency === "IDR") return null;
    const oa = Number(originalAmount);
    const er = Number(exchangeRate);
    if (Number.isFinite(oa) && Number.isFinite(er) && oa > 0 && er > 0) {
      return Math.round(oa * er);
    }
    return null;
  }, [currency, originalAmount, exchangeRate]);

  // --- handlers ---
  function handleCurrencyChange(code: string) {
    setCurrency(code);
    if (code === "IDR") {
      setExchangeRate("");
      setOriginalAmount("");
    } else {
      const rate = FALLBACK_EXCHANGE_RATES[code];
      if (rate) setExchangeRate(String(rate));
    }
  }

  function addSplit() {
    setSplits((prev) => [...prev, { ...EMPTY_SPLIT }]);
  }

  function updateSplit(idx: number, patch: Partial<SplitRow>) {
    setSplits((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    );
  }

  function removeSplit(idx: number) {
    setSplits((prev) =>
      prev.length === 1 ? prev : prev.filter((_, i) => i !== idx)
    );
  }

  function addReceiptItem() {
    setReceiptItems((prev) => [...prev, { ...EMPTY_RECEIPT }]);
  }

  function updateReceipt(idx: number, patch: Partial<ReceiptRow>) {
    setReceiptItems((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    );
  }

  function removeReceipt(idx: number) {
    setReceiptItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleCreateGroup() {
    const name = newGroupName.trim();
    if (!name) {
      toast.error("Nama grup tidak boleh kosong.");
      return;
    }
    try {
      const created = await createGroupMut.mutateAsync({
        name,
        color: newGroupColor,
        icon: newGroupIcon,
      });
      setGroupId(created.id);
      setShowNewGroup(false);
      setNewGroupName("");
      toast.success("Grup baru berhasil dibuat.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal membuat grup baru."
      );
    }
  }

  function fail(msg: string, tab: TabValue) {
    setError(msg);
    setActiveTab(tab);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const amt = Number(amount.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) {
      fail("Masukkan jumlah yang valid (lebih dari 0).", "utama");
      return;
    }
    if (!description.trim()) {
      fail("Keterangan transaksi wajib diisi.", "utama");
      return;
    }
    if (!categoryId) {
      fail("Pilih kategori terlebih dahulu.", "utama");
      return;
    }
    if (!date) {
      fail("Tanggal wajib diisi.", "utama");
      return;
    }

    let finalSplits: Array<{ amount: number; categoryId: string; note?: string }> | undefined;
    if (isSplit) {
      const built: Array<{ amount: number; categoryId: string; note?: string }> = [];
      for (let i = 0; i < splits.length; i++) {
        const s = splits[i];
        const sAmt = Number(s.amount.replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(sAmt) || sAmt <= 0) {
          fail(`Split #${i + 1}: jumlah tidak valid.`, "lainnya");
          return;
        }
        if (!s.categoryId) {
          fail(`Split #${i + 1}: pilih kategori terlebih dahulu.`, "lainnya");
          return;
        }
        built.push({
          amount: sAmt,
          categoryId: s.categoryId,
          note: s.note.trim() || undefined,
        });
      }
      const total = built.reduce((sum, s) => sum + s.amount, 0);
      if (Math.abs(total - amt) > 0.01) {
        fail(
          `Total split (${formatCurrency(total)}) harus sama dengan jumlah transaksi (${formatCurrency(amt)}).`,
          "lainnya"
        );
        return;
      }
      finalSplits = built;
    }

    if (isDebt && !creditor.trim()) {
      fail("Nama pemberi/piutang wajib diisi saat menandai hutang.", "lainnya");
      return;
    }

    let finalReceiptItems:
      | Array<{ name: string; qty: number; price: number; total: number }>
      | undefined;
    if (receiptItems.length > 0) {
      const built: Array<{
        name: string;
        qty: number;
        price: number;
        total: number;
      }> = [];
      for (let i = 0; i < receiptItems.length; i++) {
        const r = receiptItems[i];
        if (!r.name.trim()) {
          fail(`Item struk #${i + 1}: nama wajib diisi.`, "lainnya");
          return;
        }
        const qty = Number(r.qty.replace(/[^\d.-]/g, ""));
        const price = Number(r.price.replace(/[^\d.-]/g, ""));
        if (!Number.isFinite(qty) || qty <= 0) {
          fail(`Item struk #${i + 1}: qty tidak valid.`, "lainnya");
          return;
        }
        if (!Number.isFinite(price) || price < 0) {
          fail(`Item struk #${i + 1}: harga tidak valid.`, "lainnya");
          return;
        }
        built.push({
          name: r.name.trim(),
          qty,
          price,
          total: qty * price,
        });
      }
      finalReceiptItems = built;
    }

    const payload: TransactionInput = {
      type,
      amount: amt,
      description: description.trim(),
      categoryId,
      accountId: accountId || undefined,
      date,
      note: note.trim() || undefined,
      tags: tags.trim() || undefined,
      merchant: merchant.trim() || undefined,
      time: time || undefined,
      photoUrl: photoUrl.trim() || undefined,
      mood: (mood || null) as Mood | null,
      priority: (priority || null) as Priority | null,
      paymentStatus: (paymentStatus || undefined) as PaymentStatus | undefined,
      paymentMethod: (paymentMethod || null) as PaymentMethod | null,
      recipient: recipient.trim() || undefined,
      currency,
      originalAmount:
        currency !== "IDR" && originalAmount
          ? Number(originalAmount)
          : undefined,
      exchangeRate:
        currency !== "IDR" && exchangeRate
          ? Number(exchangeRate)
          : undefined,
      groupId: groupId || undefined,
      isSplit,
      isDebt,
      isReimbursable,
      isSubscription,
      isTaxDeductible,
      isBusinessExpense,
      excludeFromBudget,
      excludeFromStats,
      isHidden,
      cashbackAmount: cashbackAmount
        ? Number(cashbackAmount.replace(/[^\d.-]/g, ""))
        : undefined,
      originalPrice: originalPrice
        ? Number(originalPrice.replace(/[^\d.-]/g, ""))
        : undefined,
      discountAmount: discountAmount
        ? Number(discountAmount.replace(/[^\d.-]/g, ""))
        : undefined,
      debtDueDate: isDebt && debtDueDate ? debtDueDate : undefined,
      creditor: isDebt && creditor.trim() ? creditor.trim() : undefined,
      goalId: goalId || undefined,
      assignedTo: assignedTo.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
      splits: finalSplits,
      receiptItems: finalReceiptItems,
    };

    if (isEdit && transaction) {
      updateMut.mutate(
        { id: transaction.id, data: payload },
        {
          onSuccess: () => {
            toast.success("Transaksi berhasil diperbarui.");
            onOpenChange(false);
          },
          onError: (err) => {
            setError(err.message || "Gagal memperbarui transaksi.");
          },
        }
      );
    } else {
      createMut.mutate(payload, {
        onSuccess: () => {
          toast.success("Transaksi berhasil ditambahkan.");
          onOpenChange(false);
        },
        onError: (err) => {
          setError(err.message || "Gagal menambah transaksi.");
        },
      });
    }
  }

  function handleDelete() {
    if (!transaction) return;
    deleteMut.mutate(transaction.id, {
      onSuccess: () => {
        toast.success("Transaksi berhasil dihapus.");
        onOpenChange(false);
      },
      onError: (err) => {
        toast.error(err.message || "Gagal menghapus transaksi.");
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="space-y-0 border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm",
                  type === "INCOME" ? "bg-income" : "bg-expense"
                )}
              >
                {type === "INCOME" ? (
                  <ArrowDownLeft className="h-5 w-5" />
                ) : (
                  <ArrowUpRight className="h-5 w-5" />
                )}
              </span>
              <div>
                <DialogTitle className="text-base">
                  {isEdit ? "Edit Transaksi" : "Tambah Transaksi"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {isEdit
                    ? "Ubah detail transaksi Anda."
                    : "Catat pemasukan atau pengeluaran baru."}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
          {/* Selected badges */}
          {(mood || priority || paymentStatus || paymentMethod || isDebt || isSplit) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mood && (
                <Badge variant="secondary" className="gap-1">
                  {MOOD_OPTIONS.find((m) => m.value === mood)?.emoji}
                  {MOOD_OPTIONS.find((m) => m.value === mood)?.label}
                </Badge>
              )}
              {priority && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                  style={{
                    backgroundColor: `${PRIORITY_OPTIONS.find((p) => p.value === priority)?.color}1A`,
                    color: PRIORITY_OPTIONS.find((p) => p.value === priority)?.color,
                  }}
                >
                  {PRIORITY_OPTIONS.find((p) => p.value === priority)?.label}
                </Badge>
              )}
              {paymentStatus && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                  style={{
                    backgroundColor: `${PAYMENT_STATUS_OPTIONS.find((p) => p.value === paymentStatus)?.color}1A`,
                    color: PAYMENT_STATUS_OPTIONS.find((p) => p.value === paymentStatus)?.color,
                  }}
                >
                  {PAYMENT_STATUS_OPTIONS.find((p) => p.value === paymentStatus)?.label}
                </Badge>
              )}
              {paymentMethod && (
                <Badge variant="secondary" className="gap-1">
                  <LucideIcon
                    name={PAYMENT_METHOD_OPTIONS.find((p) => p.value === paymentMethod)?.icon ?? "CreditCard"}
                    className="h-3 w-3"
                  />
                  {PAYMENT_METHOD_OPTIONS.find((p) => p.value === paymentMethod)?.label}
                </Badge>
              )}
              {isSplit && <Badge variant="secondary">Split</Badge>}
              {isDebt && <Badge variant="secondary">Hutang/Piutang</Badge>}
            </div>
          )}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col">
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as TabValue);
            }}
            className="gap-0"
          >
            <div className="border-b border-border bg-background px-3 pt-3">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="utama">Utama</TabsTrigger>
                <TabsTrigger value="detail">Detail</TabsTrigger>
                <TabsTrigger value="lainnya">Lainnya</TabsTrigger>
              </TabsList>
            </div>

            <div className="max-h-[62vh] overflow-y-auto custom-scrollbar p-5">
              {/* ============ TAB UTAMA ============ */}
              <TabsContent value="utama" className="space-y-4 outline-none">
                {/* Scan Struk button — quick AI receipt scan */}
                {!isEdit && (
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-3 text-left transition-colors hover:border-primary hover:bg-primary/10"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <ScanLine className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        Pindai Struk
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Foto struk → AI isi form otomatis
                      </p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      Buka
                    </span>
                  </button>
                )}

                {/* Type toggle */}
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
                  <button
                    type="button"
                    onClick={() => setType("INCOME")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      type === "INCOME"
                        ? "bg-income text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    Pemasukan
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("EXPENSE")}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      type === "EXPENSE"
                        ? "bg-expense text-white shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    Pengeluaran
                  </button>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Jumlah</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      Rp
                    </span>
                    <Input
                      id="amount"
                      inputMode="decimal"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="pl-9 text-lg font-semibold"
                      disabled={currency !== "IDR"}
                      autoFocus
                    />
                  </div>
                  {currency !== "IDR" && (
                    <p className="text-xs text-muted-foreground">
                      Jumlah IDR dihitung otomatis dari mata uang asing di tab
                      Detail.
                    </p>
                  )}
                  {currency === "IDR" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {QUICK_ADD_PRESETS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() =>
                            setAmount((prev) => String(Number(prev || 0) + p.amount))
                          }
                          className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          +{p.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description">Keterangan</Label>
                  <Input
                    id="description"
                    placeholder={
                      type === "INCOME"
                        ? "cth. Gaji bulan ini"
                        : "cth. Makan siang"
                    }
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={80}
                  />
                </div>

                {/* Merchant with datalist */}
                <div className="space-y-1.5">
                  <Label htmlFor="merchant">
                    Merchant{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <Input
                    id="merchant"
                    list="common-merchants"
                    placeholder="cth. Indomaret, Gojek"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    maxLength={50}
                  />
                  <datalist id="common-merchants">
                    {COMMON_MERCHANTS.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <Label>Kategori</Label>
                  {catsLoading ? (
                    <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
                  ) : filteredCategories.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Belum ada kategori untuk tipe ini. Tambahkan di tab Kategori.
                    </div>
                  ) : (
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {filteredCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            <span className="flex items-center gap-2">
                              <LucideIcon
                                name={c.icon}
                                className="h-4 w-4"
                                style={{ color: c.color }}
                              />
                              {c.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Account */}
                {accounts && accounts.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>
                      Akun{" "}
                      <span className="text-muted-foreground">(opsional)</span>
                    </Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih akun" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((a) => (
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
                )}

                {/* Date + Time */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Tanggal</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      max={formatDateInput(new Date())}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="time">
                      Waktu{" "}
                      <span className="text-muted-foreground">(opsional)</span>
                    </Label>
                    <Input
                      id="time"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Note */}
                <div className="space-y-1.5">
                  <Label htmlFor="note">
                    Catatan{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <Textarea
                    id="note"
                    placeholder="Tambah catatan..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    maxLength={200}
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label htmlFor="tags">
                    Tag{" "}
                    <span className="text-muted-foreground">
                      (opsional, pisahkan koma)
                    </span>
                  </Label>
                  <Input
                    id="tags"
                    placeholder="cth. liburan, urgent, reimburse"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    maxLength={100}
                  />
                </div>
              </TabsContent>

              {/* ============ TAB DETAIL ============ */}
              <TabsContent value="detail" className="space-y-4 outline-none">
                {/* Mood */}
                <div className="space-y-1.5">
                  <Label>Mood</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {MOOD_OPTIONS.map((m) => {
                      const selected = mood === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          onClick={() =>
                            setMood(selected ? "" : (m.value as Mood))
                          }
                          className={cn(
                            "flex flex-col items-center gap-1 rounded-lg border p-2 text-xs transition-colors",
                            selected
                              ? "border-foreground bg-muted"
                              : "border-border hover:bg-muted/60"
                          )}
                          style={
                            selected
                              ? { borderColor: m.color, color: m.color }
                              : undefined
                          }
                        >
                          <span className="text-lg leading-none">{m.emoji}</span>
                          <span className="font-medium">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-1.5">
                  <Label>Prioritas</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRIORITY_OPTIONS.map((p) => {
                      const selected = priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() =>
                            setPriority(selected ? "" : (p.value as Priority))
                          }
                          className={cn(
                            "flex flex-col items-center gap-0.5 rounded-lg border px-2 py-2 text-xs transition-colors",
                            selected
                              ? "text-white"
                              : "border-border hover:bg-muted/60"
                          )}
                          style={
                            selected ? { backgroundColor: p.color, borderColor: p.color } : undefined
                          }
                        >
                          <span className="font-semibold">{p.label}</span>
                          <span
                            className={cn(
                              "text-[10px] leading-tight",
                              selected ? "text-white/80" : "text-muted-foreground"
                            )}
                          >
                            {p.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment method */}
                <div className="space-y-1.5">
                  <Label>Metode Pembayaran</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={(v) =>
                      setPaymentMethod((v || "") as PaymentMethod | "")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih metode" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHOD_OPTIONS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          <span className="flex items-center gap-2">
                            <LucideIcon name={m.icon} className="h-4 w-4" />
                            {m.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Payment status */}
                <div className="space-y-1.5">
                  <Label>Status Pembayaran</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(v) =>
                      setPaymentStatus((v || "") as PaymentStatus | "")
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih status" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: s.color }}
                            />
                            {s.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Recipient */}
                <div className="space-y-1.5">
                  <Label htmlFor="recipient">
                    {type === "INCOME" ? "Dari Siapa" : "Untuk Siapa"}{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <Input
                    id="recipient"
                    placeholder={
                      type === "INCOME"
                        ? "cth. PT Maju Jaya"
                        : "cth. Teman, Keluarga"
                    }
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    maxLength={50}
                  />
                </div>

                {/* Currency */}
                <div className="space-y-1.5">
                  <Label>Mata Uang</Label>
                  <Select value={currency} onValueChange={handleCurrencyChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih mata uang" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          <span className="flex items-center gap-2">
                            <span>{c.flag}</span>
                            {c.code} — {c.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {currency !== "IDR" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="original-amount">Jumlah Asli</Label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                          {CURRENCIES.find((c) => c.code === currency)?.symbol}
                        </span>
                        <Input
                          id="original-amount"
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0"
                          value={originalAmount}
                          onChange={(e) => setOriginalAmount(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="exchange-rate">Kurs (ke IDR)</Label>
                      <Input
                        id="exchange-rate"
                        inputMode="decimal"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0"
                        value={exchangeRate}
                        onChange={(e) => setExchangeRate(e.target.value)}
                      />
                    </div>
                    {computedForeignAmount != null && (
                      <div className="col-span-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                        ≈ {formatCurrency(computedForeignAmount)} (IDR) —
                        diisi otomatis ke jumlah transaksi.
                      </div>
                    )}
                  </div>
                )}

                {/* Photo URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="photo-url">
                    URL / Base64 Foto Struk{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="photo-url"
                      placeholder="https://... atau data:image/..."
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                    />
                    {photoUrl && isImageUrl(photoUrl) && (
                      <img
                        src={photoUrl}
                        alt="Preview struk"
                        className="h-10 w-10 shrink-0 rounded-md border border-border object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display =
                            "none";
                        }}
                      />
                    )}
                    {photoUrl && !isImageUrl(photoUrl) && (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                        <ImageOff className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Link URL */}
                <div className="space-y-1.5">
                  <Label htmlFor="link-url">
                    Tautan{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <Input
                    id="link-url"
                    type="url"
                    placeholder="https://..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* ============ TAB LAINNYA ============ */}
              <TabsContent value="lainnya" className="space-y-4 outline-none">
                {/* Split toggle */}
                <ToggleSection
                  checked={isSplit}
                  onCheckedChange={setIsSplit}
                  title="Split ke Multiple Kategori"
                  description="Bagi jumlah transaksi ke beberapa kategori."
                >
                  <div className="space-y-2">
                    {splits.map((s, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-border bg-muted/30 p-2.5"
                      >
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[120px_1fr]">
                          <div className="relative">
                            <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                              Rp
                            </span>
                            <Input
                              inputMode="decimal"
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0"
                              value={s.amount}
                              onChange={(e) =>
                                updateSplit(idx, { amount: e.target.value })
                              }
                              className="h-9 pl-8 text-sm"
                            />
                          </div>
                          <Select
                            value={s.categoryId}
                            onValueChange={(v) =>
                              updateSplit(idx, { categoryId: v })
                            }
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue placeholder="Pilih kategori" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {filteredCategories.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  <span className="flex items-center gap-2">
                                    <LucideIcon
                                      name={c.icon}
                                      className="h-4 w-4"
                                      style={{ color: c.color }}
                                    />
                                    {c.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="mt-2 flex gap-2">
                          <Input
                            placeholder="Catatan split (opsional)"
                            value={s.note}
                            onChange={(e) =>
                              updateSplit(idx, { note: e.target.value })
                            }
                            className="h-8 text-xs"
                            maxLength={80}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeSplit(idx)}
                            disabled={splits.length === 1}
                            aria-label="Hapus split"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSplit}
                      className="w-full"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      Tambah split
                    </Button>
                    <SplitTotalRow
                      total={splitsTotal}
                      target={Number(amount.replace(/[^\d.-]/g, "")) || 0}
                    />
                  </div>
                </ToggleSection>

                {/* Debt toggle */}
                <ToggleSection
                  checked={isDebt}
                  onCheckedChange={setIsDebt}
                  title="Tandai sebagai Hutang/Piutang"
                  description="Catat jatuh tempo & nama pemberi/penerima."
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="debt-due-date">Jatuh Tempo</Label>
                      <Input
                        id="debt-due-date"
                        type="date"
                        value={debtDueDate}
                        onChange={(e) => setDebtDueDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="creditor">
                        {type === "INCOME" ? "Dari" : "Kepada"}
                      </Label>
                      <Input
                        id="creditor"
                        placeholder="Nama orang"
                        value={creditor}
                        onChange={(e) => setCreditor(e.target.value)}
                        maxLength={50}
                      />
                    </div>
                  </div>
                </ToggleSection>

                {/* Simple toggles */}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <ToggleRow
                    checked={isReimbursable}
                    onCheckedChange={setIsReimbursable}
                    title="Reimbursable"
                    description="Akan diganti"
                  />
                  <ToggleRow
                    checked={isSubscription}
                    onCheckedChange={setIsSubscription}
                    title="Langganan"
                    description="Subscription berulang"
                  />
                  <ToggleRow
                    checked={isTaxDeductible}
                    onCheckedChange={setIsTaxDeductible}
                    title="Tax Deductible"
                    description="Pengurang pajak"
                  />
                  <ToggleRow
                    checked={isBusinessExpense}
                    onCheckedChange={setIsBusinessExpense}
                    title="Business Expense"
                    description="Pengeluaran usaha"
                  />
                  <ToggleRow
                    checked={excludeFromBudget}
                    onCheckedChange={setExcludeFromBudget}
                    title="Exclude from Budget"
                    description="Tidak dihitung di anggaran"
                  />
                  <ToggleRow
                    checked={excludeFromStats}
                    onCheckedChange={setExcludeFromStats}
                    title="Exclude from Stats"
                    description="Tidak dihitung di statistik"
                  />
                  <ToggleRow
                    checked={isHidden}
                    onCheckedChange={setIsHidden}
                    title="Sembunyikan Transaksi"
                    description="Tidak tampil di daftar utama (privasi)"
                  />
                </div>

                {/* Goal allocation */}
                {goals && goals.length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Allocasi ke Goal</Label>
                    <Select
                      value={goalId}
                      onValueChange={(v) => setGoalId(v === "__none__" ? "" : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Pilih goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— Tidak ada —</SelectItem>
                        {goals.map((g) => (
                          <SelectItem key={g.id} value={g.id}>
                            <span className="flex items-center gap-2">
                              <LucideIcon
                                name={g.icon}
                                className="h-4 w-4"
                                style={{ color: g.color }}
                              />
                              {g.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Assigned to */}
                <div className="space-y-1.5">
                  <Label htmlFor="assigned-to">
                    Assigned To{" "}
                    <span className="text-muted-foreground">(opsional)</span>
                  </Label>
                  <Input
                    id="assigned-to"
                    placeholder="Nama orang / tim"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    maxLength={50}
                  />
                </div>

                {/* Cashback / Original price / Discount */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cashback">Cashback</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="cashback"
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={cashbackAmount}
                        onChange={(e) => setCashbackAmount(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="original-price">Harga Asli</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="original-price"
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">Diskon</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                        Rp
                      </span>
                      <Input
                        id="discount"
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Group / Event */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>Grup / Event</Label>
                    <button
                      type="button"
                      onClick={() => setShowNewGroup((v) => !v)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {showNewGroup ? "Batal" : "+ Buat baru"}
                    </button>
                  </div>
                  <Select
                    value={groupId}
                    onValueChange={(v) => setGroupId(v === "__none__" ? "" : v)}
                    disabled={showNewGroup}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih grup / event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Tidak ada —</SelectItem>
                      {groups?.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <span className="flex items-center gap-2">
                            <LucideIcon
                              name={g.icon}
                              className="h-4 w-4"
                              style={{ color: g.color }}
                            />
                            {g.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {showNewGroup && (
                    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-2.5">
                      <Input
                        placeholder="Nama grup / event"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        maxLength={40}
                      />
                      <div className="flex flex-wrap gap-1">
                        {GROUP_ICONS.slice(0, 8).map((icon) => (
                          <button
                            key={icon}
                            type="button"
                            onClick={() => setNewGroupIcon(icon)}
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-md border",
                              newGroupIcon === icon
                                ? "border-foreground bg-background"
                                : "border-border bg-background/60"
                            )}
                          >
                            <LucideIcon name={icon} className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {GROUP_COLORS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewGroupColor(c)}
                            className={cn(
                              "h-5 w-5 rounded-full border-2",
                              newGroupColor === c
                                ? "border-foreground"
                                : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                            aria-label={`Warna ${c}`}
                          />
                        ))}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleCreateGroup}
                        disabled={createGroupMut.isPending || !newGroupName.trim()}
                      >
                        {createGroupMut.isPending && (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        )}
                        Simpan Grup
                      </Button>
                    </div>
                  )}
                </div>

                {/* Receipt items editor */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Item Struk</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addReceiptItem}
                      className="h-7 px-2 text-xs"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Tambah item
                    </Button>
                  </div>
                  {receiptItems.length === 0 ? (
                    <div className="rounded-md border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                      Belum ada item struk. Klik “Tambah item” untuk
                      menguraikan transaksi.
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {receiptItems.map((r, idx) => {
                          const qty = Number(r.qty.replace(/[^\d.-]/g, "")) || 0;
                          const price =
                            Number(r.price.replace(/[^\d.-]/g, "")) || 0;
                          const total = qty * price;
                          return (
                            <div
                              key={idx}
                              className="rounded-lg border border-border bg-muted/30 p-2.5"
                            >
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Nama item"
                                  value={r.name}
                                  onChange={(e) =>
                                    updateReceipt(idx, { name: e.target.value })
                                  }
                                  className="h-9 text-sm"
                                  maxLength={60}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                                  onClick={() => removeReceipt(idx)}
                                  aria-label="Hapus item"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="mt-2 grid grid-cols-3 gap-2">
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">
                                    Qty
                                  </Label>
                                  <Input
                                    inputMode="decimal"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={r.qty}
                                    onChange={(e) =>
                                      updateReceipt(idx, { qty: e.target.value })
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="relative">
                                  <Label className="text-[10px] text-muted-foreground">
                                    Harga
                                  </Label>
                                  <span className="pointer-events-none absolute left-2 bottom-2 text-[10px] font-medium text-muted-foreground">
                                    Rp
                                  </span>
                                  <Input
                                    inputMode="decimal"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={r.price}
                                    onChange={(e) =>
                                      updateReceipt(idx, {
                                        price: e.target.value,
                                      })
                                    }
                                    className="h-8 pl-6 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[10px] text-muted-foreground">
                                    Total
                                  </Label>
                                  <div className="flex h-8 items-center rounded-md border border-border bg-background px-2 text-xs font-medium">
                                    {formatCurrency(total)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-xs">
                        <span className="text-muted-foreground">
                          Subtotal struk
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(receiptSubtotal)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {error && (
            <div className="border-t border-destructive/20 bg-destructive/10 px-5 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter className="flex-row items-center gap-2 border-t border-border bg-muted/30 p-4 sm:justify-between">
            <div>
              {isEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={submitting}
                    >
                      <Trash2 className="mr-1 h-4 w-4" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Hapus transaksi ini?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Tindakan ini tidak dapat dibatalkan. Transaksi akan
                        dihapus permanen.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Ya, Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={submitting}>
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={submitting}
                className={
                  type === "INCOME"
                    ? "bg-income text-white hover:bg-income/90"
                    : "bg-expense text-white hover:bg-expense/90"
                }
              >
                {submitting && (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                )}
                {isEdit ? "Simpan" : "Tambah"}
              </Button>
            </div>
          </DialogFooter>
        </form>

        {/* Receipt Scanner Dialog */}
        <ReceiptScanner
          open={scannerOpen}
          onOpenChange={setScannerOpen}
          onScan={handleScanResult}
        />
      </DialogContent>
    </Dialog>
  );
}

/* ---------- helper sub-components ---------- */

function ToggleSection({
  checked,
  onCheckedChange,
  title,
  description,
  children,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border">
      <label className="flex cursor-pointer items-start gap-3 p-3">
        <Checkbox
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          className="mt-0.5"
        />
        <div className="flex-1">
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </label>
      {checked && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

function ToggleRow({
  checked,
  onCheckedChange,
  title,
  description,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SplitTotalRow({ total, target }: { total: number; target: number }) {
  const diff = target - total;
  const matched = Math.abs(diff) < 0.01;
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2 text-xs",
        matched
          ? "bg-income-soft text-income"
          : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
      )}
    >
      <span>
        Total split: <strong>{formatCurrency(total)}</strong>
      </span>
      {matched ? (
        <span>✓ Sesuai dengan jumlah</span>
      ) : (
        <span>
          {diff > 0
            ? `Kurang ${formatCurrency(diff)}`
            : `Lebih ${formatCurrency(Math.abs(diff))}`}
        </span>
      )}
    </div>
  );
}
