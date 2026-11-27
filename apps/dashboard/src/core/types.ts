import type { ReactNode } from "react";
import type { RouteObject } from "react-router";
import type { IconSvgElement } from "@hugeicons/react";
import type { z } from "zod";

import type { BRANDING_COLORS } from "@/core/config/branding";
import type {
  accountCreateSchema,
  applicationCreateSchema,
  credentialCreateSchema,
  policySchema,
} from "@/core/lib/validation";

/* Routes */

/**
 * A dashboard route. A route with a `name` appears in the sidebar and the
 * breadcrumb, everything else is a plain react-router route.
 */
export type TRouteObject = RouteObject & {
  /** Translation key shown in the sidebar, the breadcrumb and search. */
  name?: string;
  icon?: IconSvgElement;
  /** The rail section the page belongs to, such as "home" or "settings". */
  section?: string;
  /** Translation key of the group inside its section. Ungrouped pages come first. */
  group?: string;
  /** Lower comes first. Defaults to 50. */
  priority?: number;
  /** False keeps a named route out of the navigation, for detail pages. */
  display?: boolean;
  /** The capability that shows the page. OAuth's guard still decides access. */
  capability?: string;
};

/** A rail section: an icon on the rail, and its pages in the section sidebar. */
export type TSection = {
  key: string;
  /** Translation key. */
  name: string;
  icon: IconSvgElement;
  /** Lower comes first. */
  priority: number;
};

/** Your rail sections, keyed like the routes. Built in keys: home, settings. */
export type TSectionsOverride = Record<string, Omit<TSection, "key">>;

/**
 * Your routes, keyed by name. A key that matches a built in route replaces it,
 * or extends it when `merge` is true. Built in keys: overview, account.
 */
export type TRoutesOverride = Record<string, TRouteObject & { merge?: boolean }>;

/** What each route carries for the breadcrumb, through its handle. */
export type TRouteHandle = { name?: string; icon?: IconSvgElement };

export type TNavItem = {
  key: string;
  to: string;
  name: string;
  icon?: IconSvgElement;
  section: string;
  group?: string;
  capability?: string;
  /** Matches only the exact path, for the index route. */
  end: boolean;
};

/** A section with the pages the signed in user may see in it. */
export type TNavSection = TSection & { items: TNavItem[] };

/* Theme and language */

export type TTheme = "light" | "dark" | "system";
export type TResolvedTheme = "light" | "dark";
export type TLanguage = "en" | "ar" | "ur";

export type TThemeContext = {
  theme: TTheme;
  resolvedTheme: TResolvedTheme;
  setTheme: (theme: TTheme) => void;
};

/* Branding, as OAuth stores it on each application */

export type TColorToken = (typeof BRANDING_COLORS)[number];

export type TBrandingTheme = Partial<Record<TColorToken, string>> & { radiusPx?: number };

export type TBranding = {
  logo?: string;
  darkLogo?: string;
  lightTheme?: TBrandingTheme;
  darkTheme?: TBrandingTheme;
  fontFamily?: string;
};

/** An application's public name and branding, from OAuth's one branding route. */
export type TApplication = { appId: string; name: string; branding?: TBranding };

/** Which application's branding to read: by id, or by a public client id before sign in. */
export type TApplicationRef = { app: string } | { client_id: string };

/* OAuth and the session */

/** The OAuth client the host configured. Null until setup created one. */
export type TClientConfig = { clientId: string | null; scopes: string[] };

/**
 * The access token, kept in memory only. OAuth keeps the refresh token in
 * an httpOnly cookie that no script can read.
 */
export type TTokens = { accessToken: string; accountId: string; expiresAt: number };

/** A refresh sends no token: OAuth reads its cookie. */
export type TTokenGrant =
  | { grant_type: "authorization_code"; code: string; redirect_uri: string; code_verifier: string }
  | { grant_type: "refresh_token" };

export type TTokenResponse = { access_token: string; expires_in: number; account_id: string };

