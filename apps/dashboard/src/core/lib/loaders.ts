import { type LoaderFunctionArgs, redirect } from "react-router";

import { api } from "@/core/lib/api";
import {
  accessTokens,
  accountInUrl,
  accountUrl,
  finishSignIn,
  isCallbackUrl,
  landingUrl,
  pageInAccount,
  SignInError,
  startSignIn,
  switchAccount,
} from "@/core/lib/oauth";
import { ApiError } from "@/core/lib/request";
import { applyBranding, readFilters } from "@/core/lib/utils";
import type {
  TApplicationData,
  TClientConfig,
  TDeviceData,
  TFilterModel,
  TListData,
  TListItem,
  TListResource,
  TSessionData,
  TSessionInfo,
  TTokens,
} from "@/core/types";

let initial: Promise<TSessionData> | null = null;

/**
 * Settles who is signed in before any dashboard page renders, so no page
 * flashes a signed out state. It runs once per page load, and on
 * /app/callback it first finishes the sign in.
 */
export function sessionLoader({ request }: Pick<LoaderFunctionArgs, "request">): Promise<TSessionData> {
  initial ??= loadSession(new URL(request.url));
  return initial;
}

/**
 * /app/callback replaces its URL, so the one time code leaves history, and
 * opens the account the session now holds.
 */
export async function callbackLoader(args: LoaderFunctionArgs) {
  const { session, returnTo } = await sessionLoader(args);
  if (!session) return redirect("/");
  return leaveFor(landingUrl(session.accountId, returnTo));
}

/**
 * Load another Codexa App page in place. The router's basename names the
 * account, so moving between accounts, or into one, needs a fresh page load,
 * and replacing keeps a one time code or a bare URL out of history.
 */
function leaveFor(url: string): Promise<never> {
  location.replace(url);
  return new Promise<never>(() => {});
}

/**
 * The session route. Every dashboard URL names its account, as in
 * /app/<accountId>/settings. A URL without one opens the session's account,
 * and a link to another account the person belongs to switches to it.
 */
export async function accountLoader({ request }: Pick<LoaderFunctionArgs, "request">): Promise<TSessionData> {
  const data = await sessionLoader({ request });
  const url = new URL(request.url);
  const { session } = data;
  if (!session || isCallbackUrl(url) || url.pathname === `${import.meta.env.BASE_URL}invite`) return data;
  const named = accountInUrl(url);
  if (named === session.accountId) return data;
  if (!named || !data.memberships.some((membership) => membership.accountId === named)) {
    return leaveFor(accountUrl(session.accountId, named ? "/" : pageInAccount(url)));
  }
  try {
    await switchAccount(data.config, named, url.pathname + url.search);
  } catch {
    return leaveFor(accountUrl(session.accountId));
  }
  // The browser is leaving for OAuth, so nothing renders meanwhile.
  return new Promise<never>(() => {});
}

async function loadSession(url: URL): Promise<TSessionData> {
  const config = await api.clientConfig.execute();
  let returnTo: string | undefined;
  if (isCallbackUrl(url)) {
    try {
      returnTo = await finishSignIn(config, url);
    } catch (error) {
      return { config, session: null, memberships: [], failure: error instanceof SignInError ? error.reason : "failed" };
    }
  }
  const session = await readSession(config);
  applyBranding(session?.application ?? null);
  const memberships = session
    ? await authorized(config, (tokens) => api.memberships.execute(tokens)).catch(() => [])
    : [];
  return { config, session, memberships, returnTo };
}

/**
 * /app/invite, the link in an invitation email. It signs the invitee in, or
 * up, with the invitation token, and OAuth adds them to the account.
 */
export async function inviteLoader({ request }: LoaderFunctionArgs) {
  const { config } = await sessionLoader({ request });
  const token = new URL(request.url).searchParams.get("invite_token") ?? "";
  if (!/^[\w-]{16,512}$/.test(token)) return redirect("/");
  await startSignIn(config, { invite_token: token, screen_hint: "signup" });
  return null;
}

/** Rows per Settings list page. */
export const LIST_PAGE_SIZE = 20;

/**
 * A Settings list: one page of a management list, with the filters and page
 * from the URL, so a filtered page can be shared and reloaded.
 */
export function listLoader(resource: TListResource) {
  return async ({ request }: LoaderFunctionArgs): Promise<TListData> => {
    const { config } = await sessionLoader({ request });
    const params = new URL(request.url).searchParams;
    const pageNumber = Math.max(1, Number(params.get("page")) || 1);
    const query: Record<string, string> = {
      limit: String(LIST_PAGE_SIZE),
      offset: String((pageNumber - 1) * LIST_PAGE_SIZE),
    };
    // Only filters on the list's own columns, with values that suit them, reach OAuth.
    const filters = readFilters(params.get("filters"), resource.filters ?? []);
    if (filters.length) query.filters = JSON.stringify(filters);
    const page = await authorized(config, (tokens) => api.list.execute(tokens, resource.path, query, request.signal))
      .catch((error) => {
        if (error instanceof SignInError) throw redirect("/");
        throw error;
      });
    const labels = await remoteLabels(config, resource, filters);
    return { resource, page, filters, labels };
  };
}

