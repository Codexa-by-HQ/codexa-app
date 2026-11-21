import React from "react";
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
import type { TConfirm, TConfirmOptions } from "@/core/types";

/**
 * One confirmation dialog for the whole app. `ConfirmHost` renders it once at
 * the root, and `await confirm({...})` resolves true once the user confirms.
 */

const handle = React.createRef<{ confirm: TConfirm }>();

export const confirm: TConfirm = (options) =>
  handle.current?.confirm(options) ?? Promise.resolve(false);

export const useConfirm = () => confirm;

export function ConfirmHost() {
  const { t } = useTranslation();
  const [options, setOptions] = React.useState<TConfirmOptions | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [busy, startTransition] = React.useTransition();
  const resolver = React.useRef<((confirmed: boolean) => void) | null>(null);

  React.useImperativeHandle(handle, () => ({
    confirm: (next) => {
      // A newer request cancels one still open.
      resolver.current?.(false);
      setOptions(next);
      setIsOpen(true);
      return new Promise<boolean>((resolve) => {
        resolver.current = resolve;
      });
    },
  }), []);

  const close = (confirmed: boolean) => {
    resolver.current?.(confirmed);
    resolver.current = null;
    setIsOpen(false);
  };

  const handleConfirm = () => {
    const action = options?.onConfirm;
    if (!action) return close(true);
    startTransition(async () => {
      try {
        if ((await action()) !== false) close(true);
      } catch {
        // Stays open, so the user can retry or cancel.
      }
    });
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(next) => !next && !busy && close(false)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          {options?.description && <AlertDialogDescription>{options.description}</AlertDialogDescription>}
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
  );
}
