import { createContext, type ReactNode } from "react";

export type SheetOptions = {
  title: string;
  description?: ReactNode;
  body: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
};

export type SheetApi = {
  open: (options: SheetOptions) => void;
  close: () => void;
};

/** Kept apart from the provider component, so fast refresh keeps working. */
export const SheetContext = createContext<SheetApi | null>(null);
