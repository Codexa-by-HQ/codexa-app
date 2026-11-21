import type { TFunction } from "i18next";
import type { TApplication, TBranding, TBrandingTheme, TColorToken, TFilterColumn, TFilterModel, TPolicyValues, TCatalogItem } from "@/core/types";
import { FILTER_OPERATORS, OPERATOR_FOR_MANY, OPERATOR_FOR_ONE, RANGE_OPERATORS } from "@/core/config/filters";
import { ApiError } from "@/core/lib/request";

export { cn } from "cn";

/* Branding */

const COLOR_VARIABLES: Record<TColorToken, string> = {
  background: "--background",
  foreground: "--foreground",
  card: "--card",
  cardForeground: "--card-foreground",
  popover: "--popover",
  popoverForeground: "--popover-foreground",
  muted: "--muted",
  mutedForeground: "--muted-foreground",
  accent: "--accent",
  accentForeground: "--accent-foreground",
  border: "--border",
  input: "--input",
  ring: "--ring",
  primary: "--primary",
  secondary: "--secondary",
};

const HEX = /^#[0-9a-f]{6}$/i;
/** The same rule OAuth validates with, which admits no CSS syntax. */
const FONT_FAMILY = /^[a-zA-Z][a-zA-Z0-9 ,'-]*$/;

/** Near black or white, whichever reads better on `hex` (WCAG contrast). */
function readableOn(hex: string): string {
  const channel = (offset: number) => {
    const value = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const light = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return (light + 0.05) / 0.05 > 1.05 / (light + 0.05) ? "#0a0a0a" : "#ffffff";
}

function themeDeclarations(theme: TBrandingTheme): string[] {
  const color = (token: TColorToken) => {
    const value = theme[token];
    return value && HEX.test(value) ? value : undefined;
  };
  const lines: string[] = [];

  for (const [token, variable] of Object.entries(COLOR_VARIABLES)) {
    const value = color(token as TColorToken);
    if (value) lines.push(`${variable}: ${value}`);
  }

  const primary = color("primary");
  if (primary) {
    const onPrimary = readableOn(primary);
    lines.push(
      `--primary-foreground: ${onPrimary}`,
      `--sidebar-primary: var(--primary)`,
      `--sidebar-primary-foreground: ${onPrimary}`,
      `--panel: color-mix(in oklch, var(--primary) 14%, var(--background))`,
      `--panel-border: color-mix(in oklch, var(--primary) 30%, var(--background))`,
      `--panel-pattern: color-mix(in oklch, var(--primary) 20%, transparent)`,
      `--panel-pattern-shine: color-mix(in oklch, var(--primary) 50%, transparent)`,
      `--frame: color-mix(in oklch, var(--primary) 12%, color-mix(in oklch, var(--foreground) 8%, var(--background)))`,
      `--chart-1: color-mix(in oklch, var(--primary) 40%, var(--background))`,
      `--chart-2: color-mix(in oklch, var(--primary) 70%, var(--background))`,
      `--chart-3: var(--primary)`,
      `--chart-4: color-mix(in oklch, var(--primary) 75%, var(--foreground))`,
      `--chart-5: color-mix(in oklch, var(--primary) 50%, var(--foreground))`,
    );
    if (!color("ring")) lines.push(`--ring: color-mix(in oklch, var(--primary) 55%, transparent)`);
  }
  const secondary = color("secondary");
  if (secondary) lines.push(`--secondary-foreground: ${readableOn(secondary)}`);

  // The sidebar follows whichever base tokens the brand sets.
  if (color("background")) lines.push(`--sidebar: color-mix(in oklch, var(--foreground) 3%, var(--background))`);
  if (color("foreground")) lines.push(`--sidebar-foreground: var(--foreground)`);
  if (color("accent")) lines.push(`--sidebar-accent: var(--accent)`);
  if (color("accentForeground")) lines.push(`--sidebar-accent-foreground: var(--accent-foreground)`);
  if (color("border")) lines.push(`--sidebar-border: var(--border)`);
  if (primary || color("ring")) lines.push(`--sidebar-ring: var(--ring)`);

  const radius = theme.radiusPx;
  if (radius !== undefined && Number.isInteger(radius) && radius >= 0 && radius <= 24) {
    lines.push(`--radius: ${radius}px`);
  }
  return lines;
}

/**
 * The stylesheet for an application's branding: a light rule, a dark rule
 * and the font. Every value is checked again here, so stored data can never
 * break out of a declaration.
 */
export function brandingCss(branding: TBranding): string {
  const rules: string[] = [];
  const rule = (selector: string, lines: string[]) => {
    if (lines.length) rules.push(`${selector} {\n  ${lines.join(";\n  ")};\n}`);
  };
  // Two classes outrank the theme's single `:root` and `.dark` selectors.
  rule(":root:not(.dark)", branding.lightTheme ? themeDeclarations(branding.lightTheme) : []);
  rule(":root.dark", branding.darkTheme ? themeDeclarations(branding.darkTheme) : []);

  const font = branding.fontFamily?.trim();
  if (font && FONT_FAMILY.test(font)) {
    // Only fonts the device already has can load, since the CSP allows no remote fonts.
    rule(":root", [`font-family: ${font}, 'Figtree Variable', sans-serif`]);
  }
  return rules.join("\n");
}

/** A logo URL the CSP lets the page show: HTTPS, or this origin. */
export function logoUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value, location.origin);
    return url.protocol === "https:" || url.origin === location.origin ? url.href : undefined;
  } catch {
    return undefined;
  }
}

