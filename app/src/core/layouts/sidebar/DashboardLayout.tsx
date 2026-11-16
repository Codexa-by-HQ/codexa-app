import { useTranslation } from "react-i18next";
import { Outlet } from "react-router";

import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PoweredBy } from "@/core/components/PoweredBy";
import { PreferenceControls } from "@/core/components/Preferences";
import { PageBreadcrumb } from "@/core/layouts/shared/PageBreadcrumb";
import { AppSidebar } from "./AppSidebar";

/** The shadcn sidebar stores its open state in this cookie. */
const SIDEBAR_COOKIE = "sidebar_state";

/** Read once, so the sidebar opens the way the user left it. */
const sidebarOpen = !document.cookie
  .split("; ")
  .includes(`${SIDEBAR_COOKIE}=false`);

/**
 * The signed in dashboard: a collapsible sidebar beside a header with the
 * breadcrumb and preferences, then the page.
 */
export function DashboardLayout() {
  const { t } = useTranslation();

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ms-1" aria-label={t("shell.toggleSidebar")} />
          <Separator orientation="vertical" className="me-2 data-vertical:h-4 data-vertical:self-center" />
          <PageBreadcrumb />
          <div className="ms-auto">
            <PreferenceControls />
          </div>
        </header>
        {/* Each page's sections rise in one by one, and route changes cross fade. */}
        <main className="stagger flex flex-1 flex-col gap-8 p-4 [view-transition-name:page] sm:p-6 lg:p-8">
          <Outlet />
        </main>
        <footer className="flex justify-end border-t px-4 py-3 sm:px-6 lg:px-8">
          <PoweredBy />
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
