import { useTranslation } from "react-i18next";
import { Outlet, useNavigation } from "react-router";

import { DirectionProvider } from "@/components/ui/direction";
import { Progress } from "@/components/ui/progress";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmProvider } from "@/core/context/ConfirmProvider";
import { SheetProvider } from "@/core/context/SheetProvider";

/**
 * The root route: the providers every page shares, the route outlet and the
 * toast host. The confirm dialog and the sheet are mounted once here, and any
 * page opens them with useConfirm and useSheet.
 */
export function App() {
  const { i18n } = useTranslation();
  const direction = i18n.dir() === "rtl" ? "rtl" : "ltr";

  return (
    <DirectionProvider direction={direction}>
      <TooltipProvider>
        <ConfirmProvider>
          <SheetProvider>
            <NavigationProgress />
            <Outlet />
            <Toaster position="top-center" dir={direction} richColors closeButton />
          </SheetProvider>
        </ConfirmProvider>
      </TooltipProvider>
    </DirectionProvider>
  );
}

/**
 * An indeterminate bar along the top while the next page's code or data
 * loads. It has no value, so its indicator fills the track and pulses.
 */
function NavigationProgress() {
  const { t } = useTranslation();
  if (useNavigation().state === "idle") return null;

  return (
    <Progress
      value={null}
      aria-label={t("shell.loading")}
      className="fixed inset-x-0 top-0 z-50 *:data-[slot=progress-track]:h-0.5 *:data-[slot=progress-track]:rounded-none *:data-[slot=progress-track]:bg-transparent **:data-[slot=progress-indicator]:w-full **:data-[slot=progress-indicator]:animate-pulse"
    />
  );
}
