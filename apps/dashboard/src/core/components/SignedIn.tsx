import { Outlet } from "react-router";

import { useSession } from "@/core/contexts/Session";
import SignIn from "@/core/pages/SignIn";

/**
 * The sign in gate. Signed out, the sign in page renders at the same URL, so
 * signing out never navigates and every dashboard link stays shareable.
 */
export function SignedIn() {
  const { session } = useSession();
  return session ? <Outlet /> : <SignIn />;
}
