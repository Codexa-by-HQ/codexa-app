import { useTranslation } from "react-i18next";

import { Spinner } from "@/components/ui/spinner";
import { BrandLogo } from "@/core/components/BrandLogo";

/** The first paint, while the session loader settles who is signed in. */
export function Splash() {
  const { t } = useTranslation();

  return (
    <div className="grid min-h-svh place-items-center bg-background" role="status" aria-label={t("shell.loading")}>
      <div className="flex flex-col items-center gap-4">
        <BrandLogo className="size-12 animate-pulse" />
        <Spinner className="text-muted-foreground" />
      </div>
    </div>
  );
}
