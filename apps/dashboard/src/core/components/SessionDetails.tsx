import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { CopyField } from "@/core/components/CopyField";
import { DetailList } from "@/core/components/DetailList";
import { useSignedInSession } from "@/core/contexts/Session";

/** The signed in session as labelled rows, for the session page and the sheet. */
export function SessionDetails() {
  const { t } = useTranslation();
  const info = useSignedInSession();

  return (
    <DetailList
      rows={[
        { key: "app", label: t("session.app"), value: info.application?.name ?? t("session.appFallback") },
        { key: "user", label: t("session.user"), value: <CopyField label={t("session.user")} value={info.userId} /> },
        { key: "account", label: t("session.account"), value: <CopyField label={t("session.account")} value={info.accountId} /> },
        {
          key: "access",
          label: t("session.access"),
          value: info.oauthScopes.map((scope) => <Badge key={scope} variant="secondary" className="font-mono">{scope}</Badge>),
        },
      ]}
    />
  );
}
