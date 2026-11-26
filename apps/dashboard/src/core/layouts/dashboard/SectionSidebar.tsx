import React from "react";
import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import type { TNavSection } from "@/core/types";
import { NavTree } from "./NavTree";

/**
 * The second column: the active section's pages, with a filter for sections
 * long enough to need one.
 */
export function SectionSidebar({ section }: { section: TNavSection }) {
  const { t } = useTranslation();
  const [filter, setFilter] = React.useState("");
  const query = filter.trim().toLocaleLowerCase();
  const items = query ? section.items.filter((item) => t(item.name).toLocaleLowerCase().includes(query)) : section.items;

  return (
    <Sidebar collapsible="none" className="w-auto min-w-0 flex-1">
      <nav aria-label={t(section.name)} className="flex min-h-0 flex-1 flex-col gap-3 py-3 pe-2">
        <SidebarHeader className="gap-3 p-0">
          <p className="px-3 pt-1 text-sm font-semibold">{t(section.name)}</p>

          {section.items.length > 6 && (
            <InputGroup className="mx-1 w-auto">
              <InputGroupAddon>
                <HugeiconsIcon icon={Search01Icon} />
              </InputGroupAddon>
              <InputGroupInput
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder={t("search.section", { section: t(section.name) })}
                aria-label={t("search.section", { section: t(section.name) })}
              />
            </InputGroup>
          )}
        </SidebarHeader>

        <SidebarContent className="pb-2">
          <NavTree items={items} searching={query !== ""} />
        </SidebarContent>
      </nav>
    </Sidebar>
  );
}