/** What OAuth reports about the signed in session. */
export type TSessionInfo = {
  appId: string;
  /** Read from the branding route by appId, so every page wears the app's theme. */
  application?: TApplication | null;
  userId: string;
  accountId: string;
  oauthScopes: string[];
  /** What OAuth lets this session manage, evaluated by OAuth's own guards. */
  capabilities: string[];
  /** Holds `*`, as OAuth evaluates it, so it may write application wide policies. */
  platformAdministrator?: boolean;
};

/** Why a sign in did not complete, used as a translation key. */
export type TSignInFailure = "denied" | "failed" | "state";

/** A sign in waiting for its callback, kept under its state. */
export type TPendingSignIn = { verifier: string; expiresAt: number; returnTo?: string };

/** An account the signed in person belongs to, as OAuth lists them. */
export type TMembership = {
  accountId: string;
  name: string;
  slug?: string;
  type?: string;
  role: string;
  primary?: boolean;
};

/** The authorization an account switch asks OAuth for. It can never add scopes. */
export type TAccountSwitchAuthorization = {
  responseType: "code";
  clientId: string;
  redirectUri: string;
  scopes: string[];
  state: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
};

/** A device asking to sign in, as oauth-device describes it to the person approving. */
export type TDeviceRequest = {
  client: { clientId: string; name: string };
  requestedScopes: string[];
  consentRequired: boolean;
  expiresAt: number;
};

/** The device page's data: no code yet, a request to decide, or why there is none. */
export type TDeviceData =
  | { state: "enter" }
  | { state: "review"; userCode: string; request: TDeviceRequest }
  | { state: "invalid" | "unavailable"; userCode: string };

/** What the session loader settles before any page renders. */
export type TSessionData = {
  config: TClientConfig;
  session: TSessionInfo | null;
  /** Every account the person may switch to, the current one included. */
  memberships: TMembership[];
  failure?: TSignInFailure;
  /** The page a sign in that just finished asked to return to. */
  returnTo?: string;
};

export type TSessionContext = {
  session: TSessionInfo | null;
  failure?: TSignInFailure;
  canSignIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Opens the personal account area at /auth/account, returning here afterwards. */
  openAccount: (path?: string) => Promise<void>;
  /** The accounts the person may switch between. The chooser shows only for more than one. */
  memberships: TMembership[];
  switchAccount: (accountId: string) => Promise<void>;
};

/* Requests */

export type TRequestOptions = Omit<RequestInit, "body"> & {
  url: string;
  /** Sent as application/x-www-form-urlencoded, as the OAuth endpoints expect. */
  form?: Record<string, string>;
  /** Sent as JSON, as the management API expects. */
  json?: unknown;
};

/* The global sheet and confirm dialog */

export type TSheetOptions = {
  title: string;
  description?: ReactNode;
  /** Shown in the icon tile beside the title. */
  icon?: IconSvgElement;
  body: ReactNode;
  /** A wider panel, for dense forms such as a policy. */
  wide?: boolean;
};

/** What `sheet` and `useSheet()` offer: open and close the one sheet. */
export type TSheetHandle = {
  open: (options: TSheetOptions) => void;
  close: () => void;
};

export type TConfirmOptions = {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  /** Runs while the dialog shows a busy state. Throw or return false to keep it open. */
  onConfirm?: () => unknown | Promise<unknown>;
};

/** Resolves true when the user confirmed. */
export type TConfirm = (options: TConfirmOptions) => Promise<boolean>;

/* Settings lists */

/** How a column shows its value. */
export type TColumnKind = "text" | "mono" | "date" | "badge" | "boolean" | "tags" | "device";

export type TListColumn = {
  /** A dot path into the item, such as "userProfile.username". */
  key: string;
  /** Translation key of the heading. */
  label: string;
  kind?: TColumnKind;
  /** Computes the value when it is not one field, such as a provider or a method. */
  value?: (item: Record<string, unknown>) => unknown;
};

/** A choice in a select, a chips field or a filter. */
export type TOption = { value: string; label: string };

/** A filter above a list, sent to OAuth as one query parameter. */
/** The column types of the data table filter model that bazza/ui uses. */
export type TFilterType = "text" | "number" | "date" | "option" | "multiOption";

/**
 * One applied filter, exactly as OAuth Base's list filters take it in the
 * `filters` query parameter.
 */
