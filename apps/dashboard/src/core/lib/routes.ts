import type { ComponentType } from "react";
import { data, type LoaderFunctionArgs, type RouteObject } from "react-router";

import {
  ACCOUNT_ICON,
  BUILT_IN_SECTIONS,
  SETTINGS_RESOURCES,
} from "@/core/config/navigation";
import { applicationLoader, deviceLoader, listLoader, sessionLoader } from "@/core/lib/loaders";
import type { TNavItem, TNavSection, TRouteHandle, TRouteObject } from "@/core/types";
import { routes as overrides } from "@/overrides/routes";
import { sections as sectionOverrides } from "@/overrides/sections";

const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

const DEFAULT_PRIORITY = 50;

/** Core's own pages. Each can be replaced or extended by key from overrides. */
const BUILT_IN: Record<string, TRouteObject> = {
  overview: {
    index: true,
    name: "nav.overview",
    icon: BUILT_IN_SECTIONS.home.icon,
    section: "home",
    priority: 0,
    lazy: page(() => import("@/core/pages/Overview")),
  },
  account: {
    path: "account",
    name: "nav.account",
    icon: ACCOUNT_ICON,
    section: "settings",
    priority: 0,
    lazy: page(() => import("@/core/pages/Account")),
  },
  ...Object.fromEntries(SETTINGS_RESOURCES.map((resource, index) => [
    resource.key,
    {
      path: `settings/${resource.key}`,
      name: `${resource.strings}.title`,
      icon: resource.icon,
      section: "settings",
      group: resource.group,
      capability: resource.capability,
      priority: 10 + index,
      loader: listLoader(resource),
      lazy: page(() => import("@/core/pages/ResourceList")),
    } satisfies TRouteObject,
  ])),
  // Where a TV or command line sends people to approve its code.
  device: {
    path: "device",
    name: "nav.device",
    icon: ACCOUNT_ICON,
    section: "home",
    display: false,
    loader: deviceLoader,
    lazy: page(() => import("@/core/pages/Device")),
  },
  application: {
    path: "settings/applications/:appId",
    name: "nav.application",
    icon: SETTINGS_RESOURCES.find((resource) => resource.key === "applications")?.icon,
    section: "settings",
    display: false,
    capability: "applications:read",
    loader: applicationLoader,
    lazy: page(() => import("@/core/pages/settings/Application")),
  },
};

const RENDERER_KEYS = ["lazy", "Component", "element"];
const NAVIGATION_KEYS = ["name", "icon", "section", "group", "priority", "display", "capability"];

function omit(route: object, keys: readonly string[]): object {
  return Object.fromEntries(Object.entries(route).filter(([key]) => !keys.includes(key)));
}

/** Spreading route unions loses their `index` discriminant, so it is typed once here. */
function layer(...routes: object[]): TRouteObject {
  return Object.assign({}, ...routes) as TRouteObject;
}

/**
 * A built in route combined with the user's override of the same key. An
 * override replaces it, or with `merge` is laid over it. A merged override
 * that renders itself drops the built in page, so the two never both render.
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

const byPriority = (a: { priority?: number }, b: { priority?: number }) =>
  (a.priority ?? DEFAULT_PRIORITY) - (b.priority ?? DEFAULT_PRIORITY);

const dashboardRoutes = [...new Set([...Object.keys(BUILT_IN), ...Object.keys(overrides)])]
  .flatMap((key) => {
    const route = resolve(key);
    return route ? [{ key, ...route } as TRouteObject & { key: string }] : [];
  })
  .sort(byPriority);

/**
 * A page the session may not see is refused before its loader runs, so a
 * typed or shared URL shows "no access" rather than a failed request. OAuth's
 * guard still decides every call the page makes.
 */
function gated(route: TRouteObject): TRouteObject {
  const { capability, loader } = route;
  if (!capability) return route;
  return layer(route, {
    loader: async (args: LoaderFunctionArgs) => {
      const { session } = await sessionLoader(args);
      if (session && !session.capabilities.includes(capability)) throw data(null, { status: 403 });
      return typeof loader === "function" ? loader(args) : null;
    },
  });
}

/** The routes for react-router. The navigation fields move into each handle. */
export const routeObjects: RouteObject[] = dashboardRoutes.map((route) => ({
  ...omit(gated(route), [...NAVIGATION_KEYS, "key"]),
  handle: { name: route.name, icon: route.icon } satisfies TRouteHandle,
} as RouteObject));

const navItems: TNavItem[] = dashboardRoutes.flatMap((route) =>
  route.name && route.display !== false
    ? [{
      key: route.key,
      to: route.index ? "/" : `/${route.path ?? route.key}`,
      name: route.name,
      icon: route.icon,
      section: route.section ?? "home",
      group: route.group,
      capability: route.capability,
      end: route.index === true,
    }]
    : []
);

const allSections = Object.entries({ ...BUILT_IN_SECTIONS, ...sectionOverrides })
  .map(([key, section]) => ({ key, ...section }))
  .sort(byPriority);

/**
 * The sections and pages the signed in user may see, from the capabilities
 * OAuth evaluated for this session. A section with no visible page is hidden.
 */
export function navigationFor(capabilities: readonly string[]): TNavSection[] {
  return allSections
    .map((section) => ({
      ...section,
      items: navItems.filter((item) =>
        item.section === section.key && (!item.capability || capabilities.includes(item.capability))
      ),
    }))
    .filter((section) => section.items.length > 0);
}
