import type { ComponentProps, ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type IconButtonProps = Omit<ComponentProps<typeof Button>, "aria-label" | "children"> & {
  /** Read by screen readers and shown as the tooltip, so both always match. */
  label: string;
  children: ReactNode;
};

/** An icon only button whose purpose is named by a tooltip and aria-label. */
export function IconButton({ label, children, ...props }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label={label} {...props}>
            {children}
          </Button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
