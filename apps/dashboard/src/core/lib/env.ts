/**
 * Build time settings from `VITE_` variables, each with the default used when
 * it is unset. Vite inlines them into the bundle, so change one and rebuild.
 * See app/.env.example.
 */
export const env = {
  /** Where OAuth serves its token and revocation endpoints. */
  oauthPath: import.meta.env.VITE_OAUTH_PATH || "/oauth",
  /** Where OAuth serves its versioned API, such as the session lookup. */
  authApiPath: import.meta.env.VITE_AUTH_API_PATH || "/auth",
  /** Sent as X-Auth-Version on every versioned OAuth call. */
  authApiVersion: import.meta.env.VITE_AUTH_API_VERSION || "1.0.0",
  /** Target of the "Powered by" link. */
  brandUrl: import.meta.env.VITE_BRAND_URL || "https://github.com/Codexa-by-HQ",
  /** How long one request may take before it is abandoned. */
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS) || 15_000,
} as const;

/** True unless the variable says otherwise with false, 0, off or no. */
const flag = (value: string | undefined) =>
  !["false", "0", "off", "no"].includes((value ?? "").trim().toLowerCase());

/**
 * Features that can be switched off per deployment. Every one is on unless
 * its `VITE_ENABLE_` variable is falsy. They only hide UI.
 */
export const features = {
  /** Light, dark and system toggle in the header. */
  themeSwitcher: flag(import.meta.env.VITE_ENABLE_THEME_SWITCHER),
  /** Language picker in the header. */
  languageSwitcher: flag(import.meta.env.VITE_ENABLE_LANGUAGE_SWITCHER),
} as const;
