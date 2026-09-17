// Shared types for the finance app

export type TransactionType = "INCOME" | "EXPENSE";
export type AccountType = "CASH" | "BANK" | "EWALLET" | "INVESTMENT";
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type BudgetPeriod = "MONTHLY" | "WEEKLY" | "YEARLY";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance: number;
  isDefault: boolean;
  note: string | null;
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
  accountId: string | null;
  note: string | null;
  tags: string | null;
  merchant: string | null;
  isRecurringGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  account?: Account | null;
}

export interface TransactionWithRelations extends Transaction {
  category: Category;
  account?: Account | null;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  categoryId: string;
  accountId?: string;
  note?: string;
  tags?: string;
  merchant?: string;
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
}

export interface AccountInput {
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  balance?: number;
  note?: string;
  isDefault?: boolean;
}

export interface TransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  date: string;
  note?: string;
  fee?: number;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetInput {
  categoryId: string;
  amount: number;
  period: BudgetPeriod;
}

export interface BudgetStatus extends Budget {
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "danger" | "over";
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string | null;
  icon: string;
  color: string;
  note: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GoalInput {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  targetDate?: string;
  icon?: string;
  color?: string;
  note?: string;
}

export interface RecurringTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string | null;
  frequency: Frequency;
  interval: number;
  startDate: string;
  nextDate: string;
  endDate: string | null;
  note: string | null;
  active: boolean;
  lastRunAt: string | null;
  category?: Category;
  account?: Account | null;
}

export interface RecurringInput {
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId?: string;
  frequency: Frequency;
  interval: number;
  startDate: string;
  endDate?: string;
  note?: string;
}

export interface Tag {
  id: string;
  name: string;
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
  month: string;
  label: string;
  income: number;
  expense: number;
}

export interface DashboardData {
  summary: Summary;
  monthlyData: MonthlyData[];
  expenseByCategory: CategoryBreakdown[];
  incomeByCategory: CategoryBreakdown[];
  recentTransactions: TransactionWithRelations[];
  budgetStatuses: BudgetStatus[];
  goals: Goal[];
  accounts: Account[];
  streak: number;
  savingsRate: number;
}

export interface AnalyticsData {
  monthComparison: {
    current: { income: number; expense: number; balance: number; count: number };
    previous: { income: number; expense: number; balance: number; count: number };
    incomeChange: number; // percentage
    expenseChange: number;
    balanceChange: number;
  };
  topMerchants: Array<{ merchant: string; total: number; count: number }>;
  topCategories: CategoryBreakdown[];
  heatmap: Array<{ date: string; count: number; amount: number }>;
  forecast: {
    nextMonthIncome: number;
    nextMonthExpense: number;
    avgIncome: number;
    avgExpense: number;
    savingsRate: number;
  };
  ratios: {
    savingsRate: number;
    expenseRatio: number;
    incomeToExpenseRatio: number;
  };
  insights: string[];
  monthlyTrend: MonthlyData[];
  weekdaySpending: Array<{ day: string; total: number; count: number }>;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AppSettings {
  pinEnabled: boolean;
  pinHash: string | null;
  hideAmounts: boolean;
  currency: string;
  reminderEnabled: boolean;
  reminderHour: number;
  theme: "light" | "dark" | "system";
}
