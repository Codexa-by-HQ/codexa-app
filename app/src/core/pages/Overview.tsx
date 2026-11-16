import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { IconSvgElement } from "@hugeicons/react";
import {
  CheckmarkBadge01Icon,
  PuzzleIcon,
  UserCircleIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyField } from "@/core/components/CopyField";
import { EmptyState } from "@/core/components/EmptyState";
import { IconTile } from "@/core/components/IconTile";
import { PageHeader } from "@/core/components/PageHeader";
import { useSessionInfo } from "@/core/hooks/useSession";

/** The dashboard home. Replace it from src/overrides/routes.tsx with key "overview". */
function Overview() {
  const { t } = useTranslation();
  const info = useSessionInfo();
  const app = info.application?.name ?? t("session.appFallback");

  return (
    <>
      <PageHeader title={t("overview.title")} description={t("overview.description", { app })} />

      <section aria-label={t("overview.summary")} className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={UserCircleIcon} title={t("session.user")}>
          <CopyField label={t("session.user")} value={info.userId} />
        </SummaryCard>
        <SummaryCard icon={UserGroupIcon} title={t("session.account")}>
          <CopyField label={t("session.account")} value={info.accountId} />
        </SummaryCard>
        <SummaryCard icon={CheckmarkBadge01Icon} title={t("session.access")}>
          <div className="flex flex-wrap gap-1.5">
            {info.oauthScopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="font-mono">{scope}</Badge>
            ))}
          </div>
        </SummaryCard>
      </section>

      <EmptyState
        icon={PuzzleIcon}
        title={t("overview.pluginsTitle")}
        description={t("overview.pluginsDescription")}
      />
    </>
  );
}

function SummaryCard({
  icon,
  title,
  children,
}: {
  icon: IconSvgElement;
  title: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardAction>
          <IconTile icon={icon} size="sm" />
        </CardAction>
      </CardHeader>
      <CardContent className="min-w-0">{children}</CardContent>
    </Card>
  );
}

export default Overview;
