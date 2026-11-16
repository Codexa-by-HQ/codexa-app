import type { ComponentType } from "react";
import { createBrowserRouter } from "react-router";

import { App } from "@/core/App";
import { SignedIn } from "@/core/components/SignedIn";
import { Splash } from "@/core/components/Splash";
import { DashboardLayout } from "@/core/layouts/sidebar/DashboardLayout";
import { callbackLoader, sessionLoader } from "@/core/lib/loaders";
import { routeObjects } from "@/core/lib/routes";
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
          // The session loads here rather than on App for the same reason.
          errorElement: <RouteError />,
          loader: sessionLoader,
          shouldRevalidate: () => false,
          hydrateFallbackElement: <Splash />,
          children: [
            { path: "callback", loader: callbackLoader },
            {
              element: <SignedIn />,
              children: [
                {
                  element: <DashboardLayout />,
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
  // "/app/" from the Vite base, without its trailing slash.
  { basename: import.meta.env.BASE_URL.replace(/\/$/, "") },
);
