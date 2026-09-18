// Shared types for the finance app

export type TransactionType = "INCOME" | "EXPENSE";
export type AccountType = "CASH" | "BANK" | "EWALLET" | "INVESTMENT";
export type Frequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type BudgetPeriod = "MONTHLY" | "WEEKLY" | "YEARLY";

export type Mood = "happy" | "neutral" | "stressed" | "excited" | "sad";
export type Priority = "URGENT" | "NEED" | "WANT";
export type PaymentStatus = "PAID" | "PENDING" | "SCHEDULED" | "FAILED";
export type PaymentMethod =
  | "CASH"
  | "TRANSFER"
  | "QRIS"
  | "DEBIT"
  | "CREDIT"
  | "EWALLET";
export type TransactionStatus = "DRAFT" | "SCHEDULED" | "CONFIRMED";
export type DebtType = "DEBT" | "RECEIVABLE";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  defaultAmount: number | null;
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

export interface TransactionSplit {
  id: string;
  parentTransactionId: string;
  amount: number;
  categoryId: string;
  note: string | null;
  createdAt: string;
  category?: Category;
}

export interface TransactionGroup {
  id: string;
  name: string;
  description: string | null;
  color: string;
  icon: string;
  createdAt: string;
}

export interface ReceiptItem {
  id: string;
  transactionId: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  createdAt: string;
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

  // New per-transaction fields
  time: string | null;
  photoUrl: string | null;
  mood: Mood | null;
  priority: Priority | null;
  paymentStatus: PaymentStatus | null;
  paymentMethod: PaymentMethod | null;
  recipient: string | null;
  currency: string;
  originalAmount: number | null;
  exchangeRate: number | null;
  parentTransactionId: string | null;
  groupId: string | null;
  installmentId: string | null;
  isSplit: boolean;
  isDebt: boolean;
  isReimbursable: boolean;
  reimbursed: boolean;
  isSubscription: boolean;
  isTaxDeductible: boolean;
  isBusinessExpense: boolean;
  excludeFromBudget: boolean;
  excludeFromStats: boolean;
  isPinned: boolean;
  cashbackAmount: number | null;
  originalPrice: number | null;
  discountAmount: number | null;
  debtDueDate: string | null;
  creditor: string | null;
  goalId: string | null;
  assignedTo: string | null;
  status: TransactionStatus;
  linkUrl: string | null;

  createdAt: string;
  updatedAt: string;
  category?: Category;
  account?: Account | null;
  splits?: TransactionSplit[];
  group?: TransactionGroup | null;
  receiptItems?: ReceiptItem[];
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
  time?: string;
  photoUrl?: string;
  mood?: Mood | null;
  priority?: Priority | null;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod | null;
  recipient?: string;
  currency?: string;
  originalAmount?: number;
  exchangeRate?: number;
  parentTransactionId?: string;
  groupId?: string;
  installmentId?: string;
  isSplit?: boolean;
  isDebt?: boolean;
  isReimbursable?: boolean;
  reimbursed?: boolean;
  isSubscription?: boolean;
  isTaxDeductible?: boolean;
  isBusinessExpense?: boolean;
  excludeFromBudget?: boolean;
  excludeFromStats?: boolean;
  isPinned?: boolean;
  cashbackAmount?: number;
  originalPrice?: number;
  discountAmount?: number;
  debtDueDate?: string;
  creditor?: string;
  goalId?: string;
  assignedTo?: string;
  status?: TransactionStatus;
  linkUrl?: string;
  splits?: Array<{ amount: number; categoryId: string; note?: string }>;
  receiptItems?: Array<{ name: string; qty: number; price: number; total: number }>;
}

export interface CategoryInput {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  defaultAmount?: number;
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

export interface Debt {
  id: string;
  type: DebtType;
  person: string;
  amount: number;
  paidAmount: number;
  dueDate: string | null;
  description: string | null;
  note: string | null;
  settled: boolean;
  linkedTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DebtInput {
  type: DebtType;
  person: string;
  amount: number;
  paidAmount?: number;
  dueDate?: string;
  description?: string;
  note?: string;
}

export interface Installment {
  id: string;
  description: string;
  totalAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  monthlyAmount: number;
  startDate: string;
  endDate: string | null;
  accountId: string | null;
  categoryId: string;
  merchant: string | null;
  active: boolean;
  transactions?: Transaction[];
}

export interface InstallmentInput {
  description: string;
  totalAmount: number;
  totalInstallments: number;
  monthlyAmount: number;
  startDate: string;
  accountId?: string;
  categoryId: string;
  merchant?: string;
}

export interface TransactionTemplate {
  id: string;
  name: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string | null;
  merchant: string | null;
  paymentMethod: PaymentMethod | null;
  priority: Priority | null;
  icon: string;
  createdAt: string;
  category?: Category;
  account?: Account | null;
}

export interface TransactionTemplateInput {
  name: string;
  type: TransactionType;
  amount: number;
  description: string;
  categoryId: string;
  accountId?: string;
  merchant?: string;
  paymentMethod?: PaymentMethod;
  priority?: Priority;
  icon?: string;
}

export interface TransactionGroupInput {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
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
    incomeChange: number;
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
