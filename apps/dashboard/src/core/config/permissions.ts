/** The context a policy condition may read, as OAuth Base allows it. */
export const CONDITION_ROOTS = [
  "user",
  "account",
  "collaborator",
  "role",
  "session",
  "app",
  "credential",
  "request",
  "resource",
  "environment",
] as const;

/**
 * Fields worth suggesting under each root. Attributes take any key after them.
 * `request` is what OAuth's guard records, and `resource` and `environment`
 * are whatever a product route's `resolveContext` passes in, so theirs are
 * examples.
 */
export const CONDITION_FIELDS: Record<(typeof CONDITION_ROOTS)[number], string[]> = {
  user: ["id", "username", "status", "attributes."],
  account: ["name", "type", "isActive", "isBlocked", "attributes."],
  collaborator: ["role", "isOwner", "isPrimary", "isActive", "attributes."],
  role: ["name", "isSystem", "isAssignable", "attributes."],
  session: ["authMethod", "identityRole", "role", "user", "account"],
  app: ["name", "enabled", "attributes."],
  credential: ["name", "type", "isActive", "attributes."],
  request: ["method", "path", "timestamp"],
  resource: ["ownerId", "title", "status"],
  environment: ["country", "deviceType"],
};

