/**
 * Fixed protocol names shared with OAuth Base. This module reads nothing at
 * runtime, so both the browser code and vite.config.ts can import it.
 */

/** The header OAuth reads the API version from, as OAuth Base's AUTH_VERSION_HEADER names it. */
export const AUTH_VERSION_HEADER = "X-Auth-Version";
