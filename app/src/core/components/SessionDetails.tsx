import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item";
import { CopyField } from "@/core/components/CopyField";
import { useSessionInfo } from "@/core/hooks/useSession";

/**
 * The signed in session as labelled rows, for the account page and the sheet.
 * A container query stacks each label over its value when the space is
 * narrow, as in the sheet, and puts them side by side on the account card.
 */
export function SessionDetails() {
  const { t } = useTranslation();
  const info = useSessionInfo();

  const rows = [
    {
      key: "app",
      label: t("session.app"),
      value: (
        <span className="text-sm font-medium">
          {info.application?.name ?? t("session.appFallback")}
        </span>
      ),
    },
    {
      key: "user",
      label: t("session.user"),
      value: <CopyField label={t("session.user")} value={info.userId} />,
    },
    {
      key: "account",
      label: t("session.account"),
      value: <CopyField label={t("session.account")} value={info.accountId} />,
    },
    {
      key: "access",
      label: t("session.access"),
      value: (
        <div className="flex flex-wrap gap-1.5">
          {info.oauthScopes.map((scope) => (
            <Badge key={scope} variant="secondary" className="font-mono">{scope}</Badge>
          ))}
        </div>
      ),
    },
  ];

  return (
    <ItemGroup className="@container gap-0" aria-label={t("session.title")}>
      {rows.map((row, index) => (
        <div key={row.key} role="listitem">
          {index > 0 && <ItemSeparator className="my-0" />}
          <Item size="sm" className="flex-col items-stretch gap-2 px-0 @lg:flex-row @lg:items-center">
            <ItemContent>
              <ItemTitle className="text-muted-foreground">{row.label}</ItemTitle>
            </ItemContent>
            <ItemActions className="min-w-0 @lg:max-w-md @lg:flex-1 @lg:justify-end">
              {row.value}
            </ItemActions>
          </Item>
        </div>
      ))}
    </ItemGroup>
  );
}
