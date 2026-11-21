import { useRef, useState } from "react";

import { copyText } from "@/core/lib/utils";

/** Copy text to the clipboard, and report it for a moment so a button can show a check. */
export function useCopy(resetAfterMs = 1500) {
  const [copied, setCopied] = useState(false);
  // The reset timer never affects rendering, so it lives in a ref.
  const timer = useRef<number | undefined>(undefined);

  async function copy(text: string) {
    await copyText(text);
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), resetAfterMs);
  }

  return { copy, copied };
}