let brandingSheet: CSSStyleSheet | null = null;

/**
 * Wear an application's branding on the whole UI, or the Codexa theme with
 * null. The stylesheet is constructed, because the CSP allows no <style>.
 */
export function applyBranding(application: TApplication | null) {
  const css = application?.branding ? brandingCss(application.branding) : "";
  if (!brandingSheet && css) {
    brandingSheet = new CSSStyleSheet();
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, brandingSheet];
  }
  brandingSheet?.replaceSync(css);
}

/* Lists */

/** The value at a dot path, such as "userProfile.username". */
export function valueAt(item: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined),
    item,
  );
}

/** A column's value in an item: computed when the column says how, otherwise its field. */
export function columnValue(item: Record<string, unknown>, column: { key: string; value?: (item: Record<string, unknown>) => unknown }): unknown {
  return column.value ? column.value(item) : valueAt(item, column.key);
}

const BROWSERS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\//, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
  [/Safari\//, "Safari"],
];
const SYSTEMS: [RegExp, string][] = [
  [/Windows/, "Windows"],
  [/Android/, "Android"],
  [/iPhone|iPad|iOS/, "iOS"],
  [/Mac OS X|Macintosh/, "macOS"],
  [/Linux/, "Linux"],
];

/** A user agent as "Chrome on Windows", or the raw value when neither part is known. */
export function describeDevice(userAgent: string): string {
  const browser = BROWSERS.find(([pattern]) => pattern.test(userAgent))?.[1];
  const system = SYSTEMS.find(([pattern]) => pattern.test(userAgent))?.[1];
  if (browser && system) return `${browser} · ${system}`;
  return browser ?? system ?? userAgent;
}

/** A date in the reader's language, or null for anything that is not one. */
export function formatDate(value: unknown, language: string): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/* Forms */

/**
 * What a refused request tells the user. OAuth's own description names the
 * rule that failed, so it is shown for a refused input. Anything else gets a
 * general message, since its details are reported once in request.ts.
 */
export function failureMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return t("form.forbidden");
    if (error.status < 500 && error.message) return error.message;
  }
  return t("form.unexpected");
}

/* Policy conditions */

type TConditionRule = TPolicyValues["condition"]["rules"][number];
type TConditionGroup = TPolicyValues["condition"]["groups"][number];
type TCondition = TPolicyValues["condition"];

/** OAuth Base's condition tree, as it stores and evaluates it. */
export type TExprNode =
  | { op: "field"; field: string; operator: string; value: unknown }
  | { op: "and" | "or"; children: TExprNode[] }
  | { op: "not"; child: TExprNode };

