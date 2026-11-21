import { createElement } from "react";
import { Badge } from "@/components/ui/badge";
import i18n from "@/core/i18n";
import {
  Building03Icon,
  CheckListIcon,
  DashboardSquare01Icon,
  GridViewIcon,
  LaptopIcon,
  MailAdd01Icon,
  PolicyIcon,
  Settings02Icon,
  ShieldUserIcon,
  UserCircleIcon,
  UserGroupIcon,
  UserMultipleIcon,
} from "@hugeicons/core-free-icons";

import { describeCondition, describeDevice, formatDate, type TExprNode, valueAt } from "@/core/lib/utils";
import { column } from "@/core/config/filters";
import { ACCOUNT_TYPES } from "@/core/lib/validation";
import type { TListItem, TListResource, TRouteObject, TSection } from "@/core/types";

const isActive = (item: TListItem) => item.isActive !== false;

/** The rail sections core ships. Users add their own in overrides/sections.ts. */
export const BUILT_IN_SECTIONS: Record<string, Omit<TSection, "key">> = {
  home: { name: "nav.home", icon: DashboardSquare01Icon, priority: 0 },
  settings: { name: "nav.settings", icon: Settings02Icon, priority: 100 },
};

/**
 * Organisation management, each a list of one OAuth management resource with
 * its filters, forms and actions. Each capability decides whether a page,
 * button or action shows. OAuth's guard on the API still decides access, so
 * hiding one is only convenience.
 */
