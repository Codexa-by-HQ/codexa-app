import { type LoaderFunctionArgs, redirect } from "react-router";

import { sessionStore } from "./session";

/**
 * Settles the session before any dashboard page renders, so a protected page
 * never flashes the signed out state. The store does the work once per page
 * load, which is why the route never revalidates this loader.
 */
export async function sessionLoader({ request }: LoaderFunctionArgs) {
  await sessionStore.load(new URL(request.url));
  return null;
}

/**
 * /app/callback, where OAuth returns. The shared load has exchanged the code
 * by now, so this only replaces the URL and keeps the one time code out of
 * history. A failed sign in shows its reason on the sign in page.
 */
export async function callbackLoader({ request }: LoaderFunctionArgs) {
  await sessionStore.load(new URL(request.url));
  return redirect("/");
}
