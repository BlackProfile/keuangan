"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  AccountInput,
  BudgetInput,
  CategoryInput,
  GoalInput,
  RecurringInput,
  TransactionInput,
  TransferInput,
} from "@/lib/types";

export const queryKeys = {
  transactions: ["transactions"] as const,
  transactionsList: (params?: Record<string, string | number | undefined>) =>
    ["transactions", "list", params] as const,
  categories: (type?: string) => ["categories", type] as const,
  accounts: ["accounts"] as const,
  budgets: ["budgets"] as const,
  budgetStatuses: ["budgets", "statuses"] as const,
  goals: ["goals"] as const,
  recurring: ["recurring"] as const,
  tags: ["tags"] as const,
  dashboard: ["dashboard"] as const,
  dashboardMonth: (month: string) => ["dashboard", month] as const,
  analytics: ["analytics"] as const,
  analyticsMonth: (month: string) => ["analytics", month] as const,
  settings: ["settings"] as const,
};

// ---------- Transactions ----------
export function useTransactions(params?: {
  type?: string;
  categoryId?: string;
  accountId?: string;
  search?: string;
  from?: string;
  to?: string;
  tag?: string;
  limit?: number;
}) {
  return useQuery({
    queryKey: queryKeys.transactionsList(params),
    queryFn: () => api.listTransactions(params),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransactionInput) => api.createTransaction(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.analytics });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: TransactionInput }) =>
      api.updateTransaction(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.analytics });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.analytics });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

// ---------- Categories ----------
export function useCategories(type?: string) {
  return useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: () => api.listCategories(type),
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CategoryInput) => api.createCategory(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------- Accounts ----------
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts,
    queryFn: () => api.listAccounts(),
    staleTime: 30_000,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: AccountInput) => api.createAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AccountInput> }) =>
      api.updateAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.accounts }),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAccount(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

export function useTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TransferInput) => api.transfer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------- Budgets ----------
export function useBudgets() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: () => api.listBudgets(),
    staleTime: 30_000,
  });
}

export function useBudgetStatuses() {
  return useQuery({
    queryKey: queryKeys.budgetStatuses,
    queryFn: () => api.budgetStatuses(),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetInput) => api.createBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: BudgetInput }) =>
      api.updateBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.budgets });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------- Goals ----------
export function useGoals() {
  return useQuery({
    queryKey: queryKeys.goals,
    queryFn: () => api.listGoals(),
  });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GoalInput) => api.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<GoalInput> }) =>
      api.updateGoal(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.goals });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

// ---------- Recurring ----------
export function useRecurring() {
  return useQuery({
    queryKey: queryKeys.recurring,
    queryFn: () => api.listRecurring(),
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: RecurringInput) => api.createRecurring(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recurring }),
  });
}

export function useUpdateRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RecurringInput> }) =>
      api.updateRecurring(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recurring }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteRecurring(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recurring });
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
    },
  });
}

// ---------- Tags ----------
export function useTags() {
  return useQuery({
    queryKey: queryKeys.tags,
    queryFn: () => api.listTags(),
    staleTime: 60_000,
  });
}

// ---------- Dashboard & Analytics ----------
export function useDashboard(month?: string) {
  return useQuery({
    queryKey: month ? queryKeys.dashboardMonth(month) : queryKeys.dashboard,
    queryFn: () => api.getDashboard(month),
  });
}

export function useAnalytics(month?: string) {
  return useQuery({
    queryKey: month ? queryKeys.analyticsMonth(month) : queryKeys.analytics,
    queryFn: () => api.getAnalytics(month),
  });
}

// ---------- Settings ----------
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.getSettings(),
    staleTime: 30_000,
  });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      api.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.settings }),
  });
}

// ---------- AI ----------
export function useAiChat() {
  return useMutation({
    mutationFn: (messages: { role: "user" | "assistant"; content: string }[]) =>
      api.chat(messages),
  });
}

export function useReceiptScan() {
  return useMutation({
    mutationFn: (imageBase64: string) => api.receiptScan(imageBase64),
  });
}

export function useInsights() {
  return useQuery({
    queryKey: ["ai", "insights"],
    queryFn: () => api.insights(),
    staleTime: 5 * 60_000,
  });
}

// ---------- Import ----------
export function useImportCsv() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows: Array<Record<string, string>>) => api.importCsv(rows),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.analytics });
      qc.invalidateQueries({ queryKey: queryKeys.budgetStatuses });
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}

// ---------- Seed & Recurring run ----------
export function useSeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.seed(),
    onSuccess: () => {
      qc.invalidateQueries();
    },
  });
}

export function useRunRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.runRecurring(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.recurring });
      qc.invalidateQueries({ queryKey: queryKeys.transactions });
      qc.invalidateQueries({ queryKey: queryKeys.dashboard });
      qc.invalidateQueries({ queryKey: queryKeys.accounts });
    },
  });
}
