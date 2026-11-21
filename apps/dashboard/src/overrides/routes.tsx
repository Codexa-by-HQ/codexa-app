import type { TRoutesOverride } from "@/core/types";

/**
 * Your dashboard routes. Everything outside `src/core/` is yours, and this is
 * where your pages join the dashboard. A route with a `name` appears in the
 * sidebar, ordered by `priority`.
 *
 * Add a page:
 *
 *   reports: {
 *     path: "reports",
 *     name: "nav.reports",          // a key in src/locales/<lang>/translation.json
 *     icon: Analytics01Icon,        // from @hugeicons/core-free-icons
 *     priority: 20,
 *     lazy: async () => ({ Component: (await import("@/pages/Reports")).default }),
 *   },
 *
 * Replace a built in route by its key, or extend it with `merge: true` to keep
 * its icon and position and swap only the page:
 *
 *   overview: { merge: true, Component: MyOverview },
 *
 * Give a page `section` to place it on the rail, and `group` to group it in the
 * section sidebar. Built in keys: overview, account, and the Settings lists
 * accounts, users, members, invites, roles, policies, applications, sessions
 * and consents.
 */
export const routes: TRoutesOverride = {};
