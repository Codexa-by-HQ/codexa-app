import React from "react";
import { Outlet, useLoaderData } from "react-router";

import { ConfirmHost } from "@/core/contexts/Confirm";
import { SheetHost } from "@/core/contexts/Sheet";
import { type accountLoader, reloadSession } from "@/core/lib/loaders";
import {
  accountInUrl,
  accountUrl,
  onSessionChange,
  openAccountArea,
  signOut,
  startSignIn,
  switchAccount,
} from "@/core/lib/oauth";
import { applyBranding } from "@/core/lib/utils";
import type { TApplication, TSessionContext, TSessionInfo } from "@/core/types";

/**
 * Who is signed in, and the actions on it. The session route's loader settles
 * it before any page renders. This provider keeps it as state, and follows
 * other tabs signing in or out through its handle.
 */

const SessionContext = React.createContext<TSessionContext | null>(null);
const handle = React.createRef<{ update: (session: TSessionInfo | null) => void }>();

function show(session: TSessionInfo | null) {
  applyBranding(session?.application ?? null);
  handle.current?.update(session);
}

/**
 * Another tab signed in, out, or switched account. The browser holds one
 * session, so this tab follows it, and a different account opens its own
 * page rather than showing the old one's data.
 */
onSessionChange(async (event) => {
  const session = event === "signedOut" ? null : await reloadSession().catch(() => null);
  const named = accountInUrl();
  if (session && named && session.accountId !== named) {
    location.replace(accountUrl(session.accountId));
    return;
  }
  show(session);
});

/** The page to come back to after signing in, when it is a dashboard page. */
const currentPage = () => location.pathname + location.search;

export function SessionProvider() {
  const { config, session: loaded, failure, memberships } = useLoaderData<typeof accountLoader>();
  const [session, setSession] = React.useState(loaded);

  React.useImperativeHandle(handle, () => ({ update: setSession }), []);

  const value = React.useMemo<TSessionContext>(() => ({
    session,
    failure: session ? undefined : failure,
    canSignIn: config.clientId !== null,
    signIn: () => startSignIn(config, {}, currentPage()),
    openAccount: (path) => openAccountArea(config, path),
    memberships,
    switchAccount: (accountId) => switchAccount(config, accountId),
    signOut: async () => {
      show(null);
      await signOut(config);
    },
  }), [config, session, failure, memberships]);

  return (
    <SessionContext value={value}>
      <Outlet />
      {/* Inside the session, so a sheet or dialog can use it. */}
      <SheetHost />
      <ConfirmHost />
    </SessionContext>
  );
}

export function useSession() {
  const context = React.useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}

/** The session on a page behind the sign in gate, where it always exists. */
export function useSignedInSession(): TSessionInfo {
  const { session } = useSession();
  if (!session) throw new Error("useSignedInSession is only available on signed in pages");
  return session;
}

/**
 * The signed in application, whose branding the UI wears. Null outside the
 * session too, so the error page, which replaces the session route, still renders.
 */
export function useBranding(): TApplication | null {
  return React.useContext(SessionContext)?.session?.application ?? null;
}
