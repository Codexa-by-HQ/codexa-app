import { useTranslation } from "react-i18next";
import { Link, matchPath, NavLink, useLocation } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/core/components/AppLogo";
import { cn } from "@/core/lib/utils";
import type { TNavSection } from "@/core/types";
import { NavTree } from "./NavTree";
import { ProfileMenu } from "./ProfileMenu";
import { openSearch } from "./SearchCommand";

const SECTION_ROW =
  "h-auto min-h-12 gap-3 rounded-xl px-3 text-base font-medium hover:bg-accent/60 data-active:bg-accent [&_svg]:size-5";

/** The round menu button floating at the bottom start corner of a phone. */
export function MobileMenuButton() {
  const { t } = useTranslation();
  const { setOpenMobile } = useSidebar();
  return (
    <Button
      size="icon-lg"
      variant="outline"
      className="fixed bottom-5 start-5 z-30 size-14 rounded-full bg-background shadow-lg md:hidden"
      aria-label={t("shell.menu")}
      onClick={() => setOpenMobile(true)}
      data-shell="menu"
    >
      <HugeiconsIcon icon={Menu01Icon} className="size-6" />
    </Button>
  );
}

/**
 * The phone's navigation, inside the sidebar's sheet: every section. A
 * section with one page is a link. A section with more expands in place, so
 * its pages can be browsed before choosing.
 */
export function MobileNav({ sections, active }: { sections: TNavSection[]; active?: TNavSection }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);

  return (
    <>
      <SidebarHeader className="gap-4 p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <Link to="/" viewTransition onClick={close} aria-label={t("shell.product")}>
            <AppLogo className="size-9" />
          </Link>
          <ProfileMenu onBeforeOpen={close} />
        </div>
        <Button
          variant="outline"
          className="h-11 w-full justify-start rounded-xl bg-background/60 text-muted-foreground"
          onClick={() => {
            close();
            openSearch();
          }}
        >
          <HugeiconsIcon icon={Search01Icon} />
          {t("search.placeholder")}
        </Button>
      </SidebarHeader>

      <SidebarContent className="px-2 pb-24">
        <nav aria-label={t("shell.sections")}>
          <SidebarMenu className="gap-0.5">
            {sections.map((section) => {
              if (section.items.length > 1) {
                const current = section.key === active?.key;
                return (
                  <Collapsible
                    key={section.key}
                    defaultOpen={current}
                    render={<SidebarMenuItem className="flex flex-col gap-0.5" />}
                  >
                    <CollapsibleTrigger render={<SidebarMenuButton isActive={current} className={cn(SECTION_ROW, "group/section")} />}>
                      <HugeiconsIcon icon={section.icon} />
                      <span className="flex-1 text-start">{t(section.name)}</span>
                      <HugeiconsIcon
                        icon={ArrowDown01Icon}
                        className="size-4! transition-transform group-data-[panel-open]/section:rotate-180"
                      />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="ms-5">
                      <NavTree items={section.items} onNavigate={close} size="lg" guide />
                    </CollapsibleContent>
                  </Collapsible>
                );
              }
              const [page] = section.items;
              return (
                <SidebarMenuItem key={section.key}>
                  <SidebarMenuButton
                    isActive={matchPath({ path: page.to, end: page.end }, pathname) !== null}
                    render={<NavLink to={page.to} end={page.end} viewTransition onClick={close} />}
                    className={SECTION_ROW}
                  >
                    <HugeiconsIcon icon={section.icon} />
                    <span>{t(section.name)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </nav>
      </SidebarContent>
    </>
  );
}
