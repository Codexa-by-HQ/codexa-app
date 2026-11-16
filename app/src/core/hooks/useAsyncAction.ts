import { useTransition } from "react";
import { toast } from "sonner";

type Messages = {
  /** Shown as a toast when the action throws. */
  error: string;
  /** Shown as a toast when the action succeeds. Optional, since navigation often says enough. */
  success?: string;
};

/**
 * Runs an async action inside a transition. The UI stays responsive, `pending`
 * tracks it for disabling buttons, and a failure becomes a toast instead of an
 * unhandled rejection.
 */
export function useAsyncAction<Args extends unknown[]>(
  action: (...args: Args) => Promise<unknown>,
  messages: Messages,
) {
  const [pending, startTransition] = useTransition();

  function run(...args: Args) {
    startTransition(async () => {
      try {
        await action(...args);
        if (messages.success) toast.success(messages.success);
      } catch {
        toast.error(messages.error);
      }
    });
  }

  return [run, pending] as const;
}