export const SETTINGS_RESOURCES: (TListResource & {
  icon: TRouteObject["icon"];
  group: string;
  capability: string;
})[] = [
  {
    key: "accounts",
    path: "/management/accounts",
    strings: "settings.accounts",
    icon: Building03Icon,
    group: "settings.groups.organisation",
    capability: "accounts:list",
    create: "accounts:create",
    edit: "accounts:update",
    actions: [{ key: "archive", capability: "accounts:archive", path: "/management/accounts/archive", destructive: true, when: isActive }],
    filters: [
      column.text("name", "fields.name"),
      column.option("type", "fields.type", ACCOUNT_TYPES, "accountTypes"),
      column.status(),
      column.number("depth", "fields.level", 0, 20),
      column.record("parent", "fields.parent", "option", "/management/accounts"),
      column.record("within", "fields.within", "multiOption", "/management/accounts"),
      column.date("createdAt", "fields.created"),
    ],
    columns: [
      { key: "name", label: "fields.name" },
      {
        key: "hierarchy",
        label: "fields.path",
        // The accounts above this one, so the tree reads at a glance.
        value: (item) => ((item.hierarchy ?? []) as { name: string }[]).map((entry) => entry.name).join(" / ") || null,
      },
      { key: "depth", label: "fields.level" },
      { key: "type", label: "fields.type", kind: "badge" },
      { key: "isActive", label: "fields.active", kind: "boolean" },
      { key: "createdAt", label: "fields.created", kind: "date" },
    ],
  },
  {
    key: "users",
    path: "/management/users",
    strings: "settings.users",
    icon: UserMultipleIcon,
    group: "settings.groups.people",
    capability: "users:list",
    edit: "users:update",
    filters: [
      column.text("username", "fields.username"),
      column.text("email", "fields.email"),
      column.option("status", "fields.status", ["active", "pending_verification", "suspended", "banned"], "statuses"),
      column.yesNo("mfa", "fields.mfa"),
      column.date("createdAt", "fields.created"),
    ],
    columns: [
      { key: "username", label: "fields.username" },
      { key: "email", label: "fields.email" },
      { key: "status", label: "fields.status", kind: "badge" },
      { key: "authSummary.mfaEnabled", label: "fields.mfa", kind: "boolean" },
      { key: "createdAt", label: "fields.created", kind: "date" },
    ],
  },
  {
    key: "members",
    path: "/management/collaborators",
    strings: "settings.members",
    icon: UserGroupIcon,
    group: "settings.groups.people",
    capability: "collaborators:list",
    edit: "collaborators:update",
    filters: [
      column.text("role", "fields.role"),
      column.yesNo("owner", "fields.owner"),
      column.status(),
      column.date("joinedAt", "fields.joined"),
    ],
    actions: [{
      key: "remove",
      capability: "collaborators:remove",
      path: "/management/collaborators/remove",
      destructive: true,
      when: (item) => item.isOwner !== true,
    }],
    columns: [
      { key: "userProfile.username", label: "fields.username" },
      { key: "role", label: "fields.role", kind: "badge" },
      { key: "isOwner", label: "fields.owner", kind: "boolean" },
      { key: "isActive", label: "fields.active", kind: "boolean" },
      { key: "acceptedAt", label: "fields.joined", kind: "date" },
    ],
  },
  {
    key: "invites",
    path: "/management/invites",
    strings: "settings.invites",
    icon: MailAdd01Icon,
    group: "settings.groups.people",
    capability: "invites:list",
    create: "invites:create",
    filters: [
      column.text("email", "fields.email"),
      column.text("role", "fields.role"),
      column.option("status", "fields.status", ["pending", "accepted", "declined", "expired", "revoked"], "statuses"),
      column.date("createdAt", "fields.created"),
      column.date("expiresAt", "fields.expires"),
    ],
    actions: [{
      key: "revoke",
      capability: "invites:revoke",
      path: "/management/invites/revoke",
      destructive: true,
      when: (item) => item.status === "pending",
    }],
    columns: [
      { key: "email", label: "fields.email" },
      { key: "role", label: "fields.role", kind: "badge" },
      { key: "status", label: "fields.status", kind: "badge" },
      { key: "expiresAt", label: "fields.expires", kind: "date" },
    ],
  },
  {
    key: "roles",
    path: "/management/roles",
    strings: "settings.roles",
    icon: ShieldUserIcon,
    group: "settings.groups.access",
    capability: "roles:list",
    create: "roles:create",
    edit: "roles:update",
    // Built in roles are shared by every account, so only custom ones change.
    editable: (item) => Boolean(item.account) && item.isSystem !== true,
    filters: [
      column.text("name", "fields.name"),
      column.text("key", "fields.key"),
      column.yesNo("system", "fields.system"),
      column.yesNo("assignable", "fields.assignable"),
      column.status(),
    ],
    columns: [
      { key: "label", label: "fields.name" },
      { key: "name", label: "fields.key", kind: "mono" },
      { key: "isSystem", label: "fields.system", kind: "boolean" },
      { key: "isAssignable", label: "fields.assignable", kind: "boolean" },
    ],
  },
  {
    key: "policies",
    path: "/management/policies",
    strings: "settings.policies",
    icon: PolicyIcon,
    group: "settings.groups.access",
    capability: "policies:list",
    describe: describePolicy,
    create: "policies:create",
    edit: "policies:update",
    filters: [
      column.text("name", "fields.name"),
      column.option("target", "forms.policies.appliesTo", ["role", "user", "account", "collaborator", "global"], "filters.targets"),
      column.number("priority", "forms.policies.priority"),
      column.status(),
      column.date("createdAt", "fields.created"),
    ],
    actions: [{ key: "archive", capability: "policies:archive", path: "/management/policies/archive", destructive: true, when: isActive }],
    columns: [
      { key: "name", label: "fields.name" },
      { key: "description", label: "fields.description" },
      { key: "isActive", label: "fields.active", kind: "boolean" },
      { key: "updatedAt", label: "fields.updated", kind: "date" },
    ],
  },
  {
    key: "applications",
    path: "/management/oauth-apps",
    strings: "settings.applications",
    icon: GridViewIcon,
    group: "settings.groups.apps",
    capability: "applications:list",
    create: "applications:create",
    href: (item) => `/settings/applications/${item._id}`,
    filters: [
      column.text("name", "fields.name"),
      column.option("status", "fields.status", ["enabled", "disabled"], "filters"),
      column.date("createdAt", "fields.created"),
    ],
    columns: [
      { key: "name", label: "fields.name" },
      { key: "description", label: "fields.description" },
      { key: "enabled", label: "fields.active", kind: "boolean" },
      { key: "createdAt", label: "fields.created", kind: "date" },
    ],
  },
  {
    key: "sessions",
    path: "/management/account-sessions",
    strings: "settings.sessions",
    icon: LaptopIcon,
    group: "settings.groups.apps",
    capability: "sessions:list",
    filters: [
      column.option("method", "fields.method", ["password", "magic_link", "passkey", "sso"], "filters.methods"),
      column.option("grant", "fields.grant", ["authorization_code", "refresh_token", "client_credentials", "device_code"], "filters.grants"),
      column.option("device", "fields.device", ["desktop", "mobile", "tablet", "tv", "cli", "unknown"], "filters.devices"),
      column.date("createdAt", "fields.started"),
    ],
    actions: [{ key: "revoke", capability: "sessions:revoke", path: "/management/account-sessions/revoke", destructive: true }],
    columns: [
      { key: "username", label: "fields.username" },
      { key: "clientName", label: "fields.app" },
      {
        key: "authMethod",
        label: "fields.method",
        kind: "badge",
        // "Google" rather than "sso", when the provider is known.
        value: (item) => valueAt(item, "authProvider") ?? valueAt(item, "authMethod") ?? valueAt(item, "grantType"),
      },
      {
        key: "device.name",
        label: "fields.device",
        value: (item) => valueAt(item, "device.name") ?? describeDevice(String(valueAt(item, "device.userAgent") ?? "")),
      },
      { key: "device.ipAddress", label: "fields.ipAddress", kind: "mono" },
      { key: "createdAt", label: "fields.started", kind: "date" },
    ],
  },
  {
    key: "consents",
    path: "/management/consents",
    strings: "settings.consents",
    icon: CheckListIcon,
    group: "settings.groups.apps",
    capability: "consents:list",
    filters: [column.date("approvedAt", "fields.approved")],
    actions: [{ key: "revoke", capability: "consents:revoke", path: "/management/consents/revoke", destructive: true }],
    columns: [
      { key: "username", label: "fields.username" },
      { key: "clientName", label: "fields.app" },
      { key: "scopes", label: "fields.scopes", kind: "tags" },
      { key: "approvedAt", label: "fields.approved", kind: "date" },
    ],
  },
];

