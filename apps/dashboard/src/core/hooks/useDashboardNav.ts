import { useLocation } from "react-router";

import { useSignedInSession } from "@/core/contexts/Session";
import { navigationFor } from "@/core/lib/routes";

/**
 * The sections and pages this session may see, and the section of the current
 * page, so the rail and the section sidebar always agree.
 */
export function useDashboardNav() {
  const { capabilities } = useSignedInSession();
  // The router strips the /app basename, so paths compare as the routes declare them.
  const { pathname } = useLocation();
  const sections = navigationFor(capabilities ?? []);
  const active = sections.find((section) =>
    section.items.some((item) =>
      item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`)
    )
  ) ?? sections[0];

  return { sections, active };
}
