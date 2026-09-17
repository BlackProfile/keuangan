// Shared types for the finance app

export type TransactionType = "INCOME" | "EXPENSE";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category;
}

export interface TransactionWithCategory extends Transaction {
  category: Category;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  date: string; // ISO date string (yyyy-mm-dd)
  categoryId: string;
  note?: string;
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface Summary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  monthIncome: number;
  monthExpense: number;
  monthBalance: number;
  transactionCount: number;
  monthTransactionCount: number;
}

export interface CategoryBreakdown {
  category: Category;
  total: number;
  percentage: number;
  count: number;
}

export interface MonthlyData {
  month: string; // "YYYY-MM"
  label: string; // "Jan", "Feb", etc
  income: number;
  expense: number;
}

export interface DashboardData {
  summary: Summary;
  monthlyData: MonthlyData[];
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  recentTransactions: TransactionWithCategory[];
}
