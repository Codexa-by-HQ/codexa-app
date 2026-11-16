import type { ComponentType } from "react";
import type { RouteObject } from "react-router";
import type { IconSvgElement } from "@hugeicons/react";
import { DashboardSquare01Icon, UserCircleIcon } from "@hugeicons/core-free-icons";

import type { TRouteHandle, TRouteObject } from "@/core/types";
import { routes as overrides } from "@/overrides/routes";

/** Loads a page module lazily and uses its default export as the route. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/** Core's own dashboard routes. Each can be replaced or extended by key. */
const BUILT_IN: Record<string, TRouteObject> = {
  overview: {
    index: true,
    name: "nav.overview",
    icon: DashboardSquare01Icon,
    priority: 0,
    lazy: page(() => import("@/core/pages/Overview")),
  },
  account: {
    path: "account",
    name: "nav.account",
    icon: UserCircleIcon,
    priority: 100,
    lazy: page(() => import("@/core/pages/Account")),
  },
};

const DEFAULT_PRIORITY = 50;

/** The fields that say how a route renders. */
const RENDERER_KEYS = ["lazy", "Component", "element"];
/** The sidebar fields, which react-router does not know. */
const SIDEBAR_KEYS = ["name", "icon", "priority", "group", "display"];

/** A copy of `route` without `keys`. */
function omit(route: object, keys: readonly string[]): object {
  return Object.fromEntries(Object.entries(route).filter(([key]) => !keys.includes(key)));
}

/**
 * Lays routes over each other, later ones winning. Spreading route unions
 * loses their `index` discriminant, so the result is typed here once.
 */
function layer(...routes: object[]): TRouteObject {
  return Object.assign({}, ...routes) as TRouteObject;
}

/**
 * A built in route combined with the user's override of the same key. An
 * override replaces the built in, unless it sets `merge`, in which case it is
 * laid over it. A merged override that brings its own page drops the built in
 * page, so the two never both render.
 */
function resolve(key: string): TRouteObject | undefined {
  const builtIn = BUILT_IN[key];
  const override = overrides[key];
  if (!override) return builtIn;

  const route = omit(override, ["merge"]);
  if (!override.merge || !builtIn) return layer(route);

  const rendersItself = RENDERER_KEYS.some((field) => field in override);
  return layer(rendersItself ? omit(builtIn, RENDERER_KEYS) : builtIn, route);
}

/** Every dashboard route, built in and the user's, in sidebar order. */
const dashboardRoutes = [...new Set([...Object.keys(BUILT_IN), ...Object.keys(overrides)])]
  .flatMap((key) => {
    const route = resolve(key);
    return route ? [{ key, route }] : [];
  })
  .sort((a, b) =>
    (a.route.priority ?? DEFAULT_PRIORITY) - (b.route.priority ?? DEFAULT_PRIORITY)
  );

/**
 * The routes for react-router. The sidebar fields move into each route's
 * handle, where the breadcrumb reads them with useMatches.
 */
export const routeObjects: RouteObject[] = dashboardRoutes.map(({ route }) => ({
  ...omit(route, SIDEBAR_KEYS),
  handle: { name: route.name, icon: route.icon } satisfies TRouteHandle,
} as RouteObject));

export type NavItem = {
  key: string;
  to: string;
  /** Translation key. */
  name: string;
  icon?: IconSvgElement;
  /** Translation key of its group, if any. */
  group?: string;
  /** Matches only the exact path, for the index route. */
  end: boolean;
};

/** What the sidebar lists: named routes that did not opt out. */
export const navigation: NavItem[] = dashboardRoutes.flatMap(({ key, route }) =>
  route.name && route.display !== false
    ? [{
      key,
      to: route.index ? "/" : `/${route.path ?? key}`,
      name: route.name,
      icon: route.icon,
      group: route.group,
      end: route.index === true,
    }]
    : []
);
