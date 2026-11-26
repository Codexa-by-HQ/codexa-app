import { useTranslation } from "react-i18next";
import { matchPath, NavLink, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { cn } from "@/core/lib/utils";
import type { TNavItem } from "@/core/types";

/**
 * A section's pages: ungrouped pages first as plain rows, then each group as
 * a closed folder whose pages hang from a guide line. Only the group holding
 * the current page starts open, and a search opens every group it matches.
 * With `guide`, as in the phone menu, the section's own pages and groups
 * hang from a guide line too, so the path from the section to the current
 * page reads as one line.
 */
export function NavTree({
  items,
  searching = false,
  onNavigate,
  size = "md",
  guide = false,
}: {
  items: TNavItem[];
  searching?: boolean;
  onNavigate?: () => void;
  size?: "md" | "lg";
  guide?: boolean;
}) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isCurrent = (item: TNavItem) => matchPath({ path: item.to, end: item.end }, pathname) !== null;
  const groups = Map.groupBy(items, (item) => item.group ?? "");
  const loose = groups.get("") ?? [];
  const grouped = [...groups].filter(([group]) => group);
  // The top level in order, loose pages then groups, for the guide line.
  const holding = [...loose.map(isCurrent), ...grouped.map(([, entries]) => entries.some(isCurrent))];
  const currentTop = holding.indexOf(true);
  const lastTop = holding.length - 1;
  const lineAt = (index: number): keyof typeof LINE | undefined =>
    !guide ? undefined : currentTop < 0 || index > currentTop ? "after" : index < currentTop ? "before" : "current";

  return (
    <SidebarMenu className={guide ? "gap-0" : "gap-0.5"}>
      {loose.map((item, index) => (
        <SidebarMenuItem key={item.key}>
          <NavRow
            item={item}
            active={isCurrent(item)}
            onNavigate={onNavigate}
            size={size}
            line={lineAt(index)}
            last={index === lastTop}
          />
        </SidebarMenuItem>
      ))}

      {grouped.map(([group, entries], position) => {
        const current = entries.findIndex(isCurrent);
        const holdsCurrent = current >= 0;
        const index = loose.length + position;
        const line = lineAt(index);
        return (
          <Collapsible
            // Remounted when a search starts or ends, so its open state resets.
            key={`${group}:${searching}`}
            defaultOpen={searching || holdsCurrent}
            render={
              <SidebarMenuItem
                className={cn(
                  "flex flex-col",
                  line && GROUP_LINE[size][line],
                  line === "current" && index !== lastTop && GROUP_LINE[size].onward,
                )}
              />
            }
          >
            <CollapsibleTrigger
              render={
                <SidebarMenuButton
                  className={cn(
                    "group/trigger relative h-auto gap-2 rounded-lg py-0 text-muted-foreground hover:bg-transparent hover:text-foreground active:bg-transparent",
                    guide ? "ps-5 pe-3" : "px-3",
                    size === "lg" ? "min-h-11 text-[0.9375rem]" : "min-h-9 text-sm",
                    holdsCurrent && "font-medium text-foreground",
                  )}
                />
              }
            >
              {/* Closed, a bar marks the group holding the current page, unless
                  the guide line already leads to it. Open, a connector runs from
                  under the label into the pages' guide line. */}
              {holdsCurrent && !guide && (
                <span aria-hidden="true" className="absolute inset-y-2 start-0 w-0.5 rounded-full bg-primary group-data-[panel-open]/trigger:hidden" />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-[calc(50%+0.625rem)] bottom-0 hidden group-data-[panel-open]/trigger:block",
                  guide ? "start-6" : "start-4",
                  holdsCurrent ? "border-s-2 border-primary" : "border-s border-border",
                )}
              />
              <span className="flex-1 text-start">{t(group)}</span>
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                className="size-4 transition-transform ltr:-rotate-90 rtl:rotate-90 group-data-[panel-open]/trigger:rotate-0!"
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarMenuSub className={cn("mx-0 translate-x-0 gap-0 border-s-0 px-0 py-0", guide ? "ms-6" : "ms-4")}>
                {entries.map((item, index) => (
                  <SidebarMenuSubItem key={item.key}>
                    <NavRow
                      item={item}
                      active={index === current}
                      onNavigate={onNavigate}
                      size={size}
                      line={!holdsCurrent || index > current ? "after" : index < current ? "before" : "current"}
                      last={index === entries.length - 1}
                      sub
                    />
                  </SidebarMenuSubItem>
                ))}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </SidebarMenu>
  );
}

/**
 * Each nested row draws its own part of the guide line: in the primary colour
 * from the group down to the current page, which a rounded elbow joins, and in
 * the border colour after it.
 */
const LINE = {
  before: "before:absolute before:inset-y-0 before:start-0 before:border-s-2 before:border-primary",
  current:
    "before:absolute before:start-0 before:top-0 before:h-1/2 before:w-3 before:rounded-es-lg before:border-s-2 before:border-b-2 before:border-primary",
  after: "before:absolute before:inset-y-0 before:start-0 before:border-s before:border-border",
};

/**
 * The guide line beside a whole group, its pages included, at the top level of
 * a guided tree. The elbow meets the middle of the group's own row.
 */
const GROUP_LINE = {
  md: {
    ...LINE,
    current:
      "before:absolute before:start-0 before:top-0 before:h-4.5 before:w-3 before:rounded-es-lg before:border-s-2 before:border-b-2 before:border-primary",
    onward: "after:absolute after:start-0 after:top-4.5 after:bottom-0 after:border-s after:border-border",
  },
  lg: {
    ...LINE,
    current:
      "before:absolute before:start-0 before:top-0 before:h-5.5 before:w-3 before:rounded-es-lg before:border-s-2 before:border-b-2 before:border-primary",
    onward: "after:absolute after:start-0 after:top-5.5 after:bottom-0 after:border-s after:border-border",
  },
};

/**
 * A page link. Inside a group or on a guide line it has no pill and the
 * current page is bold. A row inside a group is a sub menu button.
 */
function NavRow({
  item,
  active,
  onNavigate,
  size,
  line,
  last,
  sub = false,
}: {
  item: TNavItem;
  active: boolean;
  onNavigate?: () => void;
  size: "md" | "lg";
  /** Where the row sits on its group's guide line, for nested rows. */
  line?: keyof typeof LINE;
  last?: boolean;
  sub?: boolean;
}) {
  const { t } = useTranslation();
  const nested = line !== undefined;
  const Row = sub ? SidebarMenuSubButton : SidebarMenuButton;
  return (
    <Row
      isActive={active}
      render={<NavLink to={item.to} end={item.end} viewTransition onClick={onNavigate} />}
      className={cn(
        "relative h-auto gap-2.5 py-0 text-muted-foreground hover:text-foreground",
        size === "lg" ? "min-h-11 text-[0.9375rem]" : "min-h-9 text-sm",
        nested
          ? "translate-x-0 rounded-none ps-5 pe-3 hover:bg-transparent active:bg-transparent data-active:bg-transparent"
          : "rounded-lg px-3 hover:bg-accent/60 data-active:bg-accent",
        "data-active:font-medium data-active:text-foreground",
        line && LINE[line],
        // The line carries on past the current page, unless it ends the group.
        line === "current" && !last && "after:absolute after:start-0 after:top-1/2 after:bottom-0 after:border-s after:border-border",
      )}
    >
      <span className="truncate">{t(item.name)}</span>
    </Row>
  );
}
