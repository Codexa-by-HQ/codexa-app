import { useSyncExternalStore } from "react";

import { type BrandedApplication, brandingStore } from "@/core/lib/branding";

/** The application this page is branded for, or null on Codexa's own pages. */
export function useBranding(): BrandedApplication | null {
  return useSyncExternalStore(brandingStore.subscribe, brandingStore.getSnapshot);
}
