import { useTranslation } from "react-i18next";
import { MailAdd01Icon } from "@hugeicons/core-free-icons";

import { Button } from "@/components/ui/button";
import { CopyField } from "@/core/components/CopyField";
import { DetailList } from "@/core/components/DetailList";
import { sheet, SheetActions } from "@/core/contexts/Sheet";
import i18n from "@/core/i18n";

/**
 * A sent invitation with its link, to share another way when email is slow or
 * not set up. Only the account with the invited email can accept it.
 */
export function showInviteSent(invite: { email: string; shareUrl: string }) {
  sheet.open({
    title: i18n.t("forms.invites.sentTitle"),
    description: i18n.t("forms.invites.sentDescription", { email: invite.email }),
    icon: MailAdd01Icon,
    body: <InviteSent shareUrl={invite.shareUrl} />,
  });
}

function InviteSent({ shareUrl }: { shareUrl: string }) {
  const { t } = useTranslation();
  return (
    <>
      <DetailList
        rows={[{ key: "link", label: t("forms.invites.link"), value: <CopyField label={t("forms.invites.link")} value={shareUrl} /> }]}
      />
      <SheetActions>
        <Button onClick={() => sheet.close()}>{t("common.close")}</Button>
      </SheetActions>
    </>
  );
}
