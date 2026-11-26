import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/core/components/AppLogo";
import { IconButton } from "@/core/components/IconButton";
import type { TNavSection } from "@/core/types";
import { ProfileMenu } from "./ProfileMenu";
import { openSearch } from "./SearchCommand";

/**
 * The narrow rail: the logo, search, one icon per section, then the profile
 * menu, which holds language and appearance. Every icon is named by its tooltip.
 */
export function IconRail({ sections, active }: { sections: TNavSection[]; active?: TNavSection }) {
  const { t } = useTranslation();

  return (
    <Sidebar collapsible="none" className="w-(--sidebar-width-icon) shrink-0 border-e border-sidebar-border">
      <nav aria-label={t("shell.sections")} className="flex h-full flex-col items-center gap-2 py-3">
        <SidebarHeader className="items-center gap-2 p-0">
          <Link to="/" viewTransition aria-label={t("shell.product")} className="mb-1 grid size-10 place-items-center">
            <AppLogo className="size-8" />
          </Link>
          <IconButton label={t("search.open")} tooltipSide="inline-end" size="icon" onClick={openSearch}>
            <HugeiconsIcon icon={Search01Icon} />
          </IconButton>
        </SidebarHeader>
        <SidebarSeparator className="mx-0 my-1 w-8" />

        <SidebarContent className="w-full items-center">
          <SidebarMenu className="items-center gap-2">
            {sections.map((section) => {
              const label = t(section.name);
              return (
                <SidebarMenuItem key={section.key}>
                  <SidebarMenuButton
                    isActive={section.key === active?.key}
                    tooltip={{ children: label, hidden: false }}
                    aria-label={label}
                    render={<Link to={section.items[0].to} viewTransition />}
                    className="size-9 justify-center rounded-xl p-0 text-muted-foreground group-data-[collapsible=icon]:size-9! group-data-[collapsible=icon]:p-0! data-active:bg-accent data-active:font-normal data-active:text-foreground"
                  >
                    <HugeiconsIcon icon={section.icon} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="items-center p-0">
          <ProfileMenu />
        </SidebarFooter>
      </nav>
    </Sidebar>
  );
}
