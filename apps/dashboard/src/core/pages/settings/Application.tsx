import { useTranslation } from "react-i18next";
import { useLoaderData, useNavigate, useRevalidator } from "react-router";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Key01Icon, PaintBoardIcon, PencilEdit02Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { CopyField } from "@/core/components/CopyField";
import { DetailList } from "@/core/components/DetailList";
import { EmptyState } from "@/core/components/EmptyState";
import { IconTile } from "@/core/components/IconTile";
import { ListValue } from "@/core/components/ListValue";
import { PageHeader } from "@/core/components/PageHeader";
import { confirm } from "@/core/contexts/Confirm";
import { useSignedInSession } from "@/core/contexts/Session";
import { sheet, SheetActions } from "@/core/contexts/Sheet";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { api } from "@/core/lib/api";
import { type applicationLoader, withTokens } from "@/core/lib/loaders";
import { failureMessage } from "@/core/lib/utils";
import { showCredentialIssued } from "@/core/pages/settings/CredentialIssued";
import { createCredential, editApplication, editBranding, editCredential } from "@/core/pages/settings/forms";
import { ProvidersCard } from "@/core/pages/settings/ProvidersCard";
import { RecordSummary, runRecordAction } from "@/core/pages/settings/RecordDetails";
import type { TListItem, TResourceAction } from "@/core/types";

const ARCHIVE_APP: TResourceAction = {
  key: "archive",
  capability: "applications:archive",
  path: "/management/oauth-apps/archive",
  destructive: true,
};

const REVOKE_CREDENTIAL: TResourceAction = {
  key: "revokeCredential",
  capability: "credentials:revoke",
  path: "/management/oauth-credentials/revoke",
  destructive: true,
};

const list = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

/**
 * A revoked credential is gone for good, a disabled one can come back, and
 * only the actions that fit its state are offered.
 */
function credentialState(credential: TListItem): "revoked" | "disabled" | "active" {
  if (credential.revokedAt) return "revoked";
  return credential.isActive === false ? "disabled" : "active";
}

const STATE_BADGE = { active: "default", disabled: "outline", revoked: "destructive" } as const;

/** What a credential is for, read back from its type and grants. */
function credentialKind(credential: TListItem): "browser" | "server" | "machine" | "device" {
  const grants = list(credential.grantTypes);
  if (grants.includes("client_credentials")) return "machine";
  if (grants.includes("device_code")) return "device";
  return credential.type === "confidential" ? "server" : "browser";
}

/**
 * /settings/applications/:appId, one OAuth app: its details, then the
 * credentials that sign in to it, each opening in the sheet with its client
 * ID, settings and actions.
 */
