import type { CategoryInput } from "@/lib/types";

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

/** Palette options for category picker */
export const CATEGORY_COLORS = [
  "#10b981", // emerald
  "#22c55e", // green
  "#14b8a6", // teal
  "#06b6d4", // cyan
  "#0d9488", // teal-600
  "#84cc16", // lime
  "#eab308", // yellow
  "#f97316", // orange
  "#ef4444", // red
  "#f43f5e", // rose
  "#ec4899", // pink
  "#a855f7", // purple
  "#8b5cf6", // violet
  "#6366f1", // indigo (kept only as palette option)
  "#6b7280", // gray
];

/** Available Lucide icon names for category picker */
export const CATEGORY_ICONS = [
  "Wallet",
  "Gift",
  "TrendingUp",
  "Laptop",
  "PartyPopper",
  "PlusCircle",
  "UtensilsCrossed",
  "Car",
  "ShoppingBag",
  "ReceiptText",
  "Clapperboard",
  "HeartPulse",
  "GraduationCap",
  "Home",
  "Dumbbell",
  "MinusCircle",
  "Coffee",
  "Plane",
  "Bus",
  "Train",
  "Bike",
  "Phone",
  "Book",
  "Music",
  "Camera",
  "Gamepad2",
  "Baby",
  "Dog",
  "Cat",
  "PiggyBank",
  "CreditCard",
  "Banknote",
  "DollarSign",
  "Smartphone",
  "Zap",
  "Wrench",
  "Shirt",
  "Apple",
  "Pizza",
  "Cake",
  "Beer",
  "GlassWater",
  "Fuel",
  "Stethoscope",
  "Pill",
  "Briefcase",
  "Building2",
  "Landmark",
  "Calculator",
];
