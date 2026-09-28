"use client";

import * as React from "react";

export type AppTheme =
  | "glass"
  | "neobrutalist"
  | "skeuomorphic"
  | "ambient"
  | "magazine";

export interface ThemeInfo {
  id: AppTheme;
  label: string;
  description: string;
  emoji: string;
}

export const THEME_LIST: ThemeInfo[] = [
  {
    id: "glass",
    label: "Glassmorphism",
    description: "Modern, transparan, blur effect",
    emoji: "💎",
  },
  {
    id: "neobrutalist",
    label: "Neobrutalist",
    description: "Bold borders, hard shadows, raw",
    emoji: "🎨",
  },
  {
    id: "skeuomorphic",
    label: "Leather Wallet",
    description: "Tekstur kulit, kartu fisik, luxury",
    emoji: "💼",
  },
  {
    id: "ambient",
    label: "Ambient Mode",
    description: "Minimalis, 1 angka, particles",
    emoji: "🌙",
  },
  {
    id: "magazine",
    label: "Magazine",
    description: "Editorial, warm earth tones",
    emoji: "📰",
  },
];

const THEME_STORAGE_KEY = "dompetku:theme";

interface ThemeContextValue {
  theme: AppTheme;
  setTheme: (t: AppTheme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "glass",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<AppTheme>("glass");

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (saved && THEME_LIST.some((t) => t.id === saved)) {
        setThemeState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setTheme = React.useCallback((t: AppTheme) => {
    setThemeState(t);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, t);
    } catch {
      // ignore
    }
  }, []);

  const value = React.useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return React.useContext(ThemeContext);
}
