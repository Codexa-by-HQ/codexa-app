import type { ComponentProps } from "react";
import leafUrl from "@/assets/codexa-leaf.png";
import { cn } from "@/lib/utils";

/** The Codexa leaf logo, a transparent PNG. public/favicon.png is the same mark. */
export function BrandLogo({ className, alt = "", ...props }: ComponentProps<"img">) {
  return (
    <img
      src={leafUrl}
      alt={alt}
      draggable={false}
      decoding="async"
      className={cn("size-8 shrink-0 object-contain select-none", className)}
      {...props}
    />
  );
}
