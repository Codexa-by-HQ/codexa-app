import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon } from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AppLogo } from "@/core/components/AppLogo";
import { IconButton } from "@/core/components/IconButton";
import { cn } from "@/core/lib/utils";
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
    <nav aria-label={t("shell.sections")} className="hidden w-16 shrink-0 flex-col items-center gap-2 py-3 md:flex">
      <Link to="/" viewTransition aria-label={t("shell.product")} className="mb-1 grid size-10 place-items-center">
        <AppLogo className="size-8" />
      </Link>
      <IconButton label={t("search.open")} tooltipSide="inline-end" size="icon" onClick={openSearch}>
        <HugeiconsIcon icon={Search01Icon} />
      </IconButton>
      <Separator className="my-1 w-8" />

      {sections.map((section) => {
        const current = section.key === active?.key;
        const label = t(section.name);
        return (
          <Tooltip key={section.key}>
            <TooltipTrigger
              render={
                <Link
                  to={section.items[0].to}
                  viewTransition
                  aria-label={label}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon" }),
                    "rounded-xl text-muted-foreground",
                    current && "bg-accent text-foreground",
                  )}
                />
              }
            >
              <HugeiconsIcon icon={section.icon} />
            </TooltipTrigger>
            <TooltipContent side="inline-end">{label}</TooltipContent>
          </Tooltip>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-1">
        <ProfileMenu />
      </div>
    </nav>
  );
}
