"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Pencil,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LucideIcon } from "@/components/lucide-icon";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
  formatDateLong,
  relativeDay,
} from "@/lib/format";
import { useCategories, useTransactions } from "@/lib/hooks";
import type { Transaction, TransactionType } from "@/lib/types";

interface Props {
  onEdit: (t: Transaction) => void;
  limit?: number;
  showFilters?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

type TypeFilter = "ALL" | TransactionType;

export function TransactionList({
  onEdit,
  limit,
  showFilters = true,
  emptyTitle = "Belum ada transaksi",
  emptyDescription = "Mulai catat pemasukan dan pengeluaran Anda.",
}: Props) {
  const [search, setSearch] = React.useState("");
  const [type, setType] = React.useState<TypeFilter>("ALL");
  const [categoryId, setCategoryId] = React.useState<string>("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");

  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: categories } = useCategories();

  const params = React.useMemo(
    () => ({
      type: type === "ALL" ? undefined : type,
      categoryId: categoryId === "ALL" ? undefined : categoryId,
      search: debouncedSearch || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
    }),
    [type, categoryId, debouncedSearch, from, to, limit]
  );

  const { data: transactions, isLoading, isFetching } = useTransactions(params);

  const grouped = React.useMemo(() => {
    const list = transactions ?? [];
    const map = new Map<string, Transaction[]>();
    for (const t of list) {
      const key = relativeDay(t.date);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    return Array.from(map.entries());
  }, [transactions]);

  const total = transactions?.length ?? 0;
  const totalIncome = (transactions ?? [])
    .filter((t) => t.type === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = (transactions ?? [])
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  const hasActiveFilters =
    !!debouncedSearch || type !== "ALL" || categoryId !== "ALL" || from || to;

  function clearFilters() {
    setSearch("");
    setType("ALL");
    setCategoryId("ALL");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-4">
      {showFilters && (
        <Card className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cari transaksi..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Hapus pencarian"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={type}
                onValueChange={(v) => setType(v as TypeFilter)}
              >
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua</SelectItem>
                  <SelectItem value="INCOME">Pemasukan</SelectItem>
                  <SelectItem value="EXPENSE">Pengeluaran</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="h-9 w-[150px]">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="ALL">Semua kategori</SelectItem>
                  {(categories ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="flex items-center gap-2">
                        <LucideIcon
                          name={c.icon}
                          className="h-3.5 w-3.5"
                          style={{ color: c.color }}
                        />
                        {c.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-9 gap-1.5",
                      (from || to) && "border-primary text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Tanggal</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Rentang tanggal</div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Dari
                      </label>
                      <Input
                        type="date"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">
                        Sampai
                      </label>
                      <Input
                        type="date"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFrom("");
                          setTo("");
                        }}
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-9 text-muted-foreground"
                >
                  <X className="mr-1 h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
              )}
            </div>
          </div>

          {/* Result summary */}
          {total > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-xs">
              <span className="text-muted-foreground">
                {total} transaksi
                {isFetching && " · memperbarui..."}
              </span>
              <span className="text-border">·</span>
              <span className="font-medium text-income">
                +{formatCurrency(totalIncome)}
              </span>
              <span className="font-medium text-expense">
                −{formatCurrency(totalExpense)}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : grouped.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="space-y-5">
          <AnimatePresence mode="popLayout">
            {grouped.map(([day, items]) => {
              const dayIncome = items
                .filter((t) => t.type === "INCOME")
                .reduce((s, t) => s + t.amount, 0);
              const dayExpense = items
                .filter((t) => t.type === "EXPENSE")
                .reduce((s, t) => s + t.amount, 0);
              return (
                <motion.div
                  key={day}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-2"
                >
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {day}
                    </span>
                    <div className="flex items-center gap-2 text-xs">
                      {dayIncome > 0 && (
                        <span className="font-medium text-income">
                          +{formatCurrency(dayIncome)}
                        </span>
                      )}
                      {dayExpense > 0 && (
                        <span className="font-medium text-expense">
                          −{formatCurrency(dayExpense)}
                        </span>
                      )}
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {items.length}
                      </Badge>
                    </div>
                  </div>
                  <Card className="divide-y divide-border overflow-hidden p-0">
                    {items.map((t) => (
                      <TransactionRow
                        key={t.id}
                        transaction={t}
                        onEdit={() => onEdit(t)}
                      />
                    ))}
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function TransactionRow({
  transaction,
  onEdit,
}: {
  transaction: Transaction;
  onEdit: () => void;
}) {
  const isIncome = transaction.type === "INCOME";
  const cat = transaction.category;
  return (
    <div className="group flex items-center gap-3 px-3 py-3 transition-colors hover:bg-muted/40 sm:px-4">
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: cat ? `${cat.color}1a` : undefined }}
      >
        <LucideIcon
          name={cat?.icon ?? "Circle"}
          className="h-5 w-5"
          style={{ color: cat?.color }}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {transaction.description}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {cat?.name ?? "Tanpa kategori"}
          <span className="mx-1 text-border">·</span>
          {formatDateLong(transaction.date)}
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="text-right">
          <div
            className={cn(
              "text-sm font-semibold tabular-nums",
              isIncome ? "text-income" : "text-expense"
            )}
          >
            {isIncome ? "+" : "−"}
            {formatCurrency(transaction.amount)}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
          onClick={onEdit}
          aria-label="Edit transaksi"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border py-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
        <Inbox className="h-6 w-6 text-muted-foreground" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
