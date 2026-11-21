import type { ReactNode } from "react";

import { Item, ItemGroup, ItemSeparator } from "@/components/ui/item";

export type TDetailRow = { key: string; label: string; value: ReactNode };

/**
 * Labelled values grouped in one bordered card, as every details sheet and
 * card shows them. A container query puts label and value side by side when
 * there is room and stacks them when there is not.
 */
export function DetailList({ title, rows }: { title?: string; rows: TDetailRow[] }) {
  return (
    <section className="flex flex-col gap-2">
      {title && <h3 className="px-1 text-xs font-medium text-muted-foreground">{title}</h3>}
      <ItemGroup aria-label={title} className="@container gap-0 overflow-hidden rounded-xl border bg-card">
        {rows.map((row, index) => (
          <div key={row.key} role="listitem">
            {index > 0 && <ItemSeparator className="my-0" />}
            <Item size="sm" className="flex-col items-stretch gap-1.5 rounded-none px-4 @xs:flex-row @xs:items-center">
              <span className="shrink-0 text-sm text-muted-foreground @xs:w-32">{row.label}</span>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 text-sm font-medium @xs:justify-end">
                {row.value}
              </div>
            </Item>
          </div>
        ))}
      </ItemGroup>
    </section>
  );
}
