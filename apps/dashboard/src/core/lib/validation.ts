import { z } from "zod";

// The CSP has no 'unsafe-eval', so Zod must not compile validators with new Function.
z.config({ jitless: true });

/**
 * Every form's schema. Messages are translation keys, translated by the
 * fields. The rules mirror OAuth's own, so most mistakes are caught before a
 * request, and OAuth still validates everything again.
 */

const text = (max: number) =>
  z.string().trim().min(1, "validation.required").max(max, "validation.tooLong");

/** An optional text, sent as undefined when left empty. */
const optionalText = (max: number) =>
  z.string().trim().max(max, "validation.tooLong").transform((value) => value || undefined);

/** One URL per line, as typed into a text area. */
const urlLines = z.string().transform((value, context) => {
  const urls = value.split(/\s+/).filter(Boolean);
  for (const url of urls) {
    if (!URL.canParse(url) || !/^https?:$/.test(new URL(url).protocol)) {
      context.addIssue({ code: "custom", message: "validation.url" });
      return z.NEVER;
    }
  }
  return [...new Set(urls)];
});

const roleKey = z.string().trim().regex(/^[a-z][a-z0-9_-]{0,49}$/, "validation.roleKey");

export const ACCOUNT_TYPES = ["org", "team", "department", "lab", "project", "personal", "custom"] as const;

export const accountCreateSchema = z.object({
  name: text(100),
  slug: z.string().trim().regex(/^[a-z0-9-]{1,60}$/, "validation.slug"),
  type: z.enum(ACCOUNT_TYPES, "validation.required"),
  customType: optionalText(60),
  description: optionalText(500),
  /** The account it nests under. Empty means the current account. */
  parentId: z.string(),
}).refine((account) => account.type !== "custom" || account.customType, {
  path: ["customType"],
  message: "validation.required",
});

export const accountEditSchema = z.object({
  name: text(100),
  description: optionalText(500),
  isActive: z.boolean(),
});

export const USER_STATUSES = ["active", "pending_verification", "suspended", "banned"] as const;

export const userEditSchema = z.object({
  displayName: z.string().trim().max(100, "validation.tooLong"),
  status: z.enum(USER_STATUSES, "validation.required"),
});

export const memberEditSchema = z.object({
  role: roleKey,
  isActive: z.boolean(),
});

export const inviteCreateSchema = z.object({
  email: z.email("validation.email"),
  role: roleKey,
  message: optionalText(500),
});

export const roleCreateSchema = z.object({
  name: roleKey,
  label: text(100),
  description: optionalText(300),
  isAssignable: z.boolean(),
});

export const roleEditSchema = roleCreateSchema.omit({ name: true }).extend({ isActive: z.boolean() });

export const POLICY_TARGETS = ["role", "collaborator", "account", "global"] as const;

/** A permission as OAuth Base stores it: "*", or names joined by colons, such as "invoices:approve". */
export const PERMISSION_PATTERN = /^(?:\*|[a-zA-Z][a-zA-Z0-9]*(?::[a-zA-Z][a-zA-Z0-9]*)*)$/;

/** An OAuth scope token: printable ASCII without spaces, quotes or backslashes. */
export const SCOPE_PATTERN = /^[\x21\x23-\x5b\x5d-\x7e]{1,255}$/;

/** The comparisons a policy condition offers, as OAuth Base names them. */
export const CONDITION_OPERATORS = ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin", "$exists", "$regex"] as const;

/** A path under one of the context roots OAuth Base reads, such as user.attributes.region. */
export const CONDITION_PATH = /^(?:app|credential|user|account|collaborator|role|session|request|resource|environment)(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)+$/;

const conditionRule = z.object({
  field: z.string().trim().regex(CONDITION_PATH, "validation.conditionField"),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.string().trim().max(500),
  /** The value names another field to compare with, rather than a fixed value. */
  ref: z.boolean(),
  negate: z.boolean(),
}).superRefine((rule, context) => {
  if (rule.operator === "$exists") return;
  if (!rule.value) context.addIssue({ code: "custom", path: ["value"], message: "validation.required" });
  else if (rule.ref && !CONDITION_PATH.test(rule.value)) {
    context.addIssue({ code: "custom", path: ["value"], message: "validation.conditionField" });
  } else if (!rule.ref && ["$gt", "$gte", "$lt", "$lte"].includes(rule.operator) && Number.isNaN(Number(rule.value))) {
    context.addIssue({ code: "custom", path: ["value"], message: "validation.number" });
  }
});

