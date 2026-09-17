import type { AccountInput, CategoryInput } from "@/lib/types";

export const DEFAULT_CATEGORIES: CategoryInput[] = [
  // Income
  { name: "Gaji", type: "INCOME", icon: "Wallet", color: "#10b981" },
  { name: "Bonus", type: "INCOME", icon: "Gift", color: "#22c55e" },
  { name: "Investasi", type: "INCOME", icon: "TrendingUp", color: "#14b8a6" },
  { name: "Freelance", type: "INCOME", icon: "Laptop", color: "#84cc16" },
  { name: "Hadiah", type: "INCOME", icon: "PartyPopper", color: "#06b6d4" },
  { name: "Lainnya", type: "INCOME", icon: "PlusCircle", color: "#65a30d" },
  // Expense
  { name: "Makanan", type: "EXPENSE", icon: "UtensilsCrossed", color: "#ef4444" },
  { name: "Transportasi", type: "EXPENSE", icon: "Car", color: "#f97316" },
  { name: "Belanja", type: "EXPENSE", icon: "ShoppingBag", color: "#ec4899" },
  { name: "Tagihan", type: "EXPENSE", icon: "ReceiptText", color: "#f43f5e" },
  { name: "Hiburan", type: "EXPENSE", icon: "Clapperboard", color: "#a855f7" },
  { name: "Kesehatan", type: "EXPENSE", icon: "HeartPulse", color: "#e11d48" },
  { name: "Pendidikan", type: "EXPENSE", icon: "GraduationCap", color: "#8b5cf6" },
  { name: "Perumahan", type: "EXPENSE", icon: "Home", color: "#0891b2" },
  { name: "Olahraga", type: "EXPENSE", icon: "Dumbbell", color: "#0d9488" },
  { name: "Lainnya", type: "EXPENSE", icon: "MinusCircle", color: "#6b7280" },
];

export const DEFAULT_ACCOUNTS: AccountInput[] = [
  {
    name: "Tunai",
    type: "CASH",
    icon: "Banknote",
    color: "#10b981",
    balance: 500000,
    isDefault: true,
    note: "Uang tunai dompet",
  },
  {
    name: "Bank",
    type: "BANK",
    icon: "Landmark",
    color: "#0891b2",
    balance: 5000000,
    note: "Rekening bank utama",
  },
  {
    name: "E-Wallet",
    type: "EWALLET",
    icon: "Smartphone",
    color: "#8b5cf6",
    balance: 250000,
    note: "GoPay / OVO / DANA",
  },
];

export const ACCOUNT_TYPE_ICONS: Record<string, string[]> = {
  CASH: ["Banknote", "Coins", "Wallet", "CircleDollarSign"],
  BANK: ["Landmark", "Building2", "CreditCard", "Banknote"],
  EWALLET: ["Smartphone", "QrCode", "Nfc", "CreditCard"],
  INVESTMENT: ["TrendingUp", "ChartLine", "PiggyBank", "Coins"],
};

export const ACCOUNT_COLORS = [
  "#10b981", "#0891b2", "#8b5cf6", "#f97316",
  "#ef4444", "#ec4899", "#14b8a6", "#84cc16",
  "#6b7280", "#0d9488",
];

export const CATEGORY_COLORS = [
  "#10b981", "#22c55e", "#14b8a6", "#06b6d4", "#0d9488", "#84cc16",
  "#eab308", "#f97316", "#ef4444", "#f43f5e", "#ec4899", "#a855f7",
  "#8b5cf6", "#6b7280",
];

export const CATEGORY_ICONS = [
  "Wallet", "Gift", "TrendingUp", "Laptop", "PartyPopper", "PlusCircle",
  "UtensilsCrossed", "Car", "ShoppingBag", "ReceiptText", "Clapperboard",
  "HeartPulse", "GraduationCap", "Home", "Dumbbell", "MinusCircle",
  "Coffee", "Plane", "Bus", "Train", "Bike", "Phone", "Book", "Music",
  "Camera", "Gamepad2", "Baby", "Dog", "Cat", "PiggyBank", "CreditCard",
  "Banknote", "DollarSign", "Smartphone", "Zap", "Wrench", "Shirt",
  "Apple", "Pizza", "Cake", "Beer", "GlassWater", "Fuel", "Stethoscope",
  "Pill", "Briefcase", "Building2", "Landmark", "Calculator",
];

