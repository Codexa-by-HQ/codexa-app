import { type ReactNode, useCallback, useRef, useState, useTransition } from "react";
import { useTranslation } from "react-i18next";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { type Confirm, ConfirmContext, type ConfirmOptions } from "./confirm";

/**
 * One confirmation dialog for the whole app. `await confirm({...})` resolves
 * once the user decides, so a page never mounts its own dialog.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  // The pending promise's resolver never affects rendering, so it is a ref.
  const resolver = useRef<((confirmed: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((next) => {
    // A newer request cancels one still open.
    resolver.current?.(false);
    setOptions(next);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  function close(confirmed: boolean) {
    resolver.current?.(confirmed);
    resolver.current = null;
    setOpen(false);
  }

  function handleConfirm() {
    if (!options?.onConfirm) return close(true);
    const action = options.onConfirm;
    startTransition(async () => {
      try {
        if ((await action()) !== false) close(true);
      } catch {
        // Stays open, so the user can retry or cancel.
      }
    });
  }

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          if (!next && !busy) close(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{options?.title}</AlertDialogTitle>
            {options?.description && (
              <AlertDialogDescription>{options.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <Button
              variant={options?.destructive ? "destructive" : "default"}
              disabled={busy}
              onClick={handleConfirm}
            >
              {busy && <Spinner />}
              {options?.confirmLabel ?? t("common.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext>
  );
}
