import { api } from "@/core/lib/api";
import { ApiError } from "@/core/lib/request";
import { preferences } from "@/core/lib/utils";
import type { TClientConfig, TPendingSignIn, TSignInFailure, TTokens } from "@/core/types";

/**
 * Codexa App signs in as a public OAuth client, with authorization code and
 * PKCE, and OAuth keeps the refresh token in an httpOnly cookie on /oauth.
 *
 * - The access token lives only in this module's memory. Each tab and each
 *   reload gets its own by refreshing through the cookie.
 * - Refresh tokens rotate, and a reused one revokes its whole family, so tabs
 *   refresh one at a time through a Web Lock.
 * - The PKCE verifier waits in localStorage under its state, so a sign in can
 *   finish in another tab, as when a magic link opens from an email.
 * - Signing in or out is broadcast, so every tab follows.
 */

const BASE = import.meta.env.BASE_URL; // "/app/"
const PENDING_PREFIX = "codexa-app:oauth:pending:";
const PENDING_TTL_MS = 15 * 60_000;
/** Holds no secret: it only says whether this browser may have a session cookie. */
const SIGNED_IN_KEY = "codexa-app:signed-in";
const REFRESH_LOCK = "codexa-app:oauth:refresh";
const REFRESH_MARGIN_MS = 30_000;

export class SignInError extends Error {
  readonly reason: TSignInFailure;

  constructor(reason: TSignInFailure) {
    super(`Sign in ${reason}.`);
    this.reason = reason;
  }
}

let tokens: TTokens | null = null;
let refreshing: Promise<TTokens | null> | null = null;
const channel = "BroadcastChannel" in window ? new BroadcastChannel("codexa-app:session") : null;

/* Sign in */

export const redirectUri = () => `${location.origin}${BASE}callback`;

export const isCallbackUrl = (url: URL) => url.pathname === `${BASE}callback`;

/** A PKCE verifier and state kept for the callback, with where to land after it. */
async function pendingSignIn(returnTo?: string) {
  dropExpiredSignIns();
  const verifier = randomToken();
  const state = randomToken();
  const pending: TPendingSignIn = { verifier, expiresAt: Date.now() + PENDING_TTL_MS };
  if (returnTo && isAppPath(returnTo)) pending.returnTo = returnTo;
  preferences.set(PENDING_PREFIX + state, JSON.stringify(pending));
  return { state, challenge: await challengeFor(verifier) };
}

/**
 * Create PKCE and state, then leave for OAuth. `extra` carries an invitation
 * token, which OAuth checks and attaches to the transaction. `returnTo` is the
 * Codexa App page to open afterwards.
 */
export async function startSignIn(
  config: TClientConfig,
  extra: Record<string, string> = {},
  returnTo?: string,
): Promise<void> {
  if (!config.clientId) throw new SignInError("failed");
  const { state, challenge } = await pendingSignIn(returnTo);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: redirectUri(),
    scope: config.scopes.join(" "),
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    ...extra,
  });
  location.assign(`/oauth/authorize?${params}`);
}

/**
 * Move the session to another account the person belongs to. OAuth binds a
 * new authorization to that membership and rotates this session when its code
 * is exchanged on /app/callback, so the scopes never grow.
 */
export async function switchAccount(config: TClientConfig, accountId: string, returnTo?: string): Promise<void> {
  // OAuth binds a switch to the session's latest access token, which another
  // tab's refresh may have replaced, so this one is always fresh.
  const current = await accessTokens(config, true);
  if (!current || !config.clientId) throw new SignInError("failed");
  const { state, challenge } = await pendingSignIn(returnTo ?? `${BASE}${accountId}/`);
  const { redirectUri: next } = await api.accountSwitch.execute(current, accountId, {
    responseType: "code",
    clientId: config.clientId,
    redirectUri: redirectUri(),
    scopes: config.scopes,
    state,
    codeChallenge: challenge,
    codeChallengeMethod: "S256",
  });
  const target = new URL(next, location.origin);
  // Only this origin's callback or consent page, never an injected address.
  if (target.origin !== location.origin) throw new SignInError("failed");
  location.assign(target);
}

/**
 * Finish a sign in from the callback URL. Only a state this browser started
 * and has not used is accepted, so a callback can never be replayed. It
 * answers the page the sign in asked to return to.
 */
export async function finishSignIn(config: TClientConfig, url: URL): Promise<string | undefined> {
  const state = url.searchParams.get("state");
  const pending = state ? takePendingSignIn(state) : null;
  if (!pending) throw new SignInError("state");
  const { verifier } = pending;

  const error = url.searchParams.get("error");
  if (error) throw new SignInError(error === "access_denied" ? "denied" : "failed");

  const code = url.searchParams.get("code");
  if (!code || !config.clientId) throw new SignInError("failed");
  const clientId = config.clientId;

  try {
    setTokens(await exclusive(() =>
      api.token.execute(clientId, {
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri(),
        code_verifier: verifier,
      })
    ));
  } catch {
    throw new SignInError("failed");
  }
  channel?.postMessage("signedIn");
  return pending.returnTo;
}

/* Accounts in the URL */

