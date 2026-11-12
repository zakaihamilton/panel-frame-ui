"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ThemeSelect, type ThemeChoice } from "./theme-select.js";
import type { ThemePersistence, ThemeSystemMode } from "./theme-types.js";

type ThemeContextValue = {
  theme: ThemeChoice;
  setTheme: (theme: ThemeChoice) => void;
};

const defaultPersistence: ThemePersistence = {
  type: "localStorage",
  key: "panel-frame-theme",
};
const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemeChoice(value: string | null | undefined): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

function readTheme(persistence: ThemePersistence): ThemeChoice | null {
  try {
    if (persistence.type === "localStorage") {
      const stored = window.localStorage.getItem(persistence.key);
      return isThemeChoice(stored) ? stored : null;
    }
    if (persistence.type === "cookie") {
      const prefix = `${encodeURIComponent(persistence.name)}=`;
      const entry = document.cookie
        .split(";")
        .map((item) => item.trim())
        .find((item) => item.startsWith(prefix));
      const stored = entry
        ? decodeURIComponent(entry.slice(prefix.length))
        : null;
      return isThemeChoice(stored) ? stored : null;
    }
  } catch {
    return null;
  }
  return null;
}

function applyTheme(theme: ThemeChoice, systemMode: ThemeSystemMode) {
  const applied =
    theme === "system" && systemMode === "resolved"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.dataset.theme = applied;
}

function saveTheme(theme: ThemeChoice, persistence: ThemePersistence) {
  try {
    if (persistence.type === "localStorage") {
      window.localStorage.setItem(persistence.key, theme);
    } else if (persistence.type === "cookie") {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      const maxAge = persistence.maxAge ?? 31_536_000;
      // biome-ignore lint/suspicious/noDocumentCookie: This synchronous fallback works in browsers without the Cookie Store API.
      document.cookie = `${encodeURIComponent(persistence.name)}=${encodeURIComponent(theme)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
    }
  } catch {
    // The selected theme still applies for this page when storage is unavailable.
  }
}

export function ThemeProvider({
  children,
  initialTheme = "system",
  persistence = defaultPersistence,
  systemMode = "system",
  onThemeChange,
}: {
  children: ReactNode;
  initialTheme?: ThemeChoice;
  persistence?: ThemePersistence;
  systemMode?: ThemeSystemMode;
  onThemeChange?: (theme: ThemeChoice) => void;
}) {
  const [theme, setThemeState] = useState<ThemeChoice>(initialTheme);
  useEffect(() => {
    const stored = readTheme(persistence);
    const nextTheme = stored ?? initialTheme;
    setThemeState(nextTheme);
    applyTheme(nextTheme, systemMode);
    onThemeChange?.(nextTheme);

    if (persistence.type !== "localStorage") return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== persistence.key && event.key !== null) return;
      const next = isThemeChoice(event.newValue)
        ? event.newValue
        : initialTheme;
      setThemeState(next);
      applyTheme(next, systemMode);
      onThemeChange?.(next);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [initialTheme, onThemeChange, persistence, systemMode]);

  useEffect(() => {
    if (theme !== "system" || systemMode !== "resolved") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      applyTheme("system", systemMode);
      onThemeChange?.("system");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [onThemeChange, systemMode, theme]);

  const setTheme = useCallback(
    (nextTheme: ThemeChoice) => {
      setThemeState(nextTheme);
      applyTheme(nextTheme, systemMode);
      onThemeChange?.(nextTheme);
      saveTheme(nextTheme, persistence);
    },
    [onThemeChange, persistence, systemMode],
  );
  const contextValue = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within a ThemeProvider.");
  return value;
}

export function ThemeControl({
  label = "Theme",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <ThemeSelect
      className={className}
      label={label}
      onChange={setTheme}
      value={theme}
    />
  );
}
