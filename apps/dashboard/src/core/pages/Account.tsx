import { useTranslation } from "react-i18next";
import { HugeiconsIcon } from "@hugeicons/react";
import { Logout03Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/core/components/PageHeader";
import { SessionDetails } from "@/core/components/SessionDetails";
import { useSignOut } from "@/core/hooks/useSignOut";

/** The signed in session, and signing out. */
function Account() {
  const { t } = useTranslation();
  const signOut = useSignOut();

  return (
    <>
      <PageHeader
        title={t("account.title")}
        description={t("account.description")}
        actions={
          <Button variant="outline" onClick={signOut}>
            <HugeiconsIcon icon={Logout03Icon} />
            {t("account.signOut")}
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>{t("session.title")}</CardTitle>
          <CardDescription>{t("session.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <SessionDetails />
        </CardContent>
      </Card>
    </>
  );
}

export default Account;
