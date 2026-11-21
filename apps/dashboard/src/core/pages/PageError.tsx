import { useTranslation } from "react-i18next";
import { isRouteErrorResponse, Link, useRouteError } from "react-router";
import { Alert02Icon, LockPasswordIcon, SearchRemoveIcon } from "@hugeicons/core-free-icons";

import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/core/components/EmptyState";
import { PageHeader } from "@/core/components/PageHeader";
import { ApiError } from "@/core/lib/request";

/**
 * A dashboard page that could not open, shown inside the shell so the
 * navigation stays. A page the session may not see, or one OAuth refused,
 * says so instead of looking broken.
 */
function PageError() {
  const { t } = useTranslation();
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : error instanceof ApiError ? error.status : 0;
  const kind = status === 403 ? "forbidden" : status === 404 ? "missing" : "failed";
  const icon = { forbidden: LockPasswordIcon, missing: SearchRemoveIcon, failed: Alert02Icon }[kind];
  const home = <Link to="/" viewTransition className={buttonVariants({ variant: "outline" })}>{t("notFound.home")}</Link>;

  return (
    <>
      <PageHeader title={t(`pageError.${kind}.title`)} />
      <EmptyState
        icon={icon}
        title={t(`pageError.${kind}.heading`)}
        description={t(`pageError.${kind}.description`)}
        action={kind === "failed"
          ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => location.reload()}>{t("routeError.reload")}</Button>
              {home}
            </div>
          )
          : home}
      />
    </>
  );
}

export default PageError;
