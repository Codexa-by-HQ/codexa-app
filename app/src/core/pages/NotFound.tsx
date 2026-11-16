import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router";
import { SearchRemoveIcon } from "@hugeicons/core-free-icons";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/core/components/EmptyState";
import { PageHeader } from "@/core/components/PageHeader";

/** Unicode isolate marks keep the path left to right, so RTL text never reorders it. */
const LTR_ISOLATE = String.fromCodePoint(0x2066);
const POP_ISOLATE = String.fromCodePoint(0x2069);

/** Any dashboard path with no route. */
function NotFound() {
  const { t } = useTranslation();
  const { pathname } = useLocation();

  return (
    <>
      <PageHeader title={t("notFound.title")} />
      <EmptyState
        icon={SearchRemoveIcon}
        title={t("notFound.path", { path: `${LTR_ISOLATE}${pathname}${POP_ISOLATE}` })}
        description={t("notFound.description")}
        action={<Link to="/" viewTransition className={buttonVariants()}>{t("notFound.home")}</Link>}
      />
    </>
  );
}

export default NotFound;
