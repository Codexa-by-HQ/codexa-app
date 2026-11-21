import React from "react";
import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, SidebarLeftIcon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { IconButton } from "@/core/components/IconButton";
import { PoweredBy } from "@/core/components/PoweredBy";
import { useDashboardNav } from "@/core/hooks/useDashboardNav";
import { IconRail } from "./IconRail";
import { IdentifiersMenu } from "./IdentifiersMenu";
import { MobileNav } from "./MobileNav";
import { PageBreadcrumb } from "./PageBreadcrumb";
import { ProfileMenu } from "./ProfileMenu";
import { openSearch, SearchCommand } from "./SearchCommand";
import { SectionSidebar } from "./SectionSidebar";
import { preferences } from "@/core/lib/utils";

/**
 * The signed in dashboard, laid out like an admin console: an icon rail of
 * sections, the active section's pages, and the page in a raised panel. On a
 * phone the rail and pages move into the menu sheet.
 */
/** Whether the section sidebar is collapsed, a per browser convenience. */
const COLLAPSED_KEY = "codexa-app:sidebar-collapsed";

const readCollapsed = () => preferences.get(COLLAPSED_KEY) === "1";

export function DashboardLayout() {
  const { t } = useTranslation();
  const { sections, active } = useDashboardNav();
  const [collapsed, setCollapsed] = React.useState(readCollapsed);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    preferences.set(COLLAPSED_KEY, next ? "1" : "0");
  };

  return (
    // On a desktop the window never scrolls: the rail and sidebar stay put and
    // only the page panel scrolls, under its header.
    <div className="flex min-h-svh bg-sidebar text-sidebar-foreground md:h-svh md:overflow-hidden">
      <IconRail sections={sections} active={active} />
      {active && !collapsed && (
        <SectionSidebar section={active} className="hidden w-60 shrink-0 overflow-y-auto py-3 pe-2 md:flex lg:w-64" />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col md:py-2 md:pe-2">
        <div className="flex min-h-0 flex-1 flex-col bg-background text-foreground md:overflow-hidden md:rounded-2xl md:border md:shadow-sm">
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur md:rounded-t-2xl sm:px-5">
            <IconButton
              label={t("shell.toggleSidebar")}
              className="hidden md:inline-flex"
              aria-pressed={!collapsed}
              onClick={toggleSidebar}
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
            <main className="stagger flex flex-1 flex-col gap-6 p-4 pb-24 [view-transition-name:page] sm:p-6 md:pb-6 lg:p-8">
              <Outlet />
            </main>
            <footer className="flex justify-end border-t px-4 py-3 sm:px-6 lg:px-8">
              <PoweredBy />
            </footer>
          </div>
        </div>
      </div>

      <MobileNav sections={sections} active={active} />
      <SearchCommand />
    </div>
  );
}
