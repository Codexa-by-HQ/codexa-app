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
import type { TNavSection, TRouteHandle } from "@/core/types";

/** Section, then page. The section links to its first page. */
export function PageBreadcrumb({ section }: { section?: TNavSection }) {
  const { t } = useTranslation();
  const page = useMatches()
    .map((match) => match.handle as TRouteHandle | undefined)
    .findLast((handle) => handle?.name);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {section && (
          <>
            <BreadcrumbItem className="hidden sm:inline-flex">
              <BreadcrumbLink render={<Link to={section.items[0].to} viewTransition />}>{t(section.name)}</BreadcrumbLink>
            </BreadcrumbItem>
            {page?.name && <BreadcrumbSeparator className="hidden sm:block" />}
          </>
        )}
        {page?.name && (
          <BreadcrumbItem>
            <BreadcrumbPage>{t(page.name)}</BreadcrumbPage>
          </BreadcrumbItem>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