export const QUICK_ADD_PRESETS = [
  { label: "5rb", amount: 5000 },
  { label: "10rb", amount: 10000 },
  { label: "20rb", amount: 20000 },
  { label: "50rb", amount: 50000 },
  { label: "100rb", amount: 100000 },
];

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  // unlock condition evaluated client-side via stats
  check: (stats: {
    transactionCount: number;
    streak: number;
    savingsRate: number;
    goalsCompleted: number;
    budgetsSet: number;
  }) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-transaction",
    name: "Langkah Pertama",
    description: "Catat transaksi pertamamu",
    icon: "Sparkles",
    color: "#10b981",
    check: (s) => s.transactionCount >= 1,
  },
  {
    id: "ten-transactions",
    name: "Pelajar Rajin",
    description: "Catat 10 transaksi",
    icon: "BookOpen",
    color: "#0891b2",
    check: (s) => s.transactionCount >= 10,
  },
  {
    id: "fifty-transactions",
    name: "Konsisten",
    description: "Catat 50 transaksi",
    icon: "Award",
    color: "#8b5cf6",
    check: (s) => s.transactionCount >= 50,
  },
  {
    id: "streak-3",
    name: "Habit Streak",
    description: "Catat transaksi 3 hari berturut-turut",
    icon: "Flame",
    color: "#f97316",
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak-7",
    name: "Seminggu Penuh",
    description: "Catat transaksi 7 hari berturut-turut",
    icon: "Flame",
    color: "#ef4444",
    check: (s) => s.streak >= 7,
  },
  {
    id: "saver",
    name: "Si Hemat",
    description: "Capai savings rate 20%+ bulan ini",
    icon: "PiggyBank",
    color: "#14b8a6",
    check: (s) => s.savingsRate >= 20,
  },
  {
    id: "super-saver",
    name: "Jago Menabung",
    description: "Capai savings rate 40%+ bulan ini",
    icon: "Trophy",
    color: "#eab308",
    check: (s) => s.savingsRate >= 40,
  },
  {
    id: "goal-achiever",
    name: "Pencapai Target",
    description: "Selesaikan 1 target tabungan",
    icon: "Target",
    color: "#22c55e",
    check: (s) => s.goalsCompleted >= 1,
  },
  {
    id: "budget-master",
    name: "Perencana",
    description: "Buat 3 anggaran kategori",
    icon: "ClipboardList",
    color: "#a855f7",
    check: (s) => s.budgetsSet >= 3,
  },
];

export const GOAL_ICONS = [
  "Target", "Plane", "Home", "Car", "GraduationCap", "Gift",
  "HeartPulse", "Smartphone", "Laptop", "PiggyBank", "Trophy",
  "Baby", "Ring", "Dumbbell",
];

export const GOAL_COLORS = [
  "#10b981", "#0891b2", "#8b5cf6", "#f97316", "#ec4899",
  "#14b8a6", "#eab308", "#ef4444", "#22c55e", "#a855f7",
];

export const TAG_COLORS = [
  "#10b981", "#0891b2", "#8b5cf6", "#f97316", "#ef4444",
  "#ec4899", "#14b8a6", "#eab308", "#6b7280",
];

