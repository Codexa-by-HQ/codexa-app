import React from "react";
import { useTranslation } from "react-i18next";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IconTile } from "@/core/components/IconTile";
import { cn } from "@/core/lib/utils";
import type { TSheetHandle, TSheetOptions } from "@/core/types";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * The app's one sheet, for create and edit forms and details. `SheetHost`
 * renders it once and exposes open and close through its handle, so any page
 * calls `sheet.open(...)`. On a desktop it floats in from the end edge. On a
 * phone it rises from the bottom, snaps to a quarter, half, three quarters or
 * full height, scrolls long content inside, and closes when dragged down.
 * Forms end in `SheetActions`, which stays at the bottom while the body scrolls.
 */

const handle = React.createRef<TSheetHandle>();

export const sheet: TSheetHandle = {
  open: (options) => handle.current?.open(options),
  close: () => handle.current?.close(),
};

export const useSheet = () => sheet;

const SNAP_POINTS = [0.25, 0.5, 0.75, 1];

/** The scrolling body. Its padding is what `SheetActions` reaches past. */
const BODY = "flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6";

export function SheetHost() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const [options, setOptions] = React.useState<TSheetOptions | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const title = React.useRef<HTMLHeadingElement>(null);

  React.useImperativeHandle(handle, () => ({
    open: (next) => {
      setOptions(next);
      setIsOpen(true);
    },
    // The content stays, so the closing animation still has something to show.
    close: () => setIsOpen(false),
  }), []);

  const heading = (Title: typeof SheetTitle | typeof DrawerTitle, Description: typeof SheetDescription | typeof DrawerDescription) =>
    options && (
      <div className="flex items-start gap-3 pe-8">
        {options.icon && <IconTile icon={options.icon} />}
        <div className="flex min-w-0 flex-col gap-1">
          <Title ref={title} tabIndex={-1} className="truncate text-base font-semibold outline-none">
            {options.title}
          </Title>
          {options.description && <Description className="text-sm">{options.description}</Description>}
        </div>
      </div>
    );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen} snapPoints={SNAP_POINTS} defaultSnapPoint={0.75} showSwipeHandle>
        <DrawerContent className="max-h-dvh">
          <DrawerHeader className="border-b px-5 pt-2 pb-4 text-start">{heading(DrawerTitle, DrawerDescription)}</DrawerHeader>
          {options && <div className={BODY}>{options.body}</div>}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    // Only the close button or Escape closes it, so a stray click never loses a form.
    <Sheet open={isOpen} onOpenChange={setIsOpen} disablePointerDismissal>
      <SheetContent
        side={i18n.dir() === "rtl" ? "left" : "right"}
        initialFocus={title}
        closeLabel={t("common.close")}
        // Floats inside the window like the dashboard panel, rather than hugging the edge.
        className={cn(
          "gap-0 overflow-hidden rounded-2xl border shadow-2xl data-[side=left]:inset-y-2 data-[side=left]:left-2 data-[side=left]:h-auto data-[side=right]:inset-y-2 data-[side=right]:right-2 data-[side=right]:h-auto w-[calc(100%-1rem)]",
          options?.wide ? "sm:max-w-2xl!" : "data-[side=left]:sm:max-w-lg data-[side=right]:sm:max-w-lg",
        )}
      >
        <SheetHeader className="border-b px-6 py-5">{heading(SheetTitle, SheetDescription)}</SheetHeader>
        {options && <div className={BODY}>{options.body}</div>}
      </SheetContent>
    </Sheet>
  );
}

/**
 * The bottom bar of a form in the sheet, kept in view while the body scrolls.
 * It reaches past the body's padding so its border spans the sheet.
 */
export function SheetActions({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky -bottom-5 z-10 -mx-5 mt-auto -mb-5 flex flex-wrap items-center justify-end gap-2 border-t bg-popover/95 px-5 py-4 backdrop-blur sm:-mx-6 sm:px-6">
      {children}
    </div>
  );
}