/** A typed value from what someone typed: true, false and numbers where they fit. */
function typedValue(text: string, numeric: boolean): string | number | boolean {
  if (numeric) return Number(text);
  if (text === "true" || text === "false") return text === "true";
  return text;
}

function ruleNode(rule: TConditionRule): TExprNode {
  const numeric = ["$gt", "$gte", "$lt", "$lte"].includes(rule.operator);
  const value = rule.operator === "$exists"
    ? rule.value !== "false"
    : rule.ref
    ? { ref: rule.value }
    : rule.operator === "$in" || rule.operator === "$nin"
    ? rule.value.split(",").map((part) => part.trim()).filter(Boolean).map((part) => typedValue(part, false))
    : rule.operator === "$regex"
    ? rule.value
    : typedValue(rule.value, numeric);
  const node: TExprNode = { op: "field", field: rule.field, operator: rule.operator, value };
  return rule.negate ? { op: "not", child: node } : node;
}

/** Joins nodes, since and and or need at least two children. */
function joined(mode: "and" | "or", nodes: TExprNode[]): TExprNode | undefined {
  if (nodes.length === 0) return undefined;
  return nodes.length === 1 ? nodes[0] : { op: mode, children: nodes };
}

/** The condition the builder describes, or none when it is empty. */
export function conditionToExpr(condition: TCondition): TExprNode | undefined {
  if (condition.raw) return condition.raw as TExprNode;
  const groups = condition.groups.flatMap((group: TConditionGroup) => {
    const node = joined(group.mode, group.rules.map(ruleNode));
    if (!node) return [];
    return [group.negate ? { op: "not" as const, child: node } : node];
  });
  return joined(condition.mode, [...condition.rules.map(ruleNode), ...groups]);
}

function nodeRule(node: TExprNode, negate = false): TConditionRule | undefined {
  if (node.op === "not") return node.child.op === "field" && !negate ? nodeRule(node.child, true) : undefined;
  if (node.op !== "field") return undefined;
  const value = node.value;
  const isRef = typeof value === "object" && value !== null && !Array.isArray(value) && "ref" in value;
  return {
    field: node.field,
    operator: node.operator as TConditionRule["operator"],
    value: isRef
      ? String((value as { ref: string }).ref)
      : Array.isArray(value)
      ? value.join(", ")
      : String(value ?? ""),
    ref: isRef,
    negate,
  };
}

/**
 * The builder's values for a stored condition. One level of groups under the
 * top is what the builder shows. A deeper tree is kept unchanged, as raw.
 */
export function exprToCondition(node?: TExprNode): TCondition {
  const empty: TCondition = { mode: "and", rules: [], groups: [] };
  if (!node) return empty;
  const top = node.op === "and" || node.op === "or" ? node : { op: "and" as const, children: [node] };
  const condition: TCondition = { mode: top.op, rules: [], groups: [] };
  for (const child of top.children) {
    const rule = nodeRule(child);
    if (rule) {
      condition.rules.push(rule);
      continue;
    }
    const negate = child.op === "not";
    const inner = negate ? (child as { child: TExprNode }).child : child;
    if (inner.op !== "and" && inner.op !== "or") return { ...empty, raw: node };
    const rules = inner.children.map((entry) => nodeRule(entry));
    if (rules.some((entry) => !entry)) return { ...empty, raw: node };
    condition.groups.push({ mode: inner.op, negate, rules: rules as TConditionRule[] });
  }
  return condition;
}

/** A condition as one readable line, such as "account.type is team and not …". */
export function describeCondition(node: TExprNode | undefined, t: TFunction): string {
  if (!node) return "";
  if (node.op === "not") return `${t("conditions.not")} (${describeCondition(node.child, t)})`;
  if (node.op === "and" || node.op === "or") {
    return node.children.map((child) => describeCondition(child, t)).join(` ${t(`conditions.${node.op}`)} `);
  }
  const field = node as Extract<TExprNode, { op: "field" }>;
  const value = field.value;
  const shown = typeof value === "object" && value !== null && !Array.isArray(value) && "ref" in value
    ? describeField(String((value as { ref: string }).ref), t)
    : Array.isArray(value)
    ? value.map((entry) => `“${entry}”`).join(", ")
    : typeof value === "string"
    ? `“${value}”`
    : String(value);
  const subject = describeField(field.field, t);
  return field.operator === "$exists"
    ? `${subject} ${t(value ? "conditions.exists" : "conditions.missing")}`
    : `${subject} ${t(`conditions.operators.${field.operator.slice(1)}`)} ${shown}`;
}

