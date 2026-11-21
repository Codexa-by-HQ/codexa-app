import React from "react";

import type { TResolvedTheme, TTheme, TThemeContext } from "@/core/types";
import { preferences } from "@/core/lib/utils";

/**
 * The colour theme. Shared with OAuth App through one storage key on the
 * same origin, and with public/boot.js, which applies it before React loads.
 */

const STORAGE_KEY = "codexa-theme";
const THEMES: readonly TTheme[] = ["light", "dark", "system"];
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

const ThemeContext = React.createContext<TThemeContext | null>(null);
const handle = React.createRef<{ sync: () => void }>();

const isTheme = (value: unknown): value is TTheme => THEMES.includes(value as TTheme);

function readTheme(): TTheme {
  const value = preferences.get(STORAGE_KEY);
  return isTheme(value) ? value : "system";
}

function resolve(theme: TTheme): TResolvedTheme {
  if (theme !== "system") return theme;
  return systemDark.matches ? "dark" : "light";
}

function applyTheme(theme: TTheme) {
  const resolved = resolve(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.classList.toggle("light", resolved === "light");
}

// The operating system scheme, or a theme chosen in another tab, changed.
const sync = () => {
  applyTheme(readTheme());
  handle.current?.sync();
};
systemDark.addEventListener("change", sync);
window.addEventListener("storage", (event) => event.key === STORAGE_KEY && sync());

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState(readTheme);
  const [resolvedTheme, setResolvedTheme] = React.useState(() => resolve(theme));

  React.useImperativeHandle(handle, () => ({
    sync: () => {
      const next = readTheme();
      setThemeState(next);
      setResolvedTheme(resolve(next));
    },
  }), []);

  const value = React.useMemo<TThemeContext>(() => ({
    theme,
    resolvedTheme,
    setTheme: (next) => {
      preferences.set(STORAGE_KEY, next);
      applyTheme(next);
      setThemeState(next);
      setResolvedTheme(resolve(next));
    },
  }), [theme, resolvedTheme]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
