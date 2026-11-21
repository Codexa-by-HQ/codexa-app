import React from "react";
import { useTranslation } from "react-i18next";
import { Link, NavLink } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, Menu01Icon, Search01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { AppLogo } from "@/core/components/AppLogo";
import { cn } from "@/core/lib/utils";
import type { TNavSection } from "@/core/types";
import { NavTree } from "./NavTree";
import { ProfileMenu } from "./ProfileMenu";
import { openSearch } from "./SearchCommand";

const SECTION_ROW =
  "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-base font-medium transition-colors hover:bg-accent/60 [&_svg]:size-5";

/**
 * The phone's navigation: a round menu button floating at the bottom start
 * corner opens every section. A section with one page is a link. A section
 * with more expands in place, so its pages can be browsed before choosing.
 */
export function MobileNav({ sections, active }: { sections: TNavSection[]; active?: TNavSection }) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Button
        size="icon-lg"
        variant="outline"
        className="fixed bottom-5 start-5 z-30 size-14 rounded-full bg-background shadow-lg md:hidden"
        aria-label={t("shell.menu")}
        onClick={() => setOpen(true)}
        data-shell="menu"
      >
        <HugeiconsIcon icon={Menu01Icon} className="size-6" />
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={i18n.dir() === "rtl" ? "right" : "left"}
          closeLabel={t("common.close")}
          className="w-[86vw] max-w-sm gap-0 bg-sidebar p-0 text-sidebar-foreground [&>[data-slot=sheet-close]]:hidden"
        >
          <SheetTitle className="sr-only">{t("shell.menu")}</SheetTitle>
          <div className="flex items-center justify-between gap-2 p-4">
            <Link to="/" viewTransition onClick={close} aria-label={t("shell.product")}>
              <AppLogo className="size-9" />
            </Link>
            <ProfileMenu onBeforeOpen={close} />
          </div>

          <div className="px-4 pb-3">
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
          </div>

          <nav aria-label={t("shell.sections")} className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-24">
            {sections.map((section) =>
              section.items.length > 1
                ? (
                  <Collapsible key={section.key} defaultOpen={section.key === active?.key} className="flex flex-col gap-0.5">
                    <CollapsibleTrigger className={cn(SECTION_ROW, "group/section", section.key === active?.key && "bg-accent")}>
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
                )
                : (
                  <NavLink
                    key={section.key}
                    to={section.items[0].to}
                    end={section.items[0].end}
                    viewTransition
                    onClick={close}
                    className={({ isActive }) => cn(SECTION_ROW, isActive && "bg-accent")}
                  >
                    <HugeiconsIcon icon={section.icon} />
                    {t(section.name)}
                  </NavLink>
                )
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
