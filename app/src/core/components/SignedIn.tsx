import { Outlet } from "react-router";

import { Splash } from "@/core/components/Splash";
import { useSession } from "@/core/hooks/useSession";
import SignIn from "@/core/pages/SignIn";

/**
 * The sign in gate. Signed in, the dashboard renders. Signed out, the sign in
 * page renders at the same URL, so signing out never navigates and every
 * dashboard link stays shareable.
 */
export function SignedIn() {
  const { state } = useSession();
  if (state.status === "signedIn") return <Outlet />;
  if (state.status === "signedOut") return <SignIn />;
  return <Splash />;
}
