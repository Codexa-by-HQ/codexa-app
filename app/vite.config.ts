import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import tailwindcss from "@tailwindcss/vite";

import { sonnerStyles } from "./vite/sonnerStyles.ts";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Read without a prefix filter. Only VITE_ variables ever reach the browser.
  const env = loadEnv(mode, process.cwd(), "");
  const target = env.CODEXA_HOST_URL || "http://127.0.0.1:8000";

  return {
    base: "/app/",
    plugins: [react(), tailwindcss(), sonnerStyles()],
    server: {
      host: "127.0.0.1",
      port: Number(env.DEV_PORT || 5173),
      strictPort: true,
      // The app is served by Vite. OAuth and the runtime config come from the host.
      proxy: {
        "/oauth": { target },
        "/auth": { target },
        "/app/config.json": { target },
      },
    },
    preview: {
      host: "127.0.0.1",
      port: Number(env.PREVIEW_PORT || 4173),
      strictPort: true,
    },
    // "@/..." resolves from the paths in tsconfig, so the alias lives in one place.
    resolve: { tsconfigPaths: true },
  };
});
