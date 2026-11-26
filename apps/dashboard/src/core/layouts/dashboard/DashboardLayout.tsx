import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, SidebarLeftIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Sidebar, SidebarInset, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { IconButton } from "@/core/components/IconButton";
import { PoweredBy } from "@/core/components/PoweredBy";
import { useDashboardNav } from "@/core/hooks/useDashboardNav";
import { IconRail } from "./IconRail";
import { IdentifiersMenu } from "./IdentifiersMenu";
import { MobileMenuButton, MobileNav } from "./MobileNav";
import { PageBreadcrumb } from "./PageBreadcrumb";
import { ProfileMenu } from "./ProfileMenu";
import { openSearch, SearchCommand } from "./SearchCommand";
import { SectionSidebar } from "./SectionSidebar";
import { cn, codexa, preferences } from "@/core/lib/utils";
import type { TNavSection } from "@/core/types";

/** Whether the section sidebar is collapsed, a per browser convenience. */
const COLLAPSED_KEY = "codexa-app:sidebar-collapsed";

const readCollapsed = () => preferences.get(COLLAPSED_KEY) === "1";

/**
 * The signed in dashboard, laid out like an admin console: an icon rail of
 * sections, the active section's pages, and the page in a raised panel. The
 * rail and the pages are one collapsible sidebar, which collapses to the rail.
 * On a phone it becomes the menu sheet.
 */
export function DashboardLayout() {
  const { t } = useTranslation();
  const { sections, active } = useDashboardNav();
  const [open, setOpen] = React.useState(() => !readCollapsed());

  const changeOpen = (next: boolean) => {
    setOpen(next);
    preferences.set(COLLAPSED_KEY, next ? "0" : "1");
  };

  return (
    // On a desktop the window never scrolls: the rail and sidebar stay put and
    // only the page panel scrolls, under its header.
    <SidebarProvider
      open={open && active !== undefined}
      onOpenChange={changeOpen}
      className="bg-sidebar text-sidebar-foreground [--section-width:15rem] md:h-svh md:overflow-hidden lg:[--section-width:16rem]"
      style={{ "--sidebar-width": "calc(4rem + var(--section-width))", "--sidebar-width-icon": "4rem" } as React.CSSProperties}
    >
      <AppSidebar sections={sections} active={active} />

      <SidebarInset className="min-h-0 min-w-0 text-foreground md:my-2 md:me-2 md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:rounded-t-2xl sm:px-5">
          <IconButton
            label={t("shell.toggleSidebar")}
            className="hidden md:inline-flex"
            aria-pressed={open}
            onClick={() => changeOpen(!open)}
          >
            <HugeiconsIcon icon={SidebarLeftIcon} className="rtl:-scale-x-100" />
          </IconButton>
          <PageBreadcrumb section={active} />
          <div className="ms-auto flex items-center gap-1">
            {/* An icon that opens into the search field on hover or focus. */}
            <Button
              variant="ghost"
              size="sm"
              aria-label={t("search.open")}
              onClick={openSearch}
              className="group hidden w-9 justify-start gap-2 overflow-hidden rounded-full px-2.5 text-muted-foreground transition-[width,background-color] duration-300 ease-out hover:w-60 hover:bg-muted focus-visible:w-60 focus-visible:bg-muted motion-reduce:transition-none lg:flex"
            >
              <HugeiconsIcon icon={Search01Icon} className="shrink-0" />
              <span className="whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                {t("search.placeholder")}
              </span>
              <Kbd className="ms-auto opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">Ctrl K</Kbd>
            </Button>
            <IconButton label={t("search.open")} className="lg:hidden" onClick={openSearch}>
              <HugeiconsIcon icon={Search01Icon} />
            </IconButton>
            <IdentifiersMenu />
            <div className="md:hidden">
              <ProfileMenu />
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col md:overflow-y-auto">
          {/* Each page's sections rise in one by one, and route changes cross fade. */}
          <div className={cn(codexa.stagger, "flex flex-1 flex-col gap-6 p-4 pb-24 [view-transition-name:page] sm:p-6 md:pb-6 lg:p-8")}>
            <Outlet />
          </div>
          <footer className="flex justify-end border-t px-4 py-3 sm:px-6 lg:px-8">
            <PoweredBy />
          </footer>
        </div>
      </SidebarInset>

      <MobileMenuButton />
      <SearchCommand />
    </SidebarProvider>
  );
}

/**
 * The rail beside the active section's pages on a desktop, collapsing to the
 * rail. On a phone, the same sidebar is a sheet holding every section.
 */
function AppSidebar({ sections, active }: { sections: TNavSection[]; active?: TNavSection }) {
  const { t, i18n } = useTranslation();
  const { isMobile, open } = useSidebar();
  const rtl = i18n.dir() === "rtl";

  return (
    <Sidebar
      collapsible="icon"
      side={rtl ? "right" : "left"}
      dir={i18n.dir()}
      label={t("shell.menu")}
      className="overflow-hidden group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0 *:data-[sidebar=sidebar]:flex-row"
      mobileClassName="w-[86vw] max-w-sm"
    >
      {isMobile
        ? <MobileNav sections={sections} active={active} />
        : (
          <>
            <IconRail sections={sections} active={active} />
            {active && open && <SectionSidebar section={active} />}
          </>
        )}
    </Sidebar>
  );
}
