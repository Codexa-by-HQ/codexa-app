import { createContext, type ReactNode } from "react";

export type ConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** Styles the confirm button as a destructive action. */
  destructive?: boolean;
  /**
   * Runs while the dialog shows a busy state. Throw or return false to keep
   * the dialog open, for example when the request failed.
   */
  onConfirm?: () => unknown | Promise<unknown>;
};

/** Resolves true when the user confirmed, false when they cancelled. */
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

/** Kept apart from the provider component, so fast refresh keeps working. */
export const ConfirmContext = createContext<Confirm | null>(null);
