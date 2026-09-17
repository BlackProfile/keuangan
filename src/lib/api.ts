// API client helpers for the finance app
import type {
  Account,
  AccountInput,
  AnalyticsData,
  Budget,
  BudgetInput,
  BudgetStatus,
  Category,
  CategoryInput,
  ChatMessage,
  DashboardData,
  Goal,
  GoalInput,
  RecurringInput,
  RecurringTransaction,
  Tag,
  Transaction,
  TransactionInput,
  TransferInput,
} from "@/lib/types";

async function request<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = `Permintaan gagal (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
      else if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Transactions
  listTransactions: (params?: {
    type?: string;
    categoryId?: string;
    accountId?: string;
    search?: string;
    from?: string;
    to?: string;
    tag?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.type && params.type !== "ALL") sp.set("type", params.type);
    if (params?.categoryId && params.categoryId !== "ALL")
      sp.set("categoryId", params.categoryId);
    if (params?.accountId && params.accountId !== "ALL")
      sp.set("accountId", params.accountId);
    if (params?.search) sp.set("search", params.search);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    if (params?.tag) sp.set("tag", params.tag);
    if (params?.limit) sp.set("limit", String(params.limit));
    const qs = sp.toString();
    return request<Transaction[]>(`/api/transactions${qs ? `?${qs}` : ""}`);
  },
  createTransaction: (data: TransactionInput) =>
    request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateTransaction: (id: string, data: TransactionInput) =>
    request<Transaction>(`/api/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteTransaction: (id: string) =>
    request<void>(`/api/transactions/${id}`, { method: "DELETE" }),

  // Categories
  listCategories: (type?: string) => {
    const qs = type ? `?type=${type}` : "";
    return request<Category[]>(`/api/categories${qs}`);
  },
  createCategory: (data: CategoryInput) =>
    request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: string) =>
    request<void>(`/api/categories/${id}`, { method: "DELETE" }),

  // Accounts
  listAccounts: () => request<Account[]>("/api/accounts"),
  createAccount: (data: AccountInput) =>
    request<Account>("/api/accounts", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateAccount: (id: string, data: Partial<AccountInput>) =>
    request<Account>(`/api/accounts/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteAccount: (id: string) =>
    request<void>(`/api/accounts/${id}`, { method: "DELETE" }),
  transfer: (data: TransferInput) =>
    request<{ message: string }>("/api/accounts/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Budgets
  listBudgets: () => request<Budget[]>("/api/budgets"),
  createBudget: (data: BudgetInput) =>
    request<Budget>("/api/budgets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateBudget: (id: string, data: BudgetInput) =>
    request<Budget>(`/api/budgets/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteBudget: (id: string) =>
    request<void>(`/api/budgets/${id}`, { method: "DELETE" }),
  budgetStatuses: () =>
    request<BudgetStatus[]>("/api/budgets/status"),

  // Goals
  listGoals: () => request<Goal[]>("/api/goals"),
  createGoal: (data: GoalInput) =>
    request<Goal>("/api/goals", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateGoal: (id: string, data: Partial<GoalInput>) =>
    request<Goal>(`/api/goals/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteGoal: (id: string) =>
    request<void>(`/api/goals/${id}`, { method: "DELETE" }),

  // Recurring
  listRecurring: () => request<RecurringTransaction[]>("/api/recurring"),
  createRecurring: (data: RecurringInput) =>
    request<RecurringTransaction>("/api/recurring", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRecurring: (id: string, data: Partial<RecurringInput>) =>
    request<RecurringTransaction>(`/api/recurring/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteRecurring: (id: string) =>
    request<void>(`/api/recurring/${id}`, { method: "DELETE" }),

  // Tags
  listTags: () => request<Tag[]>("/api/tags"),

  // Dashboard
  getDashboard: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request<DashboardData>(`/api/dashboard${qs}`);
  },

  // Analytics
  getAnalytics: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request<AnalyticsData>(`/api/analytics${qs}`);
  },

  // Settings
  getSettings: () => request<Record<string, string>>("/api/settings"),
  updateSetting: (key: string, value: string) =>
    request<{ message: string }>("/api/settings", {
      method: "PUT",
      body: JSON.stringify({ key, value }),
    }),

  // AI
  chat: (messages: ChatMessage[]) =>
    request<{ reply: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),
  receiptScan: (imageBase64: string) =>
    request<{
      merchant?: string;
      date?: string;
      total?: number;
      items?: string[];
      category?: string;
    }>("/api/ai/receipt", {
      method: "POST",
      body: JSON.stringify({ image: imageBase64 }),
    }),
  insights: () =>
    request<{ insights: string[] }>("/api/ai/insights"),

  // Import
  importCsv: (rows: Array<Record<string, string>>) =>
    request<{ imported: number; skipped: number; errors: string[] }>(
      "/api/import/csv",
      {
        method: "POST",
        body: JSON.stringify({ rows }),
      }
    ),

  // Export
  exportTransactionsUrl: (params?: {
    type?: string;
    from?: string;
    to?: string;
  }) => {
    const sp = new URLSearchParams();
    if (params?.type && params.type !== "ALL") sp.set("type", params.type);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
    const qs = sp.toString();
    return `/api/export/transactions${qs ? `?${qs}` : ""}`;
  },
  backupUrl: () => "/api/export/backup",

  // Seed
  seed: () => request<{ message: string }>("/api/seed", { method: "POST" }),
  runRecurring: () =>
    request<{ generated: number }>("/api/recurring/run", { method: "POST" }),
};
