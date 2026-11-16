import { useTranslation } from "react-i18next";
import { Link, useMatches } from "react-router";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import type { TRouteHandle } from "@/core/types";

/** The current page under the dashboard root, named from its route handle. */
export function PageBreadcrumb() {
  const { t } = useTranslation();
  const current = useMatches()
    .map((match) => match.handle as TRouteHandle | undefined)
    .findLast((handle) => handle?.name);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem className="hidden md:block">
          <BreadcrumbLink render={<Link to="/" viewTransition />}>{t("shell.product")}</BreadcrumbLink>
        </BreadcrumbItem>
        {current?.name && (
          <>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>{t(current.name)}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