function Application() {
  const { t } = useTranslation();
  const { application, credentials, providers } = useLoaderData<typeof applicationLoader>();
  const { capabilities } = useSignedInSession();
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const can = (capability: string) => capabilities.includes(capability);
  const name = String(application.name ?? application._id);

  const changed = (message?: string) => {
    if (message) toast.success(message);
    sheet.close();
    void revalidator.revalidate();
  };

  const [edit, editing] = useAsyncAction(
    async () => sheet.open(await editApplication(changed, application)),
    { error: t("form.unexpected") },
  );

  const [brand, branding] = useAsyncAction(
    async () => sheet.open(await editBranding(changed, application)),
    { error: t("form.unexpected") },
  );

  const [addCredential, adding] = useAsyncAction(
    async () => sheet.open(await createCredential(application._id, () => void revalidator.revalidate())),
    { error: t("form.unexpected") },
  );

  const archive = async () => {
    if (await runRecordAction(ARCHIVE_APP, application)) navigate("/settings/applications", { viewTransition: true });
  };

  const openCredential = (credential: TListItem) =>
    sheet.open({
      title: String(credential.name ?? credential._id),
      description: t(`forms.credentials.kinds.${credentialKind(credential)}`),
      icon: Key01Icon,
      body: <CredentialDetails credential={credential} onChanged={changed} />,
    });

  return (
    <>
      <PageHeader
        title={name}
        description={String(application.description ?? "") || t("application.description")}
        actions={
          <>
            {can(ARCHIVE_APP.capability) && application.enabled !== false && (
              <Button variant="outline" onClick={archive}>{t("settings.actions.archive.label")}</Button>
            )}
            {can("applications:update") && (
              <Button variant="outline" onClick={() => brand()} disabled={branding}>
                {branding ? <Spinner /> : <HugeiconsIcon icon={PaintBoardIcon} />}
                {t("forms.branding.open")}
              </Button>
            )}
            {can("applications:update") && (
              <Button onClick={() => edit()} disabled={editing}>
                {editing ? <Spinner /> : <HugeiconsIcon icon={PencilEdit02Icon} />}
                {t("forms.edit")}
              </Button>
            )}
          </>
        }
      />

      <DetailList
        rows={[
          { key: "enabled", label: t("fields.active"), value: <ListValue value={application.enabled !== false} kind="boolean" /> },
          { key: "id", label: t("fields.id"), value: <CopyField label={t("fields.id")} value={application._id} /> },
          { key: "created", label: t("fields.created"), value: <ListValue value={application.createdAt} kind="date" /> },
        ]}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("application.credentials")}</CardTitle>
          <CardDescription>{t("application.credentialsDescription")}</CardDescription>
          {can("credentials:create") && (
            <CardAction>
              <Button size="sm" onClick={() => addCredential()} disabled={adding}>
                {adding ? <Spinner /> : <HugeiconsIcon icon={Add01Icon} />}
                {t("forms.credentials.add")}
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent>
          {credentials.length === 0
            ? <EmptyState icon={Key01Icon} title={t("application.noCredentials")} />
            : (
              <ItemGroup className="gap-2">
                {credentials.map((credential) => (
                  <Item key={credential._id} role="listitem" variant="outline" size="sm" className="flex-wrap">
                    <IconTile icon={Key01Icon} size="sm" />
                    <ItemContent className="min-w-0">
                      <ItemTitle>
                        {String(credential.name ?? "")}
                        <Badge variant="secondary">{t(`forms.credentials.kinds.${credentialKind(credential)}`)}</Badge>
                        {credentialState(credential) !== "active" && (
                          <Badge variant={STATE_BADGE[credentialState(credential)]}>{t(`application.states.${credentialState(credential)}`)}</Badge>
                        )}
                      </ItemTitle>
                      <ItemDescription>{t("application.clientId")}</ItemDescription>
                    </ItemContent>
                    <ItemActions className="w-full gap-2 sm:w-auto">
                      <CopyField label={t("application.clientId")} value={String(credential.clientId ?? "")} className="min-w-0 flex-1 sm:w-72" />
                      <Button variant="outline" size="sm" onClick={() => openCredential(credential)}>
                        {t("application.manage")}
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
        </CardContent>
      </Card>

      {providers && <ProvidersCard appId={application._id} providers={providers} onChanged={changed} />}
    </>
  );
}

function CredentialDetails({ credential, onChanged }: { credential: TListItem; onChanged: (message?: string) => void }) {
  const { t } = useTranslation();
  const { capabilities } = useSignedInSession();
  const can = (capability: string) => capabilities.includes(capability);
  const state = credentialState(credential);
  const active = state === "active";
  const live = state !== "revoked";
  const confidential = credential.type === "confidential";
  const call = (path: string, body: Record<string, unknown>, idempotencyKey?: string) =>
    withTokens((tokens) => api.write.execute(tokens, "POST", path, { id: credential._id, ...body }, idempotencyKey));

  const [edit, editing] = useAsyncAction(
    async () => sheet.open(await editCredential(onChanged, credential)),
    { error: t("form.unexpected") },
  );

  const [toggle, toggling] = useAsyncAction(async () => {
    try {
      await call("/management/oauth-credentials/enabled", { enabled: !active });
      onChanged(t(active ? "application.disabledDone" : "application.enabledDone"));
    } catch (error) {
      toast.error(failureMessage(error, t));
    }
  }, { error: t("form.unexpected") });

  const [rotateSecret, rotating] = useAsyncAction(async () => {
    try {
      // A retried rotation must not rotate again and void the secret just shown.
      const rotated = await call("/management/oauth-credentials/rotate-secret", {}, crypto.randomUUID());
      onChanged();
      if (typeof rotated?.clientSecret === "string") {
        showCredentialIssued({ name: String(credential.name ?? ""), clientId: String(credential.clientId ?? ""), secret: rotated.clientSecret });
      }
    } catch (error) {
      toast.error(failureMessage(error, t));
    }
  }, { error: t("form.unexpected") });

  // Asked outside the transition, which would hold the dialog back until it ended.
  const rotate = async () => {
    const confirmed = await confirm({
      title: t("application.rotateTitle"),
      description: t("application.rotateDescription"),
      confirmLabel: t("application.rotate"),
      destructive: true,
    });
    if (confirmed) rotateSecret();
  };

  const revoke = async () => {
    if (await runRecordAction(REVOKE_CREDENTIAL, credential)) onChanged();
  };

  return (
    <>
      <RecordSummary
        icon={Key01Icon}
        title={String(credential.name ?? credential._id)}
        subtitle={String(credential.clientId ?? "")}
        states={
          <>
            <Badge variant={STATE_BADGE[state]}>{t(`application.states.${state}`)}</Badge>
            <Badge variant="secondary">{t(`forms.credentials.kinds.${credentialKind(credential)}`)}</Badge>
          </>
        }
      />
      {state === "revoked" && <p className="text-sm text-muted-foreground">{t("application.revokedNote")}</p>}
      <DetailList
        title={t("details.details")}
        rows={[
          {
            key: "clientId",
            label: t("application.clientId"),
            value: <CopyField label={t("application.clientId")} value={String(credential.clientId ?? "")} />,
          },
          { key: "type", label: t("fields.type"), value: <ListValue value={credential.type} kind="badge" /> },
          { key: "grants", label: t("application.grants"), value: <ListValue value={credential.grantTypes} kind="tags" /> },
          { key: "scopes", label: t("forms.credentials.scopes"), value: <ListValue value={credential.allowedScopes} kind="tags" /> },
          { key: "redirects", label: t("forms.credentials.redirectUris"), value: <ListValue value={credential.redirectUris} kind="tags" /> },
          { key: "consent", label: t("forms.credentials.consent"), value: <ListValue value={credential.consentRequired} kind="boolean" /> },
        ]}
      />
      <DetailList
        title={t("details.activity")}
        rows={[
          { key: "created", label: t("fields.created"), value: <ListValue value={credential.createdAt} kind="date" /> },
          { key: "lastUsed", label: t("application.lastUsed"), value: <ListValue value={credential.lastUsedAt} kind="date" /> },
          ...(credential.rotatedAt ? [{ key: "rotated", label: t("application.rotated"), value: <ListValue value={credential.rotatedAt} kind="date" /> }] : []),
          ...(credential.revokedAt ? [{ key: "revoked", label: t("application.states.revoked"), value: <ListValue value={credential.revokedAt} kind="date" /> }] : []),
        ]}
      />
      {live && (
      <SheetActions>
        {can(REVOKE_CREDENTIAL.capability) && (
          <Button variant="destructive" onClick={revoke}>{t("settings.actions.revokeCredential.label")}</Button>
        )}
        {can("credentials:enable") && (
          <Button variant="outline" onClick={() => toggle()} disabled={toggling}>
            {toggling && <Spinner />}
            {t(active ? "application.disable" : "application.enable")}
          </Button>
        )}
        {confidential && active && can("credentials:rotate") && (
          <Button variant="outline" onClick={() => rotate()} disabled={rotating}>
            {rotating && <Spinner />}
            {t("application.rotate")}
          </Button>
        )}
        {can("credentials:update") && (
          <Button onClick={() => edit()} disabled={editing}>
            <HugeiconsIcon icon={PencilEdit02Icon} />
            {t("forms.edit")}
          </Button>
        )}
      </SheetActions>
      )}
    </>
  );
}

export default Application;
