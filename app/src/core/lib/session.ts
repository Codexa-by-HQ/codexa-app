import { api, type ClientConfig, type SessionInfo, type Tokens } from "./api";
import { ApiError } from "./request";
import { brandingStore } from "./branding";
import {
  beginSignIn,
  completeSignIn,
  isCallbackUrl,
  SignInError,
  type SignInFailure,
} from "./oauth";

/**
 * The signed in session as an external store, read with useSyncExternalStore.
 *
 * Tokens stay in sessionStorage, scoped to one tab and cleared when it closes,
 * never in localStorage. The root route's loader settles the store before any
 * page renders, including finishing a sign in on /app/callback, so protected
 * pages never flash a signed out state.
 */

export type SessionState =
  | { status: "unknown" }
  | { status: "signedOut"; failure?: SignInFailure }
  | { status: "signedIn"; info: SessionInfo };

const TOKENS_KEY = "codexa-app:oauth:session";
/** Refresh this long before expiry, so a request never carries a dying token. */
const REFRESH_MARGIN_MS = 30_000;

let state: SessionState = { status: "unknown" };
let config: ClientConfig = { clientId: null, scopes: [] };
let loading: Promise<void> | null = null;
let refreshing: Promise<Tokens | null> | null = null;
const listeners = new Set<() => void>();

/** Every session change goes through here, and the branding follows the session. */
function publish(next: SessionState) {
  state = next;
  brandingStore.apply(next.status === "signedIn" ? next.info.application ?? null : null);
  for (const listener of listeners) listener();
}

function readTokens(): Tokens | null {
  try {
    const value = sessionStorage.getItem(TOKENS_KEY);
    return value ? (JSON.parse(value) as Tokens) : null;
  } catch {
    return null;
  }
}

function writeTokens(tokens: Tokens | null) {
  try {
    if (tokens) sessionStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
    else sessionStorage.removeItem(TOKENS_KEY);
  } catch {
    // Storage can be blocked. The session then lasts for this page view only.
  }
}

/**
 * One refresh at a time. OAuth revokes the whole token family when a refresh
 * token is used twice, so two parallel refreshes would sign the user out.
 */
function refresh(tokens: Tokens): Promise<Tokens | null> {
  refreshing ??= (async () => {
    if (!tokens.refreshToken || !config.clientId) return null;
    try {
      const next = await api.token.execute(config.clientId, {
        grant_type: "refresh_token",
        refresh_token: tokens.refreshToken,
      });
      writeTokens(next);
      return next;
    } catch {
      return null;
    }
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** The session behind the stored tokens, refreshing once when needed. */
async function resolveSession(): Promise<SessionState> {
  let tokens = readTokens();
  if (!tokens || !config.clientId) return { status: "signedOut" };

  if (tokens.expiresAt - REFRESH_MARGIN_MS <= Date.now()) tokens = await refresh(tokens);
  if (!tokens) return clearSession();

  try {
    return { status: "signedIn", info: await api.session.execute(tokens) };
  } catch (error) {
    // A token OAuth no longer accepts gets one refresh, then gives up.
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await refresh(tokens);
    if (!renewed) return clearSession();
    return { status: "signedIn", info: await api.session.execute(renewed) };
  }
}

function clearSession(failure?: SignInFailure): SessionState {
  writeTokens(null);
  return failure ? { status: "signedOut", failure } : { status: "signedOut" };
}

async function initialize(url: URL) {
  config = await api.clientConfig.execute();
  if (isCallbackUrl(url)) {
    try {
      writeTokens(await completeSignIn(config, url));
    } catch (error) {
      const failure = error instanceof SignInError ? error.reason : "failed";
      return publish(clearSession(failure));
    }
  }
  publish(await resolveSession());
}

export const sessionStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: (): SessionState => state,
  getConfig: (): ClientConfig => config,

  /**
   * Settles the session once per page load. Loaders may call it repeatedly,
   * they share the same work.
   */
  load(url: URL): Promise<void> {
    loading ??= initialize(url);
    return loading;
  },

  /** Leave for OAuth. The page unloads, so nothing is published. */
  signIn: (): Promise<void> => beginSignIn(config),

  /** Sign out locally at once, then revoke the token family with OAuth. */
  async signOut(): Promise<void> {
    const tokens = readTokens();
    publish(clearSession());
    if (tokens?.refreshToken && config.clientId) {
      await api.revoke.execute(config.clientId, tokens.refreshToken);
    }
  },
};
