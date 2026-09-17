// API client helpers for the finance app
import type {
  Category,
  CategoryInput,
  DashboardData,
  Transaction,
  TransactionInput,
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
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
  }) => {
    const sp = new URLSearchParams();
    if (params?.type) sp.set("type", params.type);
    if (params?.categoryId) sp.set("categoryId", params.categoryId);
    if (params?.search) sp.set("search", params.search);
    if (params?.from) sp.set("from", params.from);
    if (params?.to) sp.set("to", params.to);
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

  // Dashboard
  getDashboard: (month?: string) => {
    const qs = month ? `?month=${month}` : "";
    return request<DashboardData>(`/api/dashboard${qs}`);
  },

  // Export CSV
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

  // Seed
  seed: () => request<{ message: string }>("/api/seed", { method: "POST" }),
};
