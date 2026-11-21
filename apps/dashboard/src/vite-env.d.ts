/// <reference types="vite/client" />

/** VITE_ variables this app reads. Every one is optional, see src/core/lib/env.ts. */
interface ImportMetaEnv {
  readonly VITE_OAUTH_PATH?: string;
  readonly VITE_AUTH_API_PATH?: string;
  readonly VITE_AUTH_API_VERSION?: string;
  readonly VITE_REQUEST_TIMEOUT_MS?: string;
  readonly VITE_BRAND_URL?: string;
  readonly VITE_ENABLE_THEME_SWITCHER?: string;
  readonly VITE_ENABLE_LANGUAGE_SWITCHER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
