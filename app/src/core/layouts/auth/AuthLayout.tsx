import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { IconSvgElement } from "@hugeicons/react";
import {
  CheckListIcon,
  SquareLockPasswordIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import { BrandLogo } from "@/core/components/BrandLogo";
import { IconTile } from "@/core/components/IconTile";
import { PoweredBy } from "@/core/components/PoweredBy";
import { PreferenceControls } from "@/core/components/Preferences";
import { cn } from "@/lib/utils";

type AuthLayoutProps = {
  /** Icon in the tile beside the heading. */
  icon: IconSvgElement;
  /** The page's one `h1`, also used for the browser tab title. */
  heading: string;
  description?: ReactNode;
  /** Rendered under the content, such as "No account yet?". */
  footer?: ReactNode;
  children?: ReactNode;
};

/**
 * Codexa App pages shown before the dashboard, such as sign in: the content
 * beside a half width brand panel on desktop, and a compact branded header on
 * phones. It matches OAuth App and the setup wizard, so every official Codexa
 * screen looks like one product. Only the content area scrolls.
 */
export function AuthLayout({ icon, heading, description, footer, children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-dvh overflow-hidden lg:gap-2.5 lg:bg-frame lg:p-2.5">
      {/* React hoists this into the head, naming the tab without an effect. */}
      <title>{`${heading} · ${t("shell.product")}`}</title>
      <BrandPanel />

      <div className="relative isolate flex min-w-0 flex-1 flex-col overflow-hidden bg-background lg:rounded-frame lg:border">
        {/* Phones have no panel, so a faint halftone leaf sits behind the top. */}
        <div
          className="brand-panel-halftone animate-shine -inset-e-16 top-20 bottom-auto w-64 opacity-60 lg:hidden"
          aria-hidden="true"
        />

        <header className="flex h-14 shrink-0 items-center gap-2 px-4 max-lg:border-b max-lg:bg-background/80 max-lg:backdrop-blur sm:h-16 sm:px-6 lg:px-10">
          <div className="min-w-0 lg:hidden">
            <Brand />
          </div>
          <div className="ms-auto">
            <PreferenceControls />
          </div>
        </header>

        <main className="scroll-area min-h-0 flex-1 overflow-y-auto [view-transition-name:page]">
          <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-start px-4 pt-10 pb-8 sm:justify-center sm:px-6 sm:pt-0">
            <section className="flex animate-enter flex-col gap-8">
              <header className="stagger flex flex-col gap-3">
                <Item size="xs" className="p-0">
                  <IconTile icon={icon} className="sm:size-10" />
                  <ItemContent>
                    <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{heading}</h1>
                  </ItemContent>
                </Item>
                {description && (
                  <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
                )}
              </header>
              {children}
              {footer && (
                <p className="text-center text-sm text-muted-foreground">{footer}</p>
              )}
            </section>
          </div>
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t px-4 py-2.5 sm:px-6 lg:px-10 lg:py-3.5">
          <p className="truncate text-[11px] text-muted-foreground">
            {t("shell.copyright", { year: new Date().getFullYear() })}
          </p>
          <PoweredBy className="shrink-0" />
        </footer>
      </div>
    </div>
  );
}

function Brand({ size = "sm" }: { size?: "sm" | "lg" }) {
  const { t } = useTranslation();
  const large = size === "lg";

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <BrandLogo className={large ? "size-10" : "size-7"} />
      <div className="min-w-0 leading-tight">
        <p className={cn("truncate font-semibold whitespace-nowrap", large ? "text-base" : "text-sm")}>
          {t("shell.product")}
        </p>
        <p className="truncate text-xs whitespace-nowrap text-muted-foreground">
          {t("shell.subtitle")}
        </p>
      </div>
    </div>
  );
}

/** What Codexa App offers, shown on the brand panel. */
const PANEL_POINTS = [
  { key: "signIn", icon: SquareLockPasswordIcon },
  { key: "workspace", icon: UserGroupIcon },
  { key: "plugins", icon: CheckListIcon },
] as const;

/** The desktop brand panel, on the end side with the halftone leaf. */
function BrandPanel() {
  const { t } = useTranslation();

  return (
    <aside className="brand-panel order-last hidden w-1/2 max-w-3xl shrink-0 flex-col rounded-frame border px-12 py-7 text-foreground lg:flex xl:px-16">
      <div className="brand-panel-halftone animate-shine" aria-hidden="true" />
      <Brand size="lg" />
      <div className="scroll-area flex min-h-0 flex-1 flex-col justify-center overflow-y-auto py-10">
        <div className="flex animate-enter flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">
              {t("panel.title")}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("panel.description")}
            </p>
          </div>
          <ItemGroup className="stagger gap-4">
            {PANEL_POINTS.map(({ key, icon }) => (
              <Item key={key} role="listitem" size="xs" className="p-0">
                <IconTile icon={icon} tone="plain" size="sm" />
                <ItemContent>
                  <ItemTitle>{t(`panel.points.${key}.title`)}</ItemTitle>
                  <ItemDescription className="line-clamp-none text-start text-xs leading-relaxed">
                    {t(`panel.points.${key}.description`)}
                  </ItemDescription>
                </ItemContent>
              </Item>
            ))}
          </ItemGroup>
        </div>
      </div>
    </aside>
  );
}
