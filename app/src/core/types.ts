import type { IconSvgElement } from "@hugeicons/react";
import type { RouteObject } from "react-router";

/**
 * A dashboard route. A route with a `name` appears in the sidebar and the
 * breadcrumb, everything else is a plain react-router route.
 */
export type TRouteObject = RouteObject & {
  /** Translation key shown in the sidebar and breadcrumb. */
  name?: string;
  icon?: IconSvgElement;
  /** Lower comes first in the sidebar. Defaults to 50. */
  priority?: number;
  /** Translation key of the sidebar group. Ungrouped routes come first. */
  group?: string;
  /** False keeps a named route out of the sidebar, for detail pages. */
  display?: boolean;
};

/**
 * Your routes, keyed by name. A key that matches a built in route replaces it,
 * or extends it when `merge` is true, so you can swap just its page and keep
 * its icon and position. Built in keys: overview, account.
 */
export type TRoutesOverride = Record<string, TRouteObject & { merge?: boolean }>;

/** What each route carries for the sidebar and breadcrumb, via route handles. */
export type TRouteHandle = { name?: string; icon?: IconSvgElement };
