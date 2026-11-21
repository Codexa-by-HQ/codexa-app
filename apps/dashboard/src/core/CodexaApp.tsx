import "@/core/i18n";

import { RouterProvider } from "react-router/dom";

import { router } from "@/core/router";

/** The Codexa App frontend, ready to render. src/main.tsx mounts it. */
export function CodexaApp() {
  return <RouterProvider router={router} />;
}
