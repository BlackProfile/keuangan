import type { AcademicMode, Challenge } from "@/lib/types";

// Quick jajan presets for students
export const JAJAN_PRESETS = [
  { label: "Kopi", amount: 8000, icon: "Coffee", category: "Makanan" },
  { label: "Mie", amount: 10000, icon: "Soup", category: "Makanan" },
  { label: "Es Teh", amount: 3000, icon: "CupSoda", category: "Makanan" },
  { label: "Nasi Padang", amount: 15000, icon: "UtensilsCrossed", category: "Makanan" },
  { label: "Bakso", amount: 12000, icon: "Soup", category: "Makanan" },
  { label: "Cireng", amount: 5000, icon: "Cookie", category: "Makanan" },
  { label: "Roti", amount: 7000, icon: "Croissant", category: "Makanan" },
  { label: "Gorengan", amount: 2000, icon: "Flame", category: "Makanan" },
  { label: "Seblak", amount: 10000, icon: "Bowl", category: "Makanan" },
  { label: "Bobo", amount: 12000, icon: "CupSoda", category: "Makanan" },
  { label: "GoFood", amount: 20000, icon: "Bike", category: "Makanan" },
  { label: "Parkir", amount: 3000, icon: "CircleParking", category: "Transportasi" },
  { label: "Bensin", amount: 10000, icon: "Fuel", category: "Transportasi" },
  { label: "Gojek", amount: 8000, icon: "Bike", category: "Transportasi" },
  { label: "Fotokopi", amount: 2000, icon: "Copy", category: "Pendidikan" },
  { label: "Print", amount: 5000, icon: "Printer", category: "Pendidikan" },
  { label: "Pulsa", amount: 10000, icon: "Smartphone", category: "Tagihan" },
  { label: "Kuota", amount: 25000, icon: "Wifi", category: "Tagihan" },
];

// Budget template for students (percentages)
export const STUDENT_BUDGET_TEMPLATE = [
  { category: "Makanan", percentage: 40, color: "#ef4444", icon: "UtensilsCrossed" },
  { category: "Transportasi", percentage: 15, color: "#f97316", icon: "Car" },
  { category: "Jajan", percentage: 20, color: "#ec4899", icon: "Cookie" },
  { category: "Hiburan", percentage: 15, color: "#a855f7", icon: "Clapperboard" },
  { category: "Nabung", percentage: 10, color: "#10b981", icon: "PiggyBank" },
];

// Academic modes
export const ACADEMIC_MODES: Array<{ value: AcademicMode; label: string; icon: string; color: string }> = [
  { value: "KULIAH", label: "Kuliah", icon: "BookOpen", color: "#10b981" },
  { value: "UTS", label: "UTS", icon: "FileText", color: "#f59e0b" },
  { value: "UAS", label: "UAS", icon: "GraduationCap", color: "#ef4444" },
  { value: "LIBUR", label: "Libur", icon: "Palmtree", color: "#06b6d4" },
  { value: "SKRIPSI", label: "Skripsi", icon: "PenTool", color: "#8b5cf6" },
  { value: "MAGANG", label: "Magang", icon: "Briefcase", color: "#0891b2" },
];

// Challenge templates (seed data)
export const DEFAULT_CHALLENGES: Array<{
  name: string;
  description: string;
  type: "SAVINGS" | "NO_JAJAN" | "MINIMAL_SPEND" | "WEEKLY" | "CUSTOM";
  targetAmount?: number;
  targetDays?: number;
  icon: string;
  color: string;
  reward?: string;
  xpReward: number;
}> = [
  {
    name: "52 Minggu Nabung",
    description: "Nabung minggu 1: Rp1rb, minggu 2: Rp2rb... total Rp1.3jt setahun",
    type: "SAVINGS",
    targetAmount: 1378000,
    targetDays: 364,
    icon: "PiggyBank",
    color: "#10b981",
    reward: "Badge Jago Nabung",
    xpReward: 500,
  },
  {
    name: "7 Hari No Jajan",
    description: "Tidak jajan selama 7 hari, bawa bekal/masak sendiri",
    type: "NO_JAJAN",
    targetDays: 7,
    icon: "Flame",
    color: "#f97316",
    reward: "Badge No-Jajan Warrior",
    xpReward: 200,
  },
  {
    name: "Hemat 10%",
    description: "Nabung 10% dari uang saku bulan ini",
    type: "SAVINGS",
    targetAmount: 150000,
    targetDays: 30,
    icon: "TrendingDown",
    color: "#14b8a6",
    reward: "Badge Si Hemat",
    xpReward: 150,
  },
  {
    name: "Minimal Jajan",
    description: "Max 1x jajan per hari selama seminggu",
    type: "MINIMAL_SPEND",
    targetDays: 7,
    icon: "Minimize2",
    color: "#8b5cf6",
    reward: "Badge Minimalist",
    xpReward: 100,
  },
  {
    name: "Bebas Utang",
    description: "Tidak berhutang ke teman selama sebulan",
    type: "CUSTOM",
    targetDays: 30,
    icon: "ShieldCheck",
    color: "#0891b2",
    reward: "Badge Bebas Utang",
    xpReward: 150,
  },
  {
    name: "Nabung Konser",
    description: "Nabung untuk tiket konser favoritmu",
    type: "SAVINGS",
    targetAmount: 500000,
    targetDays: 60,
    icon: "Music",
    color: "#ec4899",
    reward: "Badge Groupie Hemat",
    xpReward: 200,
  },
];

