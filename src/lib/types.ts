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
  isHidden: boolean;
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
  isHidden?: boolean;
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

// ============ SHARE LINK TYPES ============
export type ShareAccessLevel = "VIEW" | "COMMENT" | "WRITE" | "ADMIN";
export type ShareScopeType =
  | "ALL"
  | "ACCOUNT"
  | "CATEGORY"
  | "GROUP"
  | "TAG"
  | "DATE_RANGE"
  | "CUSTOM";

export interface ShareLink {
  id: string;
  token: string;
  title: string;
  message: string | null;
  accessLevel: ShareAccessLevel;
  scopeType: ShareScopeType;
  scopeData: string | null;
  expiresAt: string | null;
  maxViews: number | null;
  viewCount: number;
  hoursActive: number | null;
  oneTime: boolean;
  maxConcurrent: number | null;
  passwordHash: string | null;
  requireEmail: string | null;
  ipWhitelist: string | null;
  hiddenAmounts: boolean;
  maskedDesc: boolean;
  customTheme: string | null;
  hideBranding: boolean;
  language: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { views: number; comments: number };
}

export interface ShareLinkInput {
  title: string;
  message?: string;
  accessLevel?: ShareAccessLevel;
  scopeType?: ShareScopeType;
  scopeData?: Record<string, unknown>;
  expiresAt?: string;
  maxViews?: number;
  hoursActive?: number;
  oneTime?: boolean;
  maxConcurrent?: number;
  password?: string;
  requireEmail?: string;
  ipWhitelist?: string;
  hiddenAmounts?: boolean;
  maskedDesc?: boolean;
  customTheme?: string;
  hideBranding?: boolean;
  language?: string;
}

export interface ShareView {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  viewedAt: string;
}

export interface ShareComment {
  id: string;
  transactionId: string | null;
  author: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export interface SharePageData {
  link: ShareLink;
  transactions: Transaction[];
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    count: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  comments: ShareComment[];
  requirePassword: boolean;
  requireEmailVerification: boolean;
  expired: boolean;
  viewsRemaining: number | null;
}

// ============ EXPORT & HIDDEN TRANSACTIONS ============
export interface ExportTemplate {
  id: string;
  name: string;
  format: "PDF" | "EXCEL" | "CSV" | "JSON" | "IMAGE";
  reportType: ExportReportType;
  scope: ExportScope | null;
  fields: string[] | null;
  options: ExportOptions | null;
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExportReportType =
  | "TRANSACTIONS"
  | "MONTHLY"
  | "YEARLY"
  | "TAX"
  | "BUDGET"
  | "GOALS"
  | "DEBTS"
  | "ACCOUNT"
  | "GROUP"
  | "CASHFLOW"
  | "NETWORTH"
  | "SLIP";

export interface ExportScope {
  type: "ALL" | "ACCOUNT" | "CATEGORY" | "GROUP" | "TAG" | "DATE_RANGE" | "CUSTOM";
  accountId?: string;
  categoryId?: string;
  groupId?: string;
  tag?: string;
  from?: string;
  to?: string;
  txIds?: string[];
  includeHidden?: boolean;
}

export interface ExportOptions {
  includeHidden?: boolean;
  password?: string;
  watermark?: string;
  logo?: string;
  theme?: string;
  title?: string;
  language?: "id" | "en";
  numberFormat?: "id" | "en";
  groupBy?: "date" | "category" | "account" | "merchant" | "tag";
  showSummary?: boolean;
  showCharts?: boolean;
  showReceiptItems?: boolean;
}

export interface ExportTemplateInput {
  name: string;
  format: "PDF" | "EXCEL" | "CSV" | "JSON" | "IMAGE";
  reportType: ExportReportType;
  scope?: ExportScope;
  fields?: string[];
  options?: ExportOptions;
}

export interface ExportPreview {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    transactionCount: number;
    dateRange: { from: string | null; to: string | null };
  };
  categoryBreakdown: Array<{
    category: string;
    total: number;
    count: number;
    percentage: number;
  }>;
  topMerchants: Array<{ merchant: string; total: number; count: number }>;
  transactions: Transaction[];
  fields: string[];
  estimatedSize: string;
}

// ============ STUDENT FEATURES ============
export type AcademicMode = "KULIAH" | "UTS" | "UAS" | "LIBUR" | "SKRIPSI" | "MAGANG";

export interface StudentProfile {
  id: string;
  monthlyAllowance: number;
  allowanceDay: number;
  semester: string | null;
  academicMode: AcademicMode;
  university: string | null;
  major: string | null;
  academicYear: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfileInput {
  monthlyAllowance?: number;
  allowanceDay?: number;
  semester?: string;
  academicMode?: AcademicMode;
  university?: string;
  major?: string;
  academicYear?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: "SAVINGS" | "NO_JAJAN" | "MINIMAL_SPEND" | "WEEKLY" | "CUSTOM";
  targetAmount: number | null;
  targetDays: number | null;
  icon: string;
  color: string;
  reward: string | null;
  xpReward: number;
  active: boolean;
  createdAt: string;
  participations?: ChallengeParticipation[];
}

export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  startDate: string;
  endDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "FAILED" | "ABANDONED";
  progress: number;
  currentAmount: number;
  xpEarned: number;
  challenge?: Challenge;
}

export interface SplitBill {
  id: string;
  title: string;
  description: string | null;
  totalAmount: number;
  paidBy: string;
  splitType: "EQUAL" | "CUSTOM" | "PERCENTAGE";
  category: "MAKAN" | "KOS" | "EVENT" | "TRANSPORT" | "OTHER";
  date: string;
  settled: boolean;
  icon: string;
  color: string;
  note: string | null;
  participants: SplitBillParticipant[];
  createdAt: string;
  updatedAt: string;
}

export interface SplitBillParticipant {
  id: string;
  splitBillId: string;
  name: string;
  share: number;
  paid: boolean;
  paidAt: string | null;
}

export interface SplitBillInput {
  title: string;
  description?: string;
  totalAmount: number;
  paidBy: string;
  splitType?: "EQUAL" | "CUSTOM" | "PERCENTAGE";
  category?: "MAKAN" | "KOS" | "EVENT" | "TRANSPORT" | "OTHER";
  icon?: string;
  color?: string;
  note?: string;
  participants: Array<{ name: string; share: number }>;
}

export interface FriendDebt {
  id: string;
  friendName: string;
  type: "DEBT" | "RECEIVABLE";
  amount: number;
  description: string | null;
  date: string;
  dueDate: string | null;
  settled: boolean;
  reminderSent: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FriendDebtInput {
  friendName: string;
  type: "DEBT" | "RECEIVABLE";
  amount: number;
  description?: string;
  dueDate?: string;
  note?: string;
}

export interface DailyAllowanceInfo {
  monthlyAllowance: number;
  dayOfMonth: number;
  daysInMonth: number;
  daysRemaining: number;
  spentThisMonth: number;
  remainingThisMonth: number;
  dailyAllowance: number;
  dailyRemaining: number;
  dailySpent: number;
  projection: {
    willRunOutDay: number | null;
    surplusOrDeficit: number;
    dailyCutNeeded: number | null;
    message: string;
  };
}
