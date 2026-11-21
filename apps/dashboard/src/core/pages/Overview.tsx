import { useTranslation } from "react-i18next";
import { DashboardSquare01Icon } from "@hugeicons/core-free-icons";

import { EmptyState } from "@/core/components/EmptyState";
import { PageHeader } from "@/core/components/PageHeader";
import { useSignedInSession } from "@/core/contexts/Session";

/**
 * The dashboard home, left empty for your product. Replace it from
 * src/overrides/routes.tsx with the key "overview".
 */
function Overview() {
  const { t } = useTranslation();
  const app = useSignedInSession().application?.name ?? t("session.appFallback");

  return (
    <>
      <PageHeader title={t("overview.title")} description={t("overview.description", { app })} />
      <EmptyState
        icon={DashboardSquare01Icon}
        title={t("overview.emptyTitle")}
        description={t("overview.emptyDescription")}
      />
    </>
  );
}

export default Overview;
