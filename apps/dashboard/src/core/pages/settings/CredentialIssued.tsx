import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { Alert02Icon, Key01Icon } from "@hugeicons/core-free-icons";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CopyField } from "@/core/components/CopyField";
import { DetailList } from "@/core/components/DetailList";
import { sheet, SheetActions } from "@/core/contexts/Sheet";
import i18n from "@/core/i18n";

type TIssued = {
  name: string;
  clientId: string;
  /** A confidential credential's secret, which OAuth shows only this once. */
  secret?: string;
  /** The application page, offered when the credential came with a new application. */
  applicationHref?: string;
};

/** Shows a new credential's client ID, and its secret once, ready to copy. */
export function showCredentialIssued(issued: TIssued) {
  sheet.open({
    title: issued.name,
    description: i18n.t(issued.secret ? "application.secretDescription" : "application.issuedDescription"),
    icon: Key01Icon,
    body: <CredentialIssued {...issued} />,
  });
}

function CredentialIssued({ clientId, secret, applicationHref }: TIssued) {
  const { t } = useTranslation();
  return (
    <>
      {secret && (
        <Alert>
          <HugeiconsIcon icon={Alert02Icon} />
          <AlertTitle>{t("application.secretTitle")}</AlertTitle>
          <AlertDescription>{t("application.secretWarning")}</AlertDescription>
        </Alert>
      )}
      <DetailList
        rows={[
          { key: "clientId", label: t("application.clientId"), value: <CopyField label={t("application.clientId")} value={clientId} /> },
          ...(secret
            ? [{ key: "secret", label: t("application.clientSecret"), value: <CopyField label={t("application.clientSecret")} value={secret} /> }]
            : []),
        ]}
      />
      <SheetActions>
        {applicationHref && (
          <Link to={applicationHref} viewTransition onClick={() => sheet.close()} className={buttonVariants({ variant: "outline" })}>
            {t("application.open")}
          </Link>
        )}
        <Button onClick={() => sheet.close()}>{t(secret ? "application.secretSaved" : "common.close")}</Button>
      </SheetActions>
    </>
  );
}
