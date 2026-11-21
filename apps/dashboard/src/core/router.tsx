import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";

import { App } from "@/core/App";
import { SignedIn } from "@/core/components/SignedIn";
import { Splash } from "@/core/components/Splash";
import { SessionProvider } from "@/core/contexts/Session";
import { DashboardLayout } from "@/core/layouts/dashboard/DashboardLayout";
import { accountLoader, callbackLoader, inviteLoader } from "@/core/lib/loaders";
import { routerBasename } from "@/core/lib/oauth";
import { routeObjects } from "@/core/lib/routes";
import PageError from "@/core/pages/PageError";
import RouteError from "@/core/pages/RouteError";

/** Loads a page module lazily and uses its default export as the route. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/**
 * The whole Codexa App frontend. Core owns the shell, and the dashboard pages
 * come from src/core/lib/routes.ts, which merges the built in pages with the
 * user's from src/overrides/routes.tsx.
 */
export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <App />,
      children: [
        {
          // Inside App, so an error page keeps the providers and the theme.
          element: <SessionProvider />,
          errorElement: <RouteError />,
          loader: accountLoader,
          shouldRevalidate: () => false,
          hydrateFallbackElement: <Splash />,
          children: [
            { path: "callback", loader: callbackLoader },
            { path: "invite", loader: inviteLoader, element: <Splash /> },
            {
              element: <SignedIn />,
              children: [
                {
                  element: <DashboardLayout />,
                  children: [
                    {
                      // Inside the layout, so a page that fails keeps the navigation.
                      errorElement: <PageError />,
                      children: [
                        ...routeObjects,
                        { path: "*", lazy: page(() => import("@/core/pages/NotFound")) },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  // "/app" from the Vite base, plus the account the URL names.
  { basename: routerBasename() },
);
