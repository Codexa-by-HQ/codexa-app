import babel from "@rolldown/plugin-babel";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

import { sonnerStyles } from "./vite/sonnerStyles.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read without a prefix filter. Only VITE_ variables ever reach the browser.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.CODEXA_HOST_URL || "http://localhost:8000";

  return {
    base: "/app/",
    // React Compiler memoises components and values, so code needs no hand written useMemo.
    plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss(), sonnerStyles()],
    server: {
      host: "localhost",
      port: Number(env.DEV_PORT || 5173),
      strictPort: true,
      // The app is served by Vite. OAuth and the runtime config come from the host.
      // OAuth keeps Codexa App's refresh token in a cookie only for requests from
      // the host origin, so the proxy presents that origin.
      proxy: {
        "/oauth": { target, headers: { origin: target } },
        "/auth": { target },
        "/app/config.json": { target },
      },
    },
    preview: {
      host: "localhost",
      port: Number(env.PREVIEW_PORT || 4173),
      strictPort: true,
    },
    // "@/..." resolves from the paths in tsconfig, so the alias lives in one place.
    resolve: { tsconfigPaths: true },
  };
});
