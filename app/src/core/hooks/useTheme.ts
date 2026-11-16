import { useSyncExternalStore } from "react";

import { themeStore } from "@/core/lib/theme";

/**
 * The chosen theme, what it resolves to right now, and a setter. Re-renders
 * when the choice, the system scheme or another tab changes it.
 */
export function useTheme() {
  const theme = useSyncExternalStore(themeStore.subscribe, themeStore.getPreference);
  const resolvedTheme = useSyncExternalStore(themeStore.subscribe, themeStore.getResolved);
  return { theme, resolvedTheme, setTheme: themeStore.set };
}
