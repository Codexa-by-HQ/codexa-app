import { type ReactNode, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SheetContext, type SheetOptions } from "./sheet";

/**
 * One sheet for the whole app. Any page opens it with `useSheet().open(...)`
 * instead of mounting its own, so there is a single focus trap and every
 * sheet looks the same.
 */
export function SheetProvider({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const [options, setOptions] = useState<SheetOptions | null>(null);
  // Focus lands on the title, so screen readers announce the sheet and no
  // field inside it opens looking focused.
  const title = useRef<HTMLHeadingElement>(null);
  // The end edge of the reading direction, so Arabic and Urdu open from the left.
  const end = i18n.dir() === "rtl" ? "left" : "right";
  const [open, setOpen] = useState(false);

  // Stable, so components that only open the sheet never re-render with it.
  const api = useMemo(
    () => ({
      open(next: SheetOptions) {
        setOptions(next);
        setOpen(true);
      },
      close: () => setOpen(false),
    }),
    [],
  );

  return (
    <SheetContext value={api}>
      {children}
      <Sheet open={open} onOpenChange={setOpen}>
        {/* The content stays after closing, so the exit animation has something to show. */}
        <SheetContent
          side={options?.side ?? end}
          initialFocus={title}
          closeLabel={t("common.close")}
          className="w-full sm:max-w-md"
        >
          {options && (
            <>
              <SheetHeader>
                <SheetTitle ref={title} tabIndex={-1} className="outline-none">
                  {options.title}
                </SheetTitle>
                {options.description && (
                  <SheetDescription>{options.description}</SheetDescription>
                )}
              </SheetHeader>
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
                {options.body}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </SheetContext>
  );
}
