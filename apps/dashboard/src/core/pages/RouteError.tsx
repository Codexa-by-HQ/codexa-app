import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, useRouteError } from "react-router";
import { Alert02Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/core/layouts/auth/AuthLayout";

/**
 * The error boundary for the whole app. It covers a page that throws, a page
 * chunk that failed to load after a deploy, and a host that could not be
 * reached while loading the session. Reloading fixes most of them.
 */
function RouteError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <AuthLayout
      icon={Alert02Icon}
      heading={notFound ? t("notFound.title") : t("routeError.title")}
      description={notFound ? t("notFound.description") : t("routeError.description")}
    >
      <Button className="w-full" onClick={() => location.reload()}>
        {t("routeError.reload")}
      </Button>
    </AuthLayout>
  );
}

export default RouteError;
