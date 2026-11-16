import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  InformationCircleIcon,
  Logout03Icon,
  UnfoldMoreIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SessionDetails } from "@/core/components/SessionDetails";
import { useSignOut } from "@/core/hooks/useSignOut";
import { useSessionInfo } from "@/core/hooks/useSession";
import { useSheet } from "@/core/hooks/useSheet";

/** The signed in user at the foot of the sidebar, with session actions. */
export function NavUser() {
  const { t } = useTranslation();
  const info = useSessionInfo();
  const sheet = useSheet();
  const signOut = useSignOut();
  const { setOpenMobile } = useSidebar();
  const app = info.application?.name ?? t("session.appFallback");

  /**
   * On a phone the sidebar is a sheet. Close it before an action opens its
   * own sheet or dialog, so overlays never stack.
   */
  const fromMenu = (action: () => void) => () => {
    setOpenMobile(false);
    action();
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" aria-label={t("user.menu")}>
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg">{app.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-start leading-tight">
                  <span className="truncate text-sm font-medium">{app}</span>
                  <span dir="ltr" className="truncate font-mono text-xs text-muted-foreground">
                    {info.userId}
                  </span>
                </div>
                <HugeiconsIcon icon={UnfoldMoreIcon} className="ms-auto size-4" />
              </SidebarMenuButton>
            }
          />
          <DropdownMenuContent side="top" align="start" className="min-w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>{t("user.signedIn")}</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={fromMenu(() =>
                  sheet.open({
                    title: t("session.title"),
                    description: t("session.description"),
                    body: <SessionDetails />,
                  })
                )}
              >
                <HugeiconsIcon icon={InformationCircleIcon} />
                {t("user.sessionDetails")}
              </DropdownMenuItem>
              <DropdownMenuItem
                render={<Link to="/account" viewTransition />}
                onClick={fromMenu(() => {})}
              >
                <HugeiconsIcon icon={UserCircleIcon} />
                {t("nav.account")}
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={fromMenu(signOut)}>
              <HugeiconsIcon icon={Logout03Icon} />
              {t("account.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