// Auto-categorization keyword map (merchant/description -> categoryId name)
export const AUTO_CATEGORY_KEYWORDS: Record<string, { category: string; type: "INCOME" | "EXPENSE"; merchant?: string }> = {
  indomaret: { category: "Belanja", type: "EXPENSE", merchant: "Indomaret" },
  alfamart: { category: "Belanja", type: "EXPENSE", merchant: "Alfamart" },
  alfamidi: { category: "Belanja", type: "EXPENSE", merchant: "Alfamidi" },
  shopee: { category: "Belanja", type: "EXPENSE", merchant: "Shopee" },
  tokopedia: { category: "Belanja", type: "EXPENSE", merchant: "Tokopedia" },
  lazada: { category: "Belanja", type: "EXPENSE", merchant: "Lazada" },
  gojek: { category: "Transportasi", type: "EXPENSE", merchant: "Gojek" },
  grab: { category: "Transportasi", type: "EXPENSE", merchant: "Grab" },
  ojek: { category: "Transportasi", type: "EXPENSE" },
  "go-food": { category: "Makanan", type: "EXPENSE", merchant: "GoFood" },
  gofood: { category: "Makanan", type: "EXPENSE", merchant: "GoFood" },
  "grab-food": { category: "Makanan", type: "EXPENSE", merchant: "GrabFood" },
  grabfood: { category: "Makanan", type: "EXPENSE", merchant: "GrabFood" },
  mcdonald: { category: "Makanan", type: "EXPENSE", merchant: "McDonald's" },
  mcd: { category: "Makanan", type: "EXPENSE", merchant: "McDonald's" },
  kfc: { category: "Makanan", type: "EXPENSE", merchant: "KFC" },
  starbucks: { category: "Makanan", type: "EXPENSE", merchant: "Starbucks" },
  starbuck: { category: "Makanan", type: "EXPENSE", merchant: "Starbucks" },
  kopi: { category: "Makanan", type: "EXPENSE" },
  makan: { category: "Makanan", type: "EXPENSE" },
  makanan: { category: "Makanan", type: "EXPENSE" },
  resto: { category: "Makanan", type: "EXPENSE" },
  restoran: { category: "Makanan", type: "EXPENSE" },
  netflix: { category: "Hiburan", type: "EXPENSE", merchant: "Netflix" },
  spotify: { category: "Hiburan", type: "EXPENSE", merchant: "Spotify" },
  youtube: { category: "Hiburan", type: "EXPENSE", merchant: "YouTube" },
  bioskop: { category: "Hiburan", type: "EXPENSE" },
  game: { category: "Hiburan", type: "EXPENSE" },
  steam: { category: "Hiburan", type: "EXPENSE", merchant: "Steam" },
  pln: { category: "Tagihan", type: "EXPENSE", merchant: "PLN" },
  listrik: { category: "Tagihan", type: "EXPENSE", merchant: "PLN" },
  pdam: { category: "Tagihan", type: "EXPENSE", merchant: "PDAM" },
  air: { category: "Tagihan", type: "EXPENSE" },
  internet: { category: "Tagihan", type: "EXPENSE" },
  indihome: { category: "Tagihan", type: "EXPENSE", merchant: "Indihome" },
  wifi: { category: "Tagihan", type: "EXPENSE" },
  pulsa: { category: "Tagihan", type: "EXPENSE" },
  paket: { category: "Tagihan", type: "EXPENSE" },
  sewa: { category: "Perumahan", type: "EXPENSE" },
  kos: { category: "Perumahan", type: "EXPENSE" },
  kontrakan: { category: "Perumahan", type: "EXPENSE" },
  "cicilan ": { category: "Tagihan", type: "EXPENSE" },
  apotek: { category: "Kesehatan", type: "EXPENSE" },
  obat: { category: "Kesehatan", type: "EXPENSE" },
  dokter: { category: "Kesehatan", type: "EXPENSE" },
  "rumah sakit": { category: "Kesehatan", type: "EXPENSE" },
  rs: { category: "Kesehatan", type: "EXPENSE" },
  gym: { category: "Olahraga", type: "EXPENSE", merchant: "Gym" },
  gaji: { category: "Gaji", type: "INCOME", merchant: "Perusahaan" },
  salary: { category: "Gaji", type: "INCOME", merchant: "Perusahaan" },
  bonus: { category: "Bonus", type: "INCOME" },
  "thrift ": { category: "Investasi", type: "INCOME" },
  "dividen ": { category: "Investasi", type: "INCOME" },
  "bunga ": { category: "Investasi", type: "INCOME" },
  freelance: { category: "Freelance", type: "INCOME" },
  proyek: { category: "Freelance", type: "INCOME" },
};
