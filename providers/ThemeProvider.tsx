import React, { createContext, useCallback, useContext, useMemo } from "react";

export type ThemeColors = {
  background: string;
  surface: string;
  surfacePressed: string;
  border: string;
  inputBackground: string;

  text: string;
  textSecondary: string;
  textTertiary: string;

  accent: string;
  accentText: string;
  accentLight: string;

  cardShadow: string;

  statusSaved: string;
  statusApplied: string;
  statusInterview: string;
  statusOffer: string;
  statusRejected: string;

  info: string;
  infoLight: string;
  warning: string;
  warningLight: string;
  danger: string;
  dangerLight: string;
  success: string;
  successLight: string;
};

// ── Charcoal dark (was "defaultColors", now the real dark palette) ──
const darkColors: ThemeColors = {
  background: "#121212",
  surface: "#1C1C1C",
  surfacePressed: "#242424",
  border: "#2E2E2E",
  inputBackground: "#1A1A1A",

  text: "#F5F5F5",
  textSecondary: "#B3B3B3",
  textTertiary: "#808080",

  accent: "#2DD4BF",
  accentText: "#051614",
  accentLight: "rgba(45,212,191,0.18)",

  cardShadow: "rgba(0,0,0,0.65)",

  statusSaved: "#9CA3AF",
  statusApplied: "#60A5FA",
  statusInterview: "#A78BFA",
  statusOffer: "#34D399",
  statusRejected: "#F87171",

  info: "#60A5FA",
  infoLight: "rgba(96,165,250,0.16)",
  warning: "#FBBF24",
  warningLight: "rgba(251,191,36,0.16)",
  danger: "#FF5C7C",
  dangerLight: "rgba(255,92,124,0.16)",
  success: "#34D399",
  successLight: "rgba(52,211,153,0.16)",
};

const lightColors: ThemeColors = {
  background: "#F8F9FB",
  surface: "#FFFFFF",
  surfacePressed: "#F2F4F7",
  border: "#E5E7EB",
  inputBackground: "#F3F4F6",

  text: "#111827",
  textSecondary: "#4B5563",
  textTertiary: "#9CA3AF",

  accent: "#6EE7B7",
  accentText: "#111827",
  accentLight: "#BFF3DE",

  cardShadow: "rgba(0,0,0,0.18)",

  statusSaved: "#6B7280",
  statusApplied: "#3B82F6",
  statusInterview: "#A855F7",
  statusOffer: "#10B981",
  statusRejected: "#EF4444",

  info: "#3B82F6",
  infoLight: "#DBEAFE",
  warning: "#F59E0B",
  warningLight: "#FEF3C7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  success: "#10B981",
  successLight: "#D1FAE5",
};

type ThemeMode = "light" | "dark";

type ThemeContextValue = {
  colors: ThemeColors;
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ThemeMode>("dark");

  const colors = useMemo<ThemeColors>(() => {
    return mode === "dark" ? darkColors : lightColors;
  }, [mode]);

  const toggleTheme = useCallback(() => {
    setMode((m) => (m === "dark" ? "light" : "dark"));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ colors, mode, toggleTheme, setMode }),
    [colors, mode, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