/** The personal account page sits first in Settings. */
export const ACCOUNT_ICON = UserCircleIcon;

/** What a policy grants, to whom and when, for its details sheet. */
function describePolicy(item: TListItem) {
  const t = i18n.t.bind(i18n);
  const permissions = (item.permissions ?? []) as { effect: string; scope: string }[];
  const target = (item.target ?? {}) as { targetType?: string; roles?: string[]; collaborators?: string[]; accounts?: string[] };
  const chips = (values: string[], destructive = false) =>
    values.length === 0
      ? t("common.empty")
      : createElement("span", { className: "flex flex-wrap justify-end gap-1" }, ...values.map((value) =>
        createElement(Badge, { key: value, variant: destructive ? "destructive" : "secondary", className: "font-mono" }, value)
      ));
  const who = target.targetType === "role"
    ? chips(target.roles ?? [])
    : target.targetType === "global"
    ? t("forms.policies.targets.global")
    : t("details.policyCount", { count: (target.collaborators ?? target.accounts ?? []).length, kind: t(`forms.policies.targets.${target.targetType}`) });
  const condition = describeCondition(item.condition as TExprNode | undefined, t);
  const now = Date.now();
  const from = item.activeFrom ? new Date(String(item.activeFrom)).getTime() : undefined;
  const until = item.activeUntil ? new Date(String(item.activeUntil)).getTime() : undefined;
  // Whether the policy counts right now, from its switch and its window.
  const state = item.isActive === false
    ? "off"
    : from !== undefined && from > now
    ? "scheduled"
    : until !== undefined && until <= now
    ? "ended"
    : "live";
  const allowed = permissions.filter((entry) => entry.effect === "allow").map((entry) => entry.scope);
  const denied = permissions.filter((entry) => entry.effect === "deny").map((entry) => entry.scope);
  return [
    {
      title: t("details.policyWho"),
      rows: [{ key: "who", label: t("forms.policies.appliesTo"), value: who }],
    },
    {
      title: t("details.policyWhat"),
      rows: [
        { key: "allow", label: t("permissions.allow"), value: chips(allowed) },
        ...(denied.length ? [{ key: "deny", label: t("permissions.deny"), value: chips(denied, true) }] : []),
      ],
    },
    {
      title: t("details.policyWhen"),
      rows: [
        {
          key: "state",
          label: t("details.policyState"),
          value: createElement(Badge, { variant: state === "live" ? "default" : "outline" }, t(`details.policyStates.${state}`)),
        },
        {
          key: "when",
          label: t("details.policyRules"),
          value: createElement("span", { className: "block text-end leading-relaxed" }, condition || t("details.policyNoRules")),
        },
        ...(item.activeFrom ? [{ key: "from", label: t("forms.policies.activeFrom"), value: formatDate(item.activeFrom, i18n.language) ?? "" }] : []),
        ...(item.activeUntil ? [{ key: "until", label: t("forms.policies.activeUntil"), value: formatDate(item.activeUntil, i18n.language) ?? "" }] : []),
        { key: "priority", label: t("forms.policies.priority"), value: String(item.priority ?? 0) },
      ],
    },
  ];
}