/**
 * Names for the record ids in applied filters, such as accounts, read in
 * parallel. A record that cannot be read shows its id.
 */
async function remoteLabels(config: TClientConfig, resource: TListResource, filters: TFilterModel[]) {
  const ids = filters.flatMap((model) => {
    const remote = resource.filters?.find((entry) => entry.id === model.columnId)?.remote;
    return remote ? model.values.map((id) => ({ id: String(id), remote })) : [];
  });
  const pairs = await Promise.all(ids.map(async ({ id, remote }) => {
    try {
      const record = await authorized(config, (tokens) => api.read.execute(tokens, `${remote.path}/detail`, { id }));
      return [id, String(record[remote.labelKey] ?? id)] as const;
    } catch {
      return [id, id] as const;
    }
  }));
  return Object.fromEntries(pairs);
}

/** An OAuth app and its credentials, for /settings/applications/:appId. */
export async function applicationLoader({ request, params }: LoaderFunctionArgs): Promise<TApplicationData> {
  const { config } = await sessionLoader({ request });
  const id = params.appId ?? "";
  try {
    const [application, credentials, providers] = await authorized(config, (tokens) =>
      Promise.all([
        api.read.execute(tokens, "/management/oauth-apps/detail", { id }),
        api.list.execute(tokens, "/management/oauth-credentials", { appId: id, limit: "100" }, request.signal),
        // Without oauth-sso the route does not exist, and without sso:providers:read
        // the person may not see providers, so either way the page leaves them out.
        api.ssoProviders.execute(tokens, id).then(
          (page) => page.items,
          (error) => {
            if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
            throw error;
          },
        ),
      ])
    );
    return { application: application as TListItem, credentials: credentials.items, providers };
  } catch (error) {
    if (error instanceof SignInError) throw redirect("/");
    throw error;
  }
}

/** A code as a person might type it, such as "abcd efgh", normalised to "ABCD-EFGH". */
const USER_CODE = /^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/;

/**
 * The device page. A code from the link or the form is looked up, so the
 * person sees which app asks and for what before deciding.
 */
export async function deviceLoader({ request }: LoaderFunctionArgs): Promise<TDeviceData> {
  const { config, session } = await sessionLoader({ request });
  const raw = new URL(request.url).searchParams.get("user_code")?.trim().toUpperCase().replace(/\s+/g, "") ?? "";
  // Signed out, the sign in screen shows in place of this page and keeps its
  // URL, so the code survives the sign in.
  if (!raw || !session) return { state: "enter" };
  if (!USER_CODE.test(raw)) return { state: "invalid", userCode: raw };
  const userCode = raw.includes("-") ? raw : `${raw.slice(0, 4)}-${raw.slice(4)}`;
  try {
    const found = await authorized(config, (tokens) => api.deviceRequest.execute(tokens, userCode));
    return { state: "review", userCode, request: found };
  } catch (error) {
    if (error instanceof SignInError) throw redirect("/");
    if (error instanceof ApiError && error.status === 404) return { state: "unavailable", userCode };
    if (error instanceof ApiError && error.status < 500) return { state: "invalid", userCode };
    throw error;
  }
}

/** The session again, when another tab signed in. */
export async function reloadSession(): Promise<TSessionInfo | null> {
  return initial ? readSession((await initial).config) : null;
}

/** The session behind the cookie. */
async function readSession(config: TClientConfig): Promise<TSessionInfo | null> {
  try {
    return await authorized(config, (tokens) => api.session.execute(tokens));
  } catch (error) {
    if (error instanceof SignInError) return null;
    throw error;
  }
}

/**
 * Runs a call with a live access token. A token OAuth rejects gets one
 * refresh, since it may have been revoked or rotated in another tab.
 */
async function authorized<T>(config: TClientConfig, call: (tokens: TTokens) => Promise<T>): Promise<T> {
  const tokens = await accessTokens(config);
  if (!tokens) throw new SignInError("failed");
  try {
    return await call(tokens);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const renewed = await accessTokens(config, true);
    if (!renewed) throw new SignInError("failed");
    return call(renewed);
  }
}

/** A management call from a page action, such as saving a form. */
export async function withTokens<T>(call: (tokens: TTokens) => Promise<T>): Promise<T> {
  if (!initial) throw new SignInError("failed");
  return authorized((await initial).config, call);
}