export type TFilterModel = {
  columnId: string;
  type: TFilterType;
  operator: string;
  values: (string | number)[];
};

/**
 * One column a Settings list may be filtered by, declared in
 * config/navigation.ts with the builders in config/filters.ts. Its id matches
 * the column OAuth Base declares for the same list.
 */
export type TFilterColumn = {
  id: string;
  type: TFilterType;
  /** Translation key of the column. */
  label: string;
  icon?: IconSvgElement;
  /** The values an option column offers, with translation keys for their labels. */
  options?: TOption[];
  /** Options searched from another management list, such as accounts. */
  remote?: { path: string; labelKey: string };
  min?: number;
  max?: number;
};

/** A one click change on a record, such as archive or revoke, sent as POST { id }. */
export type TResourceAction = {
  /** Translation key root under settings.actions, holding label and confirm strings. */
  key: string;
  capability: string;
  path: string;
  destructive?: boolean;
  /** Whether the record offers it, such as only while active. */
  when?: (item: TListItem) => boolean;
};

/** One Settings list, read from OAuth's management API. */
export type TListResource = {
  key: string;
  /** The management API path, such as "/management/users". */
  path: string;
  /** Translation key root, holding title, description and empty. */
  strings: string;
  icon?: IconSvgElement;
  columns: TListColumn[];
  filters?: TFilterColumn[];
  /** The capability that shows the create button, when the list has a create form. */
  create?: string;
  /** The capability that shows the edit button, when the list has an edit form. */
  edit?: string;
  /** Rows that may be edited at all, such as a role this account owns. */
  editable?: (item: TListItem) => boolean;
  actions?: TResourceAction[];
  /** A row opens its own page, such as an application with its credentials. */
  href?: (item: TListItem) => string;
  /** Extra sections for the details sheet, such as what a policy grants. */
  describe?: (item: TListItem) => { title: string; rows: { key: string; label: string; value: ReactNode }[] }[];
};

/* Settings forms, typed from their schemas */

export type TAccountCreateValues = z.input<typeof accountCreateSchema>;
export type TCredentialCreateValues = z.input<typeof credentialCreateSchema>;
export type TApplicationCreateValues = z.input<typeof applicationCreateSchema>;
export type TPolicyValues = z.input<typeof policySchema>;

/** Opens a resource's create or edit form. It may load what the form offers first. */
export type TFormOpener = (done: (message: string) => void, item?: TListItem) => Promise<TSheetOptions>;

export type TListItem = Record<string, unknown> & { _id: string };

/** A page of a management list, as OAuth answers it. */
export type TListPage = { items: TListItem[]; total: number; limit: number; offset: number };

/** A scope or permission in OAuth's catalog, with the plugin that registered it. */
export type TCatalogItem = { name: string; description?: string; plugin: string };

/**
 * A permission, marked by OAuth: `grantable` when this person holds it outright
 * and so may put it in a policy, `baseline` when everyone signed in holds it.
 */
export type TCatalogPermission = TCatalogItem & { grantable: boolean; baseline: boolean };

/** Every scope and permission OAuth, its plugins and the product registered. */
export type TCatalog = { scopes: TCatalogItem[]; permissions: TCatalogPermission[] };

/** A sign in provider oauth-sso offers an app, with that app's own settings. */
export type TSsoProvider = {
  id: string;
  name: string;
  issuer: string;
  /** Null until the app adds the provider. Every change sends the current one. */
  revision: number | null;
  enabled: boolean;
  allowRegistration: boolean;
  /** Whether the host lets this provider create accounts at all. */
  registrationAllowed: boolean;
  archived: boolean;
};

/** An application page: the app, its credentials, and its providers, or null without oauth-sso. */
export type TApplicationData = { application: TListItem; credentials: TListItem[]; providers: TSsoProvider[] | null };

/** What a list page's loader gives it. */
export type TListData = {
  resource: TListResource;
  page: TListPage;
  /** The filters applied, checked against the list's columns. */
  filters: TFilterModel[];
  /** Readable names for record ids in applied filters, such as an account's name. */
  labels: Record<string, string>;
};
