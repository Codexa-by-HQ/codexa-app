import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Login03Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { EmptyState } from "@/core/components/EmptyState";
import { IconTile } from "@/core/components/IconTile";
import { confirm } from "@/core/contexts/Confirm";
import { useSignedInSession } from "@/core/contexts/Session";
import { sheet } from "@/core/contexts/Sheet";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { api } from "@/core/lib/api";
import { withTokens } from "@/core/lib/loaders";
import { failureMessage } from "@/core/lib/utils";
import { ssoProviderForm } from "@/core/pages/settings/forms";
import type { TSsoProvider } from "@/core/types";

/**
 * oauth-sso's providers for this app. The host decides which providers an app
 * may offer, and the app's owner adds them, names them, turns them on or off,
 * lets new people sign up through them, or removes them.
 */
export function ProvidersCard({ appId, providers, onChanged }: { appId: string; providers: TSsoProvider[]; onChanged: (message?: string) => void }) {
  const { t } = useTranslation();
  const { capabilities } = useSignedInSession();
  const canChange = capabilities.includes("sso:providers:update");
  const [open, opening] = useAsyncAction(
    async (provider: TSsoProvider) => sheet.open(await ssoProviderForm(appId, provider, onChanged)),
    { error: t("form.unexpected") },
  );
  const remove = (provider: TSsoProvider) =>
    void confirm({
      title: t("providers.removeTitle", { name: provider.name }),
      description: t("providers.removeDescription"),
      confirmLabel: t("providers.remove"),
      destructive: true,
      onConfirm: async () => {
        try {
          await withTokens((tokens) =>
            api.ssoProviderWrite.execute(tokens, "DELETE", { appId, providerId: provider.id, revision: provider.revision })
          );
          onChanged(t("providers.removed"));
        } catch (error) {
          toast.error(failureMessage(error, t));
          throw error;
        }
      },
    });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("providers.title")}</CardTitle>
        <CardDescription>{t("providers.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {providers.length === 0
          ? <EmptyState icon={Login03Icon} title={t("providers.none")} description={t("providers.noneDescription")} />
          : (
            <ItemGroup className="gap-2">
              {providers.map((provider) => {
                const added = provider.revision !== null && !provider.archived;
                return (
                  <Item key={provider.id} role="listitem" variant="outline" size="sm" className="flex-wrap">
                    <IconTile icon={Login03Icon} size="sm" />
                    <ItemContent className="min-w-0">
                      <ItemTitle className="flex-wrap">
                        {provider.name}
                        <Badge variant={!added ? "outline" : provider.enabled ? "default" : "secondary"}>
                          {t(!added ? "providers.notAdded" : provider.enabled ? "providers.on" : "providers.off")}
                        </Badge>
                        {added && provider.allowRegistration && <Badge variant="secondary">{t("providers.signUp")}</Badge>}
                      </ItemTitle>
                      <ItemDescription dir="ltr" className="truncate text-start">{provider.issuer}</ItemDescription>
                    </ItemContent>
                    {canChange && (
                      <ItemActions>
                        {added && (
                          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => remove(provider)}>
                            {t("providers.remove")}
                          </Button>
                        )}
                        <Button variant={added ? "outline" : "default"} size="sm" disabled={opening} onClick={() => open(provider)}>
                          {!added && <HugeiconsIcon icon={Add01Icon} />}
                          {t(added ? "providers.manage" : "providers.add")}
                        </Button>
                      </ItemActions>
                    )}
                  </Item>
                );
              })}
            </ItemGroup>
          )}
      </CardContent>
    </Card>
  );
}
