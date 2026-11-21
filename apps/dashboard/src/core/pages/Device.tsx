import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData, useSearchParams } from "react-router";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, Tv01Icon, Cancel01Icon, Alert02Icon } from "@hugeicons/core-free-icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Item, ItemContent, ItemGroup, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/core/components/EmptyState";
import { PageHeader } from "@/core/components/PageHeader";
import { useAsyncAction } from "@/core/hooks/useAsyncAction";
import { api } from "@/core/lib/api";
import { type deviceLoader, withTokens } from "@/core/lib/loaders";
import type { TDeviceRequest } from "@/core/types";

/**
 * Where a TV or command line sends people: enter the code it shows, see which
 * app asks for what, then approve or deny it. Approving needs the signed in
 * person's own token, which is why this page lives in the product.
 */
function Device() {
  const { t } = useTranslation();
  const data = useLoaderData<typeof deviceLoader>();
  const [outcome, setOutcome] = useState<"approved" | "denied" | null>(null);

  return (
    <>
      <title>{t("device.title")}</title>
      <PageHeader title={t("device.title")} description={t("device.description")} />
      {outcome
        ? (
          <EmptyState
            icon={outcome === "approved" ? CheckmarkCircle02Icon : Cancel01Icon}
            title={t(`device.${outcome}`)}
            description={t(`device.${outcome}Description`)}
          />
        )
        : data.state === "review"
        ? <Review userCode={data.userCode} request={data.request} onDone={setOutcome} />
        : (
          <>
            {data.state !== "enter" && (
              <EmptyState icon={Alert02Icon} title={t(`device.${data.state}`)} description={t(`device.${data.state}Description`)} />
            )}
            <EnterCode initial={data.state === "enter" ? "" : data.userCode} />
          </>
        )}
    </>
  );
}

/** The code the device shows, which goes into the URL so the loader looks it up. */
function EnterCode({ initial }: { initial: string }) {
  const { t } = useTranslation();
  const [, setParams] = useSearchParams();
  const [code, setCode] = useState(initial);

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>{t("device.enterTitle")}</CardTitle>
        <CardDescription>{t("device.enterDescription")}</CardDescription>
      </CardHeader>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim()) setParams({ user_code: code.trim() });
        }}
      >
        <CardContent>
          <InputGroup>
            <InputGroupAddon><HugeiconsIcon icon={Tv01Icon} /></InputGroupAddon>
            <InputGroupInput
              autoFocus
              dir="ltr"
              value={code}
              maxLength={9}
              autoComplete="one-time-code"
              placeholder="ABCD-EFGH"
              aria-label={t("device.code")}
              className="font-mono uppercase tracking-widest"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
            />
          </InputGroup>
        </CardContent>
        <CardFooter className="mt-4 justify-end">
          <Button type="submit" disabled={!code.trim()}>{t("device.continue")}</Button>
        </CardFooter>
      </form>
    </Card>
  );
}

/** The app that asks and the access it wants, each of which the person may leave out. */
function Review({ userCode, request, onDone }: { userCode: string; request: TDeviceRequest; onDone: (outcome: "approved" | "denied") => void }) {
  const { t } = useTranslation();
  const [chosen, setChosen] = useState(() => new Set(request.requestedScopes));
  const [approve, approving] = useAsyncAction(async () => {
    await withTokens((tokens) => api.deviceDecide.execute(tokens, "verify", { userCode, approvedScopes: [...chosen] }));
    onDone("approved");
  }, { error: t("device.failed") });
  const [deny, denying] = useAsyncAction(async () => {
    await withTokens((tokens) => api.deviceDecide.execute(tokens, "deny", { userCode }));
    onDone("denied");
  }, { error: t("device.failed") });
  const busy = approving || denying;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{t("device.asks", { app: request.client.name })}</CardTitle>
        <CardDescription>
          {t("device.codeIs")} <Badge variant="secondary" className="font-mono">{userCode}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("device.accessIntro")}</p>
        <ItemGroup>
          {request.requestedScopes.map((scope) => (
            <div role="listitem" key={scope}>
              <Item size="sm" variant="outline" render={<label />}>
                <Checkbox
                  checked={chosen.has(scope)}
                  disabled={!request.consentRequired}
                  onCheckedChange={(checked) =>
                    setChosen((current) => {
                      const next = new Set(current);
                      if (checked) next.add(scope);
                      else next.delete(scope);
                      return next;
                    })}
                />
                <ItemContent>
                  <ItemTitle>{t(`device.scopes.${scope}`, { defaultValue: scope })}</ItemTitle>
                </ItemContent>
                <code dir="ltr" className="ms-auto font-mono text-xs text-muted-foreground">{scope}</code>
              </Item>
            </div>
          ))}
        </ItemGroup>
      </CardContent>
      <CardFooter className="mt-2 justify-end gap-2">
        <Button variant="outline" onClick={() => deny()} disabled={busy}>
          {denying && <Spinner />}
          {t("device.deny")}
        </Button>
        <Button onClick={() => approve()} disabled={busy || chosen.size === 0}>
          {approving && <Spinner />}
          {t("device.approve")}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default Device;
