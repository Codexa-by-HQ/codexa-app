import { useContext } from "react";

import { SheetContext } from "@/core/context/sheet";

/** Open or close the app's single sheet from anywhere under SheetProvider. */
export function useSheet() {
  const api = useContext(SheetContext);
  if (!api) throw new Error("useSheet must be used inside SheetProvider.");
  return api;
}
