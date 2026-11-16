/**
 * The colour theme as an external store, read with useSyncExternalStore.
 *
 * The preference lives in localStorage and the system scheme in a media query,
 * both outside React. Keeping them here, rather than in component state synced
 * by effects, means one source of truth and no stale renders. The `<html>`
 * class is updated right here, so no component has to do it.
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

/** Shared with public/boot.js, which applies the theme before React loads. */
const STORAGE_KEY = "codexa-app-theme";
const THEMES: readonly Theme[] = ["light", "dark", "system"];

const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();

function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

function readPreference(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : "system";
  } catch {
    // Storage can be blocked. The system scheme is a safe default.
    return "system";
  }
}

let preference = readPreference();

function resolved(): ResolvedTheme {
  if (preference !== "system") return preference;
  return systemDark.matches ? "dark" : "light";
}

/** Apply the theme to the page, then let subscribed components re-render. */
function publish() {
  const root = document.documentElement;
  const theme = resolved();
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  for (const listener of listeners) listener();
}

// Follow the operating system while the preference is "system".
systemDark.addEventListener("change", () => {
  if (preference === "system") publish();
});

// Follow a change made in another tab.
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  preference = isTheme(event.newValue) ? event.newValue : "system";
  publish();
});

export const themeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getPreference: (): Theme => preference,
  getResolved: resolved,
  set(next: Theme) {
    preference = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The choice still applies for this page view.
    }
    publish();
  },
};
