import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cva, type VariantProps } from "class-variance-authority";

import { ItemMedia } from "@/components/ui/item";
import { cn } from "@/core/lib/utils";

const tileVariants = cva("grid shrink-0 place-items-center ring-1", {
  variants: {
    tone: {
      /** Tinted with the primary colour, for headings and highlights. */
      primary: "bg-primary/10 text-primary ring-primary/20",
      /** Neutral, for lists on the brand panel. */
      plain: "bg-background text-primary ring-border",
    },
    size: {
      sm: "size-8 rounded-lg [&_svg]:size-4",
      md: "size-9 rounded-xl [&_svg]:size-4.5",
      lg: "size-12 rounded-2xl [&_svg]:size-6",
    },
  },
  defaultVariants: { tone: "primary", size: "md" },
});

/**
 * The icon tile of the Codexa design system. It is shadcn's ItemMedia, so it
 * lines up with ItemContent inside an Item, and one definition keeps every
 * tile the same.
 */
export function IconTile({
  icon,
  tone,
  size,
  className,
}: { icon: IconSvgElement; className?: string } & VariantProps<typeof tileVariants>) {
  return (
    <ItemMedia variant="icon" className={cn(tileVariants({ tone, size }), className)}>
      <HugeiconsIcon icon={icon} aria-hidden="true" />
    </ItemMedia>
  );
}
