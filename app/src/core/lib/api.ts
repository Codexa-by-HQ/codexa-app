import type { BrandedApplication } from "./branding";
import { env } from "./env";
import { endpoint } from "./request";

/**
 * Every endpoint Codexa App core calls, as one object. Each is `{ id, execute }`:
 * call `api.session.execute(tokens)`. Codexa App signs in as an ordinary
 * public OAuth client, so it calls OAuth exactly as a third party app would.
 */

const URLS = {
  /** Served by the host next to the app, so one build fits every deployment. */
  config: `${import.meta.env.BASE_URL}config.json`,
  token: `${env.oauthPath}/token`,
  revoke: `${env.oauthPath}/revoke`,
  session: `${env.authApiPath}/management/session`,
} as const;

/** The OAuth client the host configured for this app. */
export type ClientConfig = {
  /** Null until setup created a client, which keeps sign in off. */
  readonly clientId: string | null;
  readonly scopes: readonly string[];
};

/** Tokens for one signed in tab. */
export type Tokens = {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly accountId: string;
  /** Epoch milliseconds when the access token expires. */
  readonly expiresAt: number;
};

/** What OAuth reports about the signed in session. */
export type SessionInfo = {
  /** The OAuth application, with the branding the dashboard wears. */
  readonly application?: BrandedApplication;
  readonly userId: string;
  readonly accountId: string;
  readonly oauthScopes: readonly string[];
};

/** The two grants this public client uses at the token endpoint. */
export type TokenGrant =
  | {
    grant_type: "authorization_code";
    code: string;
    redirect_uri: string;
    code_verifier: string;
  }
  | { grant_type: "refresh_token"; refresh_token: string };

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  account_id: string;
};

export const api = {
  clientConfig: endpoint("clientConfig", async (send) => {
    const { oauth } = await send<{ oauth: ClientConfig }>({ url: URLS.config, cache: "no-store" });
    return oauth;
  }),

  /** Exchange an authorization code or a refresh token for new tokens. */
  token: endpoint("token", async (send, clientId: string, grant: TokenGrant): Promise<Tokens> => {
    const body = await send<TokenResponse>({
      url: URLS.token,
      method: "POST",
      form: { ...grant, client_id: clientId },
    });
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      accountId: body.account_id,
      expiresAt: Date.now() + body.expires_in * 1_000,
    };
  }),

  /**
   * Revoke a refresh token, which ends its whole token family. `keepalive`
   * lets it finish even when the page navigates away straight after.
   */
  revoke: endpoint("revoke", async (send, clientId: string, token: string) => {
    await send<null>({
      url: URLS.revoke,
      method: "POST",
      keepalive: true,
      form: { token, token_type_hint: "refresh_token", client_id: clientId },
    });
  }),

  /** The session behind these tokens. Protected routes need the account id too. */
  session: endpoint("session", (send, { accessToken, accountId }: Tokens) =>
    send<SessionInfo>({
      url: URLS.session,
      headers: {
        "X-Auth-Version": env.authApiVersion,
        authorization: `Bearer ${accessToken}`,
        "x-account-id": accountId,
      },
    })),
} as const;
