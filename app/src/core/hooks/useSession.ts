import { useSyncExternalStore } from "react";

import type { SessionInfo } from "@/core/lib/api";
import { sessionStore } from "@/core/lib/session";

/**
 * The signed in session and the actions on it. Re-renders only when the
 * session changes, such as after signing out.
 */
export function useSession() {
  const state = useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot);
  return {
    state,
    /** False until setup created a client and the host passed its id. */
    canSignIn: sessionStore.getConfig().clientId !== null,
    signIn: sessionStore.signIn,
    signOut: sessionStore.signOut,
  };
}

/**
 * The session on a page behind the sign in gate, where it always exists.
 * Throws if used outside it, which is a bug rather than a state to handle.
 */
export function useSessionInfo(): SessionInfo {
  const { state } = useSession();
  if (state.status !== "signedIn") {
    throw new Error("useSessionInfo is only available on signed in pages.");
  }
  return state.info;
}
