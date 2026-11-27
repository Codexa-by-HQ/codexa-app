import { AUTH_VERSION_HEADER } from "@/core/lib/constants";
import { env } from "@/core/lib/env";
import { endpoint } from "@/core/lib/request";
import type {
  TApplication,
  TApplicationRef,
  TAccountSwitchAuthorization,
  TCatalog,
  TClientConfig,
  TDeviceRequest,
  TListPage,
  TMembership,
  TSessionInfo,
  TSsoProvider,
  TTokenGrant,
  TTokenResponse,
  TTokens,
} from "@/core/types";

/**
 * Every endpoint Codexa App core calls, as one object of `{ id, execute }`:
 * call `api.session.execute(tokens)`. Codexa App calls OAuth exactly as a
 * third party app would.
 */
export const api = {
  /** Served by the host next to the app, so one build fits every deployment. */
  clientConfig: endpoint("clientConfig", async (send) => {
    const { oauth } = await send<{ oauth: TClientConfig }>({
      url: `${import.meta.env.BASE_URL}config.json`,
      cache: "no-store",
    });
    return oauth;
  }),

  token: endpoint("token", async (send, clientId: string, grant: TTokenGrant): Promise<TTokens> => {
    const body = await send<TTokenResponse>({
      url: `${env.oauthPath}/token`,
      method: "POST",
      form: { ...grant, client_id: clientId },
    });
    return {
      accessToken: body.access_token,
      accountId: body.account_id,
      expiresAt: Date.now() + body.expires_in * 1_000,
    };
  }),

  /** OAuth revokes the refresh token in its cookie and clears the cookie. */
  revoke: endpoint("revoke", async (send, clientId: string) => {
    await send<null>({
      url: `${env.oauthPath}/revoke`,
      method: "POST",
      keepalive: true,
      form: { client_id: clientId },
    });
  }),

  /** The one source of an application's name and branding. Public, before or after sign in. */
  application: endpoint("application", (send, ref: TApplicationRef, fresh = false) =>
    send<TApplication>({
      url: `${env.authApiPath}/applications/branding?${new URLSearchParams(ref)}`,
      headers: { [AUTH_VERSION_HEADER]: env.authApiVersion },
      // Right after an edit, skip the minute browsers may keep it.
      ...(fresh ? { cache: "reload" as const } : {}),
    })),

  session: endpoint("session", (send, tokens: TTokens) =>
    send<TSessionInfo>({ url: `${env.authApiPath}/management/session`, headers: managementHeaders(tokens) })),

  /** The accounts this person belongs to, which the tenant chooser offers. */
  memberships: endpoint("memberships", (send, tokens: TTokens) =>
    send<TMembership[]>({ url: `${env.authApiPath}/management/accounts/memberships`, headers: managementHeaders(tokens) })),

  /** Starts moving the session to another account. OAuth answers where the browser goes next. */
  accountSwitch: endpoint(
    "accountSwitch",
    (send, tokens: TTokens, accountId: string, authorization: TAccountSwitchAuthorization) =>
      send<{ redirectUri: string }>({
        url: `${env.oauthPath}/account-switch`,
        method: "POST",
        headers: managementHeaders(tokens),
        json: { accountId, authorization },
      }),
  ),

  /** oauth-device: the pending request a code names, for the person to approve. */
  deviceRequest: endpoint("deviceRequest", (send, tokens: TTokens, userCode: string) =>
    send<TDeviceRequest>({
      url: `${env.oauthPath}/device/verification?${new URLSearchParams({ user_code: userCode })}`,
      headers: managementHeaders(tokens),
    })),

  deviceDecide: endpoint(
    "deviceDecide",
    (send, tokens: TTokens, decision: "verify" | "deny", body: { userCode: string; approvedScopes?: string[] }) =>
      send<Record<string, unknown> | null>({
        url: `${env.oauthPath}/device/${decision}`,
        method: "POST",
        headers: managementHeaders(tokens),
        json: body,
      }),
  ),

  /** oauth-sso: the sign in providers the host approved for an app, with the app's settings. */
  ssoProviders: endpoint("ssoProviders", (send, tokens: TTokens, appId: string) =>
    send<{ items: TSsoProvider[] }>({
      url: `${env.authApiPath}/management/sso/providers?${new URLSearchParams({ appId })}`,
      headers: managementHeaders(tokens),
    })),

  /** Adds a provider to an app with POST, changes it with PATCH, or removes it with DELETE. */
  ssoProviderWrite: endpoint(
    "ssoProviderWrite",
    (send, tokens: TTokens, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) =>
      send<Record<string, unknown>>({
        url: `${env.authApiPath}/management/sso/providers`,
        method,
        headers: managementHeaders(tokens),
        json: body,
      }),
  ),

  /** OAuth's catalog: every registered scope and permission, for the policy and credential forms. */
  catalog: endpoint("catalog", (send, tokens: TTokens) =>
    send<TCatalog>({ url: `${env.authApiPath}/management/catalog`, headers: managementHeaders(tokens) })),

  /** A one time link into the personal account area at /auth/account. */
  handoff: endpoint("handoff", (send, tokens: TTokens, path: string, returnUri: string) =>
    send<{ redirectUri: string }>({
      url: `${env.authApiPath}/management/handoffs`,
      method: "POST",
      headers: managementHeaders(tokens),
      json: { path, returnUri },
    })),

  /** One page of a management list. OAuth's guard checks the capability. */
  list: endpoint(
    "list",
    (send, tokens: TTokens, path: string, query: Record<string, string>, signal?: AbortSignal) =>
      send<TListPage>({
        url: `${env.authApiPath}${path}?${new URLSearchParams(query)}`,
        headers: managementHeaders(tokens),
        signal,
      }),
  ),

  /** A management read that is not a list, such as one record by id. */
  read: endpoint(
    "read",
    (send, tokens: TTokens, path: string, query: Record<string, string> = {}) =>
      send<Record<string, unknown>>({
        url: `${env.authApiPath}${path}?${new URLSearchParams(query)}`,
        headers: managementHeaders(tokens),
      }),
  ),

  /** A management change: create with POST, update with PATCH, or an action such as archive. */
  /**
   * A management write. `idempotencyKey` makes OAuth run it at most once, for
   * the actions where a retry would repeat something, such as issuing a secret.
   */
  write: endpoint(
    "write",
    (send, tokens: TTokens, method: "POST" | "PATCH", path: string, body: Record<string, unknown>, idempotencyKey?: string) =>
      send<Record<string, unknown> | null>({
        url: `${env.authApiPath}${path}`,
        method,
        headers: { ...managementHeaders(tokens), ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}) },
        json: body,
      }),
  ),
} as const;

/** Every management call names its API version, token and account. */
function managementHeaders({ accessToken, accountId }: TTokens) {
  return {
    [AUTH_VERSION_HEADER]: env.authApiVersion,
    authorization: `Bearer ${accessToken}`,
    "x-account-id": accountId,
  };
}