const conditionGroup = z.object({
  mode: z.enum(["and", "or"]),
  negate: z.boolean(),
  rules: z.array(conditionRule).min(1, "validation.pickOne"),
});

export const policySchema = z.object({
  name: text(100),
  description: optionalText(500),
  targetType: z.enum(POLICY_TARGETS),
  roles: z.array(z.string()),
  collaborators: z.array(z.string()),
  accounts: z.array(z.string()),
  /** Each permission the policy names, and whether it allows or denies it. */
  permissions: z.record(z.string(), z.enum(["allow", "deny"])),
  condition: z.object({
    mode: z.enum(["and", "or"]),
    rules: z.array(conditionRule),
    groups: z.array(conditionGroup),
    /** A stored condition too deep for the builder. It is kept as it is. */
    raw: z.unknown().optional(),
  }),
  activeFrom: z.string(),
  activeUntil: z.string(),
  priority: z.coerce.number<string | number>("validation.number").int("validation.number"),
}).superRefine((policy, context) => {
  if (policy.activeFrom && policy.activeUntil && policy.activeFrom >= policy.activeUntil) {
    context.addIssue({ code: "custom", path: ["activeUntil"], message: "validation.afterStart" });
  }
  if (policy.targetType === "role" && policy.roles.length === 0) {
    context.addIssue({ code: "custom", path: ["roles"], message: "validation.pickOne" });
  }
  if (policy.targetType === "collaborator" && policy.collaborators.length === 0) {
    context.addIssue({ code: "custom", path: ["collaborators"], message: "validation.pickOne" });
  }
  if (policy.targetType === "account" && policy.accounts.length === 0) {
    context.addIssue({ code: "custom", path: ["accounts"], message: "validation.pickOne" });
  }
  if (Object.keys(policy.permissions).length === 0) {
    context.addIssue({ code: "custom", path: ["permissions"], message: "validation.pickPermission" });
  }
});

/** One sign in provider's settings for an app. */
export const ssoProviderSchema = z.object({
  name: text(100),
  enabled: z.boolean(),
  allowRegistration: z.boolean(),
});

export const applicationSchema = z.object({
  name: text(100),
  description: optionalText(500),
});

/**
 * What a credential is for. Each kind fixes its client type and grants, so
 * nobody has to know OAuth's rules to make a safe one.
 */
export const CREDENTIAL_KINDS = ["browser", "server", "machine", "device"] as const;

/** What every new credential needs, whether made alone or with its application. */
const credentialFields = {
  kind: z.enum(CREDENTIAL_KINDS),
  redirectUris: urlLines,
  postLogoutRedirectUris: urlLines,
  allowedScopes: z.array(z.string()).min(1, "validation.pickOne"),
  consentRequired: z.boolean(),
  serviceRole: z.string(),
};

type TCredentialShape = { kind: (typeof CREDENTIAL_KINDS)[number]; redirectUris: string[]; serviceRole: string };

/** People sign in through a redirect, and a machine gets a service identity with a role. */
function checkCredential(credential: TCredentialShape, context: z.RefinementCtx) {
  const signsInPeople = credential.kind === "browser" || credential.kind === "server";
  if (signsInPeople && credential.redirectUris.length === 0) {
    context.addIssue({ code: "custom", path: ["redirectUris"], message: "validation.required" });
  }
  if (credential.kind === "machine" && !credential.serviceRole) {
    context.addIssue({ code: "custom", path: ["serviceRole"], message: "validation.required" });
  }
}

export const credentialCreateSchema = z.object({ name: text(100), ...credentialFields }).superRefine(checkCredential);

/** A new application with its first credential, so it can sign people in straight away. */
export const applicationCreateSchema = z.object({
  name: text(100),
  description: optionalText(500),
  credentialName: text(100),
  ...credentialFields,
}).superRefine(checkCredential);

export const credentialEditSchema = z.object({
  name: text(100),
  redirectUris: urlLines,
  postLogoutRedirectUris: urlLines,
  allowedScopes: z.array(z.string()).min(1, "validation.pickOne"),
  consentRequired: z.boolean(),
});