// Split bill category presets
export const SPLIT_BILL_CATEGORIES = [
  { value: "MAKAN", label: "Makan", icon: "UtensilsCrossed", color: "#f97316" },
  { value: "KOS", label: "Kosan", icon: "Home", color: "#10b981" },
  { value: "EVENT", label: "Acara", icon: "PartyPopper", color: "#a855f7" },
  { value: "TRANSPORT", label: "Transport", icon: "Car", color: "#0891b2" },
  { value: "OTHER", label: "Lainnya", icon: "MoreHorizontal", color: "#6b7280" },
];

// Student expense categories (extended)
export const STUDENT_CATEGORY_IDEAS = [
  { name: "Jajan", type: "EXPENSE", icon: "Cookie", color: "#ec4899" },
  { name: "Skripsi", type: "EXPENSE", icon: "PenTool", color: "#8b5cf6" },
  { name: "UKM", type: "EXPENSE", icon: "Users", color: "#06b6d4" },
  { name: "Nongkrong", type: "EXPENSE", icon: "Coffee", color: "#a855f7" },
  { name: "Game", type: "EXPENSE", icon: "Gamepad2", color: "#6366f1" },
  { name: "Dating", type: "EXPENSE", icon: "Heart", color: "#f43f5e" },
  { name: "Freelance", type: "INCOME", icon: "Laptop", color: "#84cc16" },
  { name: "Beasiswa", type: "INCOME", icon: "Award", color: "#22c55e" },
  { name: "Uang Saku", type: "INCOME", icon: "Wallet", color: "#10b981" },
];

// Gamification: XP thresholds per level
export const XP_PER_LEVEL = 1000;
export const LEVEL_MILESTONES = [
  { level: 1, title: "Anak Kos Baru", minXP: 0 },
  { level: 2, title: "Mulai Rajin", minXP: 1000 },
  { level: 3, title: "Hemat Cilik", minXP: 3000 },
  { level: 5, title: "Si Nabung", minXP: 8000 },
  { level: 8, title: "Master Hemat", minXP: 20000 },
  { level: 10, title: "Sultan Anak Kos", minXP: 35000 },
];

// Fun comparison facts for savings
export const FUN_FACTS = [
  { amount: 50000, comparisons: ["2x kopi kenangan", "5x es teh", "1x nasi padang"] },
  { amount: 100000, comparisons: ["10x mie instan", "1x nonton bioskop", "5x parkir kampus"] },
  { amount: 200000, comparisons: ["1x tiket konser lokal", "20x gorengan", "1x game steam"] },
  { amount: 500000, comparisons: ["1x tiket konser internasional", "1x sepatu", "50x kopi"] },
  { amount: 1000000, comparisons: ["1x HP entry", "1x bulan kos", "100x mie ayam"] },
];

// Level-up rewards (unlockable themes)
export const LEVEL_REWARDS = [
  { level: 2, reward: "Theme: Dark Mode Plus", type: "THEME" },
  { level: 3, reward: "Icon pack: Mahasiswa", type: "ICON" },
  { level: 5, reward: "Theme: Pastel", type: "THEME" },
  { level: 8, reward: "Custom badge frame", type: "BADGE" },
  { level: 10, reward: "Theme: Sultan Kos", type: "THEME" },
];
