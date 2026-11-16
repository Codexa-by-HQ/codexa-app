import { useTranslation } from "react-i18next";
import { NavLink, useMatch } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { AppLogo } from "@/core/components/AppLogo";
import { type NavItem, navigation } from "@/core/lib/routes";
import { NavUser } from "./NavUser";

/** Groups in first appearance order. Ungrouped routes form the first group. */
const groups = Map.groupBy(navigation, (item) => item.group ?? "");

/** The dashboard sidebar. It collapses to icons, with names as tooltips. */
export function AppSidebar() {
  const { t, i18n } = useTranslation();
  // On a phone the sidebar is a sheet, so following a link closes it.
  const { setOpenMobile } = useSidebar();
  const close = () => setOpenMobile(false);

  return (
    // The sidebar is fixed to a physical edge, so it follows the reading
    // direction to stay at the start of the page.
    <Sidebar collapsible="icon" side={i18n.dir() === "rtl" ? "right" : "left"}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<NavLink to="/" viewTransition onClick={close} />}>
              <AppLogo className="size-8" />
              <div className="grid flex-1 text-start leading-tight">
                <span className="truncate text-sm font-semibold">{t("shell.product")}</span>
                <span className="truncate text-xs text-muted-foreground">{t("shell.subtitle")}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {[...groups].map(([group, items]) => (
          <SidebarGroup key={group || "main"}>
            <SidebarGroupLabel>{t(group || "nav.workspace")}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => <NavEntry key={item.key} item={item} onNavigate={close} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail aria-label={t("shell.toggleSidebar")} title={t("shell.toggleSidebar")} />
    </Sidebar>
  );
}

function NavEntry({ item, onNavigate }: { item: NavItem; onNavigate: () => void }) {
  const { t } = useTranslation();
  const active = useMatch({ path: item.to, end: item.end }) !== null;
  const label = t(item.name);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={label}
        render={<NavLink to={item.to} end={item.end} viewTransition onClick={onNavigate} />}
      >
        {item.icon && <HugeiconsIcon icon={item.icon} />}
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
