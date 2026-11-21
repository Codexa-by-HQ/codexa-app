import { useTranslation } from "react-i18next";

import { BrandLogo } from "@/core/components/BrandLogo";

/**
 * The first paint, while the session loader settles who is signed in: the
 * Codexa leaf breathing inside a turning ring. OAuth App shows the same one.
 */
export function Splash() {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-svh place-items-center bg-background" role="status">
      <h1 className="sr-only">{t("shell.loading")}</h1>
      <div className="brand-loader">
        <BrandLogo />
      </div>
    </main>
  );
}
