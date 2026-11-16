import { useContext } from "react";

import { ConfirmContext } from "@/core/context/confirm";

/** Ask the user to confirm an action. Resolves true when they did. */
export function useConfirm() {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside ConfirmProvider.");
  return confirm;
}