/** A field path for people, such as "Resource › title" for "resource.title". */
function describeField(path: string, t: TFunction): string {
  const [root, ...rest] = path.split(".");
  return `${t(`conditions.roots.${root}`, { defaultValue: root })} › ${rest.join(".")}`;
}

/* List filters */

const OBJECT_ID = /^[a-f\d]{24}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Whether one value suits a column, so a hand edited link never reaches OAuth unchecked. */
function fitsColumn(column: TFilterColumn, value: unknown): boolean {
  switch (column.type) {
    case "text":
      return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
    case "number":
      return typeof value === "number" && Number.isFinite(value) &&
        (column.min === undefined || value >= column.min) && (column.max === undefined || value <= column.max);
    case "date":
      return typeof value === "string" && DAY.test(value) && !Number.isNaN(Date.parse(value));
    case "option":
    case "multiOption":
      return typeof value === "string" &&
        (column.remote ? OBJECT_ID.test(value) : Boolean(column.options?.some((option) => option.value === value)));
  }
}

/**
 * The filters in a list URL, kept only when each names one of the list's
 * columns with one of its operators and values that suit it.
 */
export function readFilters(raw: string | null, columns: readonly TFilterColumn[]): TFilterModel[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.slice(0, 20).flatMap((entry): TFilterModel[] => {
    const model = entry as Partial<TFilterModel>;
    const column = columns.find((candidate) => candidate.id === model.columnId);
    if (!column || model.type !== column.type || !Array.isArray(model.values)) return [];
    if (!FILTER_OPERATORS[column.type].includes(String(model.operator))) return [];
    const values = model.values.slice(0, 50).filter((value) => fitsColumn(column, value));
    const needed = RANGE_OPERATORS.has(String(model.operator)) ? 2 : 1;
    return values.length >= needed
      ? [{ columnId: column.id, type: column.type, operator: String(model.operator), values }]
      : [];
  });
}

/**
 * The operator after a filter's values change: a single value operator
 * becomes its several values form and back, as bazza/ui does.
 */
export function nextOperator(model: TFilterModel, nextCount: number): string {
  const before = model.values.length;
  if ((before <= 1) === (nextCount <= 1)) return model.operator;
  return (nextCount > 1 ? OPERATOR_FOR_MANY : OPERATOR_FOR_ONE)[model.operator] ?? model.operator;
}

/* Permissions */

/** One resource's permissions in the policy editor, such as `users` with `list` and `read`. */
export type TPermissionGroup = { resource: string; actions: { action: string; description?: string }[] };

/**
 * Catalog permissions grouped by their first segment, so `users:list` sits
 * under `users` and `sso:providers:read` under `sso`. A group's own name grants
 * every action in it.
 */
export function groupPermissions(permissions: readonly TCatalogItem[]): TPermissionGroup[] {
  return [...Map.groupBy(permissions.filter(({ name }) => name.includes(":")), ({ name }) => name.split(":")[0])]
    .map(([resource, items]) => ({
      resource,
      actions: items.map(({ name, description }) => ({ action: name.slice(resource.length + 1), description })),
    }));
}

/* Platform: the one place each browser capability is reached, so a native build swaps it */

/** Copies text to the clipboard. */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * Small preferences kept on this device, such as the theme or a list's view.
 * It never throws: blocked storage only forgets a choice on reload.
 */
export const preferences = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignored: the value lasts for this page view only.
    }
  },
  remove(key: string) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignored, as above.
    }
  },
  keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch {
      return [];
    }
  },
};
