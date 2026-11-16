import { api, type ClientConfig, type Tokens } from "./api";

/**
 * Codexa App sign in as a public OAuth client: authorization code with PKCE.
 *
 * The app starts the flow, OAuth App renders sign in and consent, and the
 * browser returns to /app/callback where the code is exchanged. The PKCE
 * verifier and state live in sessionStorage, scoped to this tab.
 */

const BASE = import.meta.env.BASE_URL; // "/app/"
const PENDING_KEY = "codexa-app:oauth:pending";

type Pending = { state: string; verifier: string };

/** Why a sign in did not complete, used as a translation key. */
export type SignInFailure = "denied" | "failed" | "state";

export class SignInError extends Error {
  readonly reason: SignInFailure;

  constructor(reason: SignInFailure) {
    super(`Sign in ${reason}.`);
    this.reason = reason;
  }
}

/** The callback registered on the client. Must match it exactly. */
export function redirectUri(): string {
  return `${location.origin}${BASE}callback`;
}

export function isCallbackUrl(url: URL): boolean {
  return url.pathname === `${BASE}callback`;
}

/** Create PKCE and state, then leave for OAuth. */
export async function beginSignIn(config: ClientConfig): Promise<void> {
  if (!config.clientId) throw new SignInError("failed");
  const verifier = randomToken();
  const state = randomToken();
  sessionStorage.setItem(PENDING_KEY, JSON.stringify({ state, verifier } satisfies Pending));

  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: config.scopes.join(" "),
    state,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: "S256",
  });
  location.assign(`/oauth/authorize?${params}`);
}

/**
 * Finish sign in from the callback URL. Accepts only the state this tab
 * started, and uses it once, so a callback can never be replayed.
 */
export async function completeSignIn(config: ClientConfig, url: URL): Promise<Tokens> {
  const pending = readPending();
  sessionStorage.removeItem(PENDING_KEY);

  if (!pending || url.searchParams.get("state") !== pending.state) {
    throw new SignInError("state");
  }
  const error = url.searchParams.get("error");
  if (error) throw new SignInError(error === "access_denied" ? "denied" : "failed");

  const code = url.searchParams.get("code");
  if (!code || !config.clientId) throw new SignInError("failed");

  try {
    return await api.token.execute(config.clientId, {
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: pending.verifier,
    });
  } catch {
    throw new SignInError("failed");
  }
}

function readPending(): Pending | null {
  try {
    const value = sessionStorage.getItem(PENDING_KEY);
    return value ? (JSON.parse(value) as Pending) : null;
  } catch {
    return null;
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomToken(): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}
