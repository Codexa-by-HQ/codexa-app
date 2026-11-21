import type { TSectionsOverride } from "@/core/types";

/**
 * Your rail sections. A page joins one through `section` in
 * src/overrides/routes.tsx, and a section with no visible page stays hidden.
 *
 *   sales: { name: "nav.sales", icon: ShoppingBag01Icon, priority: 20 },
 *
 * Built in keys: home (priority 0) and settings (priority 100).
 */
export const sections: TSectionsOverride = {};