const ACCOUNT_SEGMENT = /^([a-f\d]{24})(?=\/|$)/;

/** A path inside Codexa App, never one that leaves it or the origin. */
const isAppPath = (path: string) => path.startsWith(BASE) && !path.startsWith("//") && !path.includes("\\");

/** The account a dashboard URL names, as in /app/<accountId>/settings/users. */
export function accountInUrl(url: URL = new URL(location.href)): string | null {
  if (!url.pathname.startsWith(BASE)) return null;
  return url.pathname.slice(BASE.length).match(ACCOUNT_SEGMENT)?.[1] ?? null;
}

/**
 * The router's basename, decided once per page load: /app plus the account
 * the URL names. Every link stays relative to the account, and moving to
 * another account always loads the page again.
 */
export function routerBasename(): string {
  const accountId = accountInUrl();
  return accountId ? `${BASE}${accountId}` : BASE.replace(/\/$/, "");
}

/** The page after the account, such as "/settings/users?q=a". */
export function pageInAccount(url: URL): string {
  const rest = url.pathname.slice(BASE.length);
  const accountId = accountInUrl(url);
  const page = accountId ? rest.slice(accountId.length) : `/${rest}`;
  return (page.startsWith("/") ? page : `/${page}`) + url.search + url.hash;
}

/** A page of one account, such as accountUrl(id, "/settings/users"). */
export const accountUrl = (accountId: string, page = "/") => `${location.origin}${BASE}${accountId}${page}`;

/**
 * Where a finished sign in lands: the page it asked for, inside the account
 * the session now holds unless that page names an account itself.
 */
export function landingUrl(accountId: string, returnTo?: string): string {
  if (!returnTo) return accountUrl(accountId);
  const url = new URL(returnTo, location.origin);
  return accountInUrl(url) ? url.href : accountUrl(accountId, pageInAccount(url));
}

/* Tokens */

/** A live access token, refreshed through the cookie when it is about to expire. */
export async function accessTokens(config: TClientConfig, force = false): Promise<TTokens | null> {
  if (!force && tokens && tokens.expiresAt - REFRESH_MARGIN_MS > Date.now()) return tokens;
  refreshing ??= exclusive(() => refresh(config)).finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function refresh(config: TClientConfig): Promise<TTokens | null> {
  if (!config.clientId || preferences.get(SIGNED_IN_KEY) !== "1") return null;
  try {
    setTokens(await api.token.execute(config.clientId, { grant_type: "refresh_token" }));
  } catch (error) {
    // A refused cookie means signed out. A server failure does not.
    if (!(error instanceof ApiError) || error.status >= 500) throw error;
    setTokens(null);
  }
  return tokens;
}

/* The personal account area */

/** Leave for the account area, coming back to this page afterwards. */
export async function openAccountArea(config: TClientConfig, path = "/"): Promise<void> {
  const tokens = await accessTokens(config);
  if (!tokens) throw new SignInError("failed");
  const { redirectUri } = await api.handoff.execute(tokens, path, location.href);
  location.assign(redirectUri);
}

/* Sign out */

/** Forget the tokens here, tell the other tabs, then have OAuth revoke the family. */
export async function signOut(config: TClientConfig): Promise<void> {
  setTokens(null);
  channel?.postMessage("signedOut");
  const { clientId } = config;
  if (clientId) await exclusive(() => api.revoke.execute(clientId));
}

/** Hear when another tab signs in or out. Returns the unsubscribe function. */
export function onSessionChange(listener: (event: "signedIn" | "signedOut") => void) {
  const handle = (event: MessageEvent) => {
    if (event.data === "signedOut") setTokens(null);
    // Another tab holds a new session, perhaps for another account, so the
    // next call refreshes through the cookie instead of the old token.
    if (event.data === "signedIn") tokens = null;
    listener(event.data);
  };
  channel?.addEventListener("message", handle);
  return () => channel?.removeEventListener("message", handle);
}

/* Helpers */

function setTokens(next: TTokens | null) {
  tokens = next;
  if (next) preferences.set(SIGNED_IN_KEY, "1");
  else preferences.remove(SIGNED_IN_KEY);
}

/** Runs `task` while no other tab of this browser holds the refresh lock. */
function exclusive<T>(task: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request(REFRESH_LOCK, task) : task();
}

/** A pending sign in, or null when it is missing or expired. */
function readPending(key: string): TPendingSignIn | null {
  try {
    const pending = JSON.parse(preferences.get(key) ?? "null") as TPendingSignIn | null;
    return pending && typeof pending.verifier === "string" && pending.expiresAt > Date.now() ? pending : null;
  } catch {
    return null;
  }
}

/** Each pending sign in works once. */
function takePendingSignIn(state: string): TPendingSignIn | null {
  const pending = readPending(PENDING_PREFIX + state);
  preferences.remove(PENDING_PREFIX + state);
  return pending;
}

/** Abandoned sign ins never pile up. */
function dropExpiredSignIns() {
  for (const key of preferences.keys()) {
    if (key.startsWith(PENDING_PREFIX) && !readPending(key)) preferences.remove(key);
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
