# Codexa App

The Codexa host and assembler. It installs the official plugins, serves the
OAuth sign in UI and the product dashboard, and hosts official plugin
interfaces.

| | |
|---|---|
| Package | `@codexa/codexa-app` |
| Plugin id | `codexa-app` |
| Serves | OAuth at `/oauth` and `/auth`, the sign in UI at `/auth`, the dashboard at `/app` |

## Layout

Codexa App is split so that official wiring never mixes with your own code.

| Path | Owner | Contents |
|---|---|---|
| `core/` | official | host lifecycle, plugin installation, providers, environment schemas, setup and install scripts |
| `apps/dashboard/src/core/` | official | the dashboard shell, sign in, session, built in pages and shared UI |
| `plugin.ts`, `config/`, `routes/`, `types/`, the rest of `apps/` | you | the Codexa App plugin, your dashboard routes, pages and strings |
| `main.ts` | you | the entry point, which only starts the host |
| `host.ts` | you | the host lifecycle, and the installers for `oauth`, `oauth-app` and `codexa-app` |

Build your product outside `core/` and `apps/dashboard/src/core/`. Official plugin
configuration, providers, setup and dashboard UI live only inside them.

## Requirements

- Deno 2
- MongoDB running as a replica set, because OAuth writes with transactions. A
  single node replica set is enough for development.
- Redis
- Node and npm, to build the frontends

## Getting started

```sh
cp .env.example .env              # then fill in the required values
deno task install:plugins --base=version   # install every official plugin's latest release
deno task keys:generate           # create the access token, MFA and OIDC keys in certs/
deno task setup                   # first run wizard, with the host stopped
deno task dev                     # start the host
```

Setup prints a one time URL and token. Open the URL, enter the token and create
the first account, administrator and OAuth client. Then start the host and open
`http://localhost:8000/app`. The host listens on `localhost`, because WebAuthn
refuses an IP origin, so passkeys work in development.

Check that it is up with `GET /oauth/health`.

The generated keys live in `certs/`, never in `.env`. `deno task keys:rotate`
replaces them with the host stopped: the access token and OIDC keys end every
session, and the MFA key re-seals every authenticator secret so nobody enrolls
again. `certs/README.md` describes each file and every option.

## Tasks

| Task | Purpose |
|---|---|
| `dev` | runs the host with watch mode |
| `setup` | runs the OAuth first run wizard on the host address and database |
| `install:plugins` | installs or refreshes the official plugins through the Codexa CLI. `--base=version` takes each latest release tag, `--base=commit` each latest commit, `--base=local` each folder in `LOCAL_PATHS`. `--name=<plugin>` installs only that plugin, optionally with `--version`, `--commit` or `--path`, and `--build=<folder>` after a `--name` builds that folder inside the named plugin's installed copy, such as `--name=oauth --build=app/setup`, never on its own. The header of `core/scripts/install-plugins.ts` lists every command |
| `test` | runs the unit and integration tests in `tests/` |
| `test:e2e` | signs in through a real browser, see Tests |

## Optional OAuth plugins

Core installs each optional plugin after OAuth when its settings are present,
and logs why one is off. Their settings have their own `.env` sections.

| Plugin | On when | Pages it uses |
|---|---|---|
| `oauth-mfa` | `certs/mfa/` holds a key | `/auth/mfa`, account Security |
| `oauth-passkey` | the origin is localhost or an HTTPS domain | login, account Security |
| `oauth-magic-link` | email delivery is configured | `/auth/magic-link` |
| `oauth-sso` | the three `OAUTH_SSO_GOOGLE` values are set | login, signup, account Security |
| `oauth-oidc` | `certs/oidc-signing.jwk.json` exists | `/auth/logout` |
| `oauth-device` | always | `/app/device` |
| `media` | `MEDIA_STORAGE_PROVIDER` is set | account Personal info, for the photo |

Google's redirect URI is `<origin>/oauth/sso/callback/<OAUTH_SSO_GOOGLE_PROVIDER_ID>`.
Page names live in `core/config/pages.config.ts`.

## Official plugins

| Plugin | Package | Installed from |
|---|---|---|
| `oauth` and the six optional OAuth plugins | `@codexa/oauth`, `@codexa/oauth-*` | GitHub, at their latest release tag |
| `media` | `@codexa/media` | GitHub, at its latest release tag |
| `oauth-app` | `@codexa/oauth-app` | GitHub, at its latest release tag |

`host.ts` installs `oauth`, then `oauth-app`, then `codexa-app`. The
requirements for the two official plugins are built in `core/config/`.

Installed copies live in `plugins/`, with their registry in `.codexa/`. Both are
managed by the Codexa CLI and ignored by git. Never edit them by hand.
`install:plugins` refreshes them: the CLI cannot update an installed plugin yet,
so the task reverses the previous install and installs again. A plugin already
at the same release or commit is skipped. A release holds no built `dist`, so
OAuth's setup wizard and OAuth App are built in their installed copies.

To move to newer releases, tag them and run
`deno task install:plugins --base=version`.

## Environment

The host reads `.env` and the process environment. Durations use `s`, `m`, `h`,
`d` or `w`, such as `30s`, `15m` or `1d`. `.env.example` lists every variable
with its default.

### Codexa App host

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_HOSTNAME` | `localhost` | listen address. An IP such as `127.0.0.1` turns passkeys off |
| `SERVER_PORT` | `8000` | listen port |
| `PUBLIC_ORIGIN` | unset | public HTTPS origin behind a proxy |
| `TRUST_PROXY` | `false` | read client addresses from X-Forwarded-For. Only behind your own proxy |
| `DATABASE_URL` | required | MongoDB replica set URL |
| `DATABASE_NAME` | required | database shared by the host and setup |
| `REDIS_URL` | required | `redis://` or `rediss://` URL |

### OAuth

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_ACCESS_TOKEN_KEY_FILE` | `certs/access-token.key` | the HS256 access token key. `deno task keys:generate` creates it, see `certs/README.md` |
| `OAUTH_MFA_KEYS_DIR` | `certs/mfa` | oauth-mfa's key ring, one `v<n>.key` per key |
| `OAUTH_OIDC_SIGNING_KEY_FILE` | `certs/oidc-signing.jwk.json` | oauth-oidc's RS256 private key |
| `OAUTH_ACCESS_TOKEN_ISSUER` | required | token issuer URL |
| `OAUTH_ACCESS_TOKEN_AUDIENCE` | required | token audience |
| `OAUTH_ACCESS_TOKEN_TTL` | `15m` | access token lifetime |
| `OAUTH_SESSION_TTL` | `1d` | session lifetime |
| `OAUTH_REFRESH_TOKEN_TTL` | `30d` | refresh token lifetime |
| `OAUTH_TRANSACTION_TTL` | `5m` | authorization transaction lifetime |
| `OAUTH_AUTHORIZATION_CODE_TTL` | `1m` | authorization code lifetime |
| `OAUTH_CSRF_TTL` | `5m` | CSRF token lifetime |
| `OAUTH_OTP_TTL` | `5m` | one time code lifetime |
| `OAUTH_RATE_LIMIT_WINDOW` | `5m` | rate limit window for password sign in and account recovery |
| `OAUTH_PASSWORD_LOGIN_MAX_ATTEMPTS` | `5` | password attempts per window |
| `OAUTH_TRUSTED_CROSS_APP_ISSUER_APP_IDS` | empty | comma separated app ids |
| `OAUTH_ACCOUNT_MAX_DEPTH` | `5` | how deep accounts nest below a root |

Setup reads the three lifetime variables too, so both agree.

| Variable | Default | Purpose |
|---|---|---|

### Media

The media plugin stores uploads, such as profile photos, through Codexa Core
storage. It is off while `MEDIA_STORAGE_PROVIDER` is unset, and then nothing can
be uploaded. What may be uploaded, purpose by purpose, is set in
`core/config/media.config.ts`, not in `.env`.

| Variable | Default | Purpose |
|---|---|---|
| `MEDIA_STORAGE_PROVIDER` | unset | `cloudinary` turns media on |
| `MEDIA_CLOUDINARY_CLOUD_NAME` | required with Cloudinary | from the Cloudinary console |
| `MEDIA_CLOUDINARY_API_KEY` | required with Cloudinary | from the Cloudinary console |
| `MEDIA_CLOUDINARY_API_SECRET` | required with Cloudinary | never leaves the server |

With media on, OAuth App's CSP also allows `https://api.cloudinary.com` for the
upload itself, and nothing else.

### OAuth email delivery

Email is off until `OAUTH_SMTP_HOST` is set. Without it, verification and
password reset email is not sent.

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_SMTP_HOST` | unset | SMTP server |
| `OAUTH_SMTP_PORT` | `587` | SMTP port |
| `OAUTH_SMTP_SECURE` | `false` | TLS from the first byte, usually with port 465 |
| `OAUTH_SMTP_REQUIRE_TLS` | `true` | require STARTTLS |
| `OAUTH_SMTP_FROM` | required with a host | sender, as an address or `Name <address>` |
| `OAUTH_SMTP_USERNAME` | unset | set together with the password |
| `OAUTH_SMTP_PASSWORD` | unset | set together with the username |
| `OAUTH_SMTP_CONNECTION_TIMEOUT` | `10s` | connection timeout |
| `OAUTH_SMTP_GREETING_TIMEOUT` | `10s` | greeting timeout |
| `OAUTH_SMTP_SOCKET_TIMEOUT` | `30s` | socket inactivity timeout |

### OAuth App

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_APP_MOUNT_PATH` | `/auth` | sign in UI path, which must match its Vite base |
| `OAUTH_APP_ASSETS_URL` | the installed build | `file://` URL of a different build, ending in a slash |

### Codexa App

| Variable | Default | Purpose |
|---|---|---|
| `CODEXA_APP_OAUTH_CLIENT_ID` | unset | public client from setup that the frontend signs in with. Sign in stays off while unset |

It mounts at `/app`, set in `config/app.config.ts`.

### Tests

Read only by `deno task test`. The host ignores them.

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_TEST_CLIENT_ID` | unset | public client created by setup. The flow test is skipped while unset |
| `OAUTH_TEST_REDIRECT_URI` | `http://localhost:8000/app/callback` | a redirect URI registered on that client |
| `OAUTH_TEST_ADMIN_USERNAME` | unset | the platform administrator setup created. Tests sign in as this person to write the policies they need |
| `OAUTH_TEST_ADMIN_PASSWORD` | unset | that person's password. Kept only in `.env` |
| `OAUTH_TEST_PORT` | `8199` | port the test host uses, so tests run alongside the dev host |

## Tests

Tests live in `tests/`, grouped by plugin, and run with `deno task test`.

| File | Covers |
|---|---|
| `tests/oauth/accessToken.provider.test.ts` | the access token provider: round trip, tampering, `alg none`, malformed input, foreign issuer or secret, expiry |
| `tests/oauth/flow.test.ts` | the full OAuth flow against the real host, MongoDB and Redis, then the management lists (paging, order, joins, search), session revocation and the collaborator cap |
| `tests/oauth/plugins.test.ts` | the optional plugins as core wires them: sign in methods, OAuth App page names, Google's redirect and callback, OIDC discovery and keys, Device client authentication |
| `tests/oauth/delegation.test.ts` | delegated administration never escalates: a member trusted with policies, roles and invites cannot grant `*`, a permission or namespace they lack, deny the owner by role, global, account, user or member target, widen or archive a restriction on themselves, promote themselves or invite an administrator, while the owner keeps full authority |
| `tests/codexa-app/client.test.ts` | the root page, `/app/config.json`, the `/app` security headers and the callback page |
| `tests/oauth/catalog.test.ts` | the catalog's namespace rules and undo, plugins' settings kept apart and validated, and through the host: every plugin's entries listed, owners given capabilities by a policy, and a new application provisioned whole, with copied roles, the creator link and its own administrator signing in |
| `tests/oauth/setup.test.ts` | the first run setup against a throwaway database: the plugins' scopes offered, any other refused, a client without an API scope refused, and only the two system policies and empty roles created |
| `tests/oauth/system.test.ts` | a new person holds only the baseline, no deny overrides a system policy, system policies cannot be changed, every route is in the catalog with its permission, and only the platform administrator writes application wide policies |
| `tests/codexa-app/keys.test.ts` | reading and refusing key files without echoing them, the MFA ring order, generated OIDC keys, and re-sealing stored MFA secrets with a new key against the real database |
| `tests/oauth/conditions.test.ts` | policy conditions are enforced as written: every comparison, and, or, not, nested groups, field references, a conditional deny and the active window, and malformed conditions refused |
| `tests/oauth/listFilters.test.ts` | every filter operator to MongoDB and back, literal text, refused malformed filters, and on the accounts list the hierarchy filters, the tenant boundary and the depth limit |
| `tests/oauth/security.test.ts` | a penetration pass: foreign account ids, bad tokens, injection, cross tenant reads and writes, mass assignment, open redirects, PKCE and code replay, disallowed grants, CORS, account switch escalation, password guessing, revoked sessions, security headers and idempotency |
| `tests/oauth/tenancy.test.ts` | roles and policies stay inside the account that made them, built in roles stay shared and read only |
| `tests/oauth/credentials.test.ts` | a machine credential with a role gets a service identity and a client credentials token, and every misuse is refused |
| `tests/oauth/media.test.ts` | OAuth keeping a picture only as an HTTPS URL, device naming and client addresses, and with Cloudinary on: media's catalog entries, its purposes, every refusal, a real signed upload and its check, another person's and another account's refusal, an account's filtered file list, a fake file, and deletion of a replaced or removed picture's file |
| `tests/codexa-app/settings.test.ts` | every Settings list the session's capabilities allow answers `{ items, total }` |
| `tests/oauth-app/account.test.ts` | the account area reads answer for a signed in user, and a plugin read answers 404 when that plugin is off |

`tests/support/host.ts` boots the real host on `OAUTH_TEST_PORT` for any test
that needs it. Nobody holds anything a policy does not give, so tests act as the
platform administrator through `tests/support/oauth.ts`: `signInAdmin`,
`grant` and `revoke` write application wide policies, and `withOwners` runs
a test where account owners hold the catalog's permissions, archived again
afterwards. and `tests/support/browser.ts` finds a browser and opens pages
for the browser tests.

### Browser tests

`deno task test:e2e` runs `tests/e2e/signin.e2e.ts`,
`tests/e2e/branding.e2e.ts`, `tests/e2e/methods.e2e.ts`,
`tests/e2e/session.e2e.ts`, `tests/e2e/expired.e2e.ts`,
`tests/e2e/recovery.e2e.ts`, `tests/e2e/shell.e2e.ts`,
`tests/e2e/account.e2e.ts`, `tests/e2e/sso.e2e.ts`, `tests/e2e/manage.e2e.ts`,
`tests/e2e/tenant.e2e.ts`, `tests/e2e/developers.e2e.ts`, `tests/e2e/device.e2e.ts` and
`tests/e2e/providers.e2e.ts`.

`manage.e2e.ts` drives Settings as a new account owner: roles, policies with a
custom permission added with Enter and text that cannot be one refused,
applications with each kind of credential and a secret rotation, invitations,
accounts, a text filter that runs on the server, a filter that survives a reload, row menus and
the grid view. `tenant.e2e.ts` signs a person with two accounts in, opens a URL
without an account, switches from the profile menu and through consent, follows
a link back to the first account, falls back from an account they are not in,
and checks that a second tab follows a switch. `developers.e2e.ts` drives OAuth App's Developers page (redirect URLs, the issued example, rotation, revocation and deleting an app), the phone picker and passkeys. `device.e2e.ts` approves a device code after signing in from the device page, denies one, and explains a mistyped one. `providers.e2e.ts` makes a new person an administrator of the platform account through a membership fixture, then adds, renames, removes and restores a sign in provider on the platform app, putting its settings back afterwards. `sso.e2e.ts` checks that the
Google button reaches Google. The rest cover the dead end pages and their way back to
the app, forgot password, refused reset and verification links, Ctrl K search,
the rail and the phone menu, and the account area: turning on two step
verification with a real code, a refused and a successful password change,
and signing in again after each, since both sign every session out. The third enrolls a
real authenticator through oauth-mfa, then drives two step verification with a
code and with a recovery code, the password rules and the magic link request. The second brands the setup app for one run and
checks that OAuth App wears it in light and dark under the real CSP, then
restores the original branding. The first drives a real headless Chrome or Edge
through the actual screens:

1. `/app/` opens the app signed out.
2. Sign in hands over to OAuth App.
3. A new account is registered.
4. Consent returns to the Overview, with its tab title.
5. The sidebar opens the Session page.
6. An unknown path shows the not found page.
7. A reload keeps the session.
8. Sign out asks first, then returns to sign in.
9. A wrong password shows an error.
10. Signing in again skips the remembered consent.

`tests/e2e/ui.e2e.ts` is the full UI review. It walks every screen in light and
dark, English and Arabic, on a desktop and a phone, and fails on a second `h1`,
sideways scrolling, a wrong reading direction or theme, or any console error or
CSP violation. With `E2E_SCREENSHOT_DIR` set it saves each screen under
`ui/<variant>/` for review. It takes about three minutes, so it runs on its
own with `deno test -A tests/e2e/ui.e2e.ts`.

Browser tests run on `SERVER_PORT`, because the app builds its redirect URI from the page
origin, so stop the dev host first. It uses `E2E_BROWSER_PATH` when set,
otherwise an installed Chrome or Edge, and it is skipped when neither exists.
Each run registers one throwaway user named `e2e_` followed by random
characters. It is kept out of `deno task test` because it needs a browser and
the main port.

The flow test boots the host on `OAUTH_TEST_PORT`, then runs authorize, register,
consent, code exchange with PKCE, a protected call, refresh rotation, refresh
replay detection and a second sign in. It needs a completed setup, and each run
registers one throwaway user named `flowtest_` followed by random characters.

## Sign in

The Codexa App frontend signs in as a public OAuth client, using the
authorization code flow with PKCE. The code lives in `apps/dashboard/src/core/lib/oauth.ts`
and `apps/dashboard/src/core/lib/session.ts`.

1. `/` only says the server is running and links to `/app/`, so the app opens
   only when its path is visited. Until signed in, every dashboard URL shows
   the sign in page.
2. The app reads its client from `/app/config.json`, creates a PKCE verifier and
   a `state`, and redirects to `/oauth/authorize`.
3. OAuth sends the browser to OAuth App at `/auth/login`, which handles sign in
   and consent.
4. The browser returns to `/app/callback`. The app checks the `state`, exchanges
   the code at `/oauth/token`, and replaces the URL with the page the sign in
   started from, inside the session's account, such as `/app/<accountId>/`.
5. Sign out asks first, then revokes the refresh token, which ends its whole
   token family, and every open tab signs out with it.

### How the session stays signed in and safe

Core lists Codexa App's client in OAuth Base's `browserSessions`, so OAuth
keeps the refresh token in an httpOnly, SameSite=Strict cookie on `/oauth`.

- No script can read the refresh token, and the access token lives only in
  memory for minutes, so nothing long lived is in `localStorage` or
  `sessionStorage`.
- Each tab and each reload gets its own access token by refreshing through the
  cookie, so a sign in reaches every tab and survives a browser restart.
- Tabs refresh one at a time through `navigator.locks`. Refresh tokens rotate,
  and a reused one revokes the whole family, so a stolen copy dies on use.
- Signing in or out is broadcast to every tab on a `BroadcastChannel`.
- The PKCE verifier waits in `localStorage` under its `state` for up to 15
  minutes and is used once, so a sign in can finish in another tab, as when a
  magic link opens from an email.

`tests/e2e/session.e2e.ts` proves each point, including the negative cases: a
replayed refresh token, a cross site request and a forged `Origin` all fail.

A future Capacitor build keeps the same flow but stores the refresh token in
the device's secure storage, because a native app does not run on a listed
web origin and so uses the standard body exchange.

The redirect URI the app sends is the page origin plus `/app/callback`, and it
must exactly match one registered on the client. With the setup client that is
`http://localhost:8000/app/callback`, so open the app at
`http://localhost:8000`. A client set up before the move to `localhost` needs
that URI added, and Google's console needs
`http://localhost:8000/oauth/sso/callback/<provider id>`.

### Accounts in the URL

Every dashboard page lives under `/app/<accountId>/...`, so a link names the
account it belongs to. The router's basename is `/app/<accountId>`, decided
once per page load in `routerBasename()`, so every link inside the app stays
relative to the account and moving to another account always loads the page
again.

- A URL without an account, such as `/app/settings/roles`, opens the same page
  in the session's account.
- A URL naming another account the person belongs to switches to it through
  `POST /oauth/account-switch`. OAuth binds a new authorization code to that
  membership, can never add scopes, shows consent the first time for that
  account, and rotates the old session when the code is exchanged. The page is
  kept.
- A URL naming an account the person is not in opens their own account.
- The browser holds one session, so when one tab switches, the others load
  their new account's page instead of showing the old one's data.
- "Change account" in the profile menu, and its own section on a phone, lists
  `/auth/management/accounts/memberships`, only when there is more than one.

### List filters

Each Settings list declares its filter columns once in
`apps/dashboard/src/core/config/navigation.ts` with the builders in
`core/config/filters.ts`, using the same column ids as OAuth Base. The
Filter button picks a column and then its value, and each applied filter is
a chip of column, operator and value. A text filter, such as Name, replaces a
separate search box. Filters and page live in the URL through
`useListParams`, so a filtered list can be shared and reloaded.

### Permissions in the UI

Policies are written in one sheet: who they apply to, a permission matrix
grouped by resource where each permission is allowed, denied or left out, a
condition builder over the signed in person, account, membership, role and
session, and an active window. The matrix and the credential forms read
OAuth's catalog from `GET /auth/management/catalog`, so every permission and
scope OAuth, its plugins and your product register is offered, and nothing is
copied. The matrix offers only the permissions OAuth marks `grantable` for
you, plus any the policy already names. The platform administrator also sees
"Whole application", which writes an application wide policy. System policies
are listed read only.

Settings > Applications > New application provisions a whole application, as
setup provisions the first: its administrator, account, first client, the
custom roles to copy, and whether you are recorded as its creator. Afterwards
every id and the client secret, once, show with copy buttons. To use it, set
its client id as `CODEXA_APP_OAUTH_CLIENT_ID` and sign in as its
administrator.

Your product's own scopes and permissions are declared once in
`config/app.config.ts` as `PRODUCT_CATALOG`. Codexa App registers it at
startup, the dashboard asks for its scopes when signing in, and Settings offers
it.

OAuth evaluates what the session may do and returns it as `capabilities` from
`GET /auth/management/session`. The sidebar, list actions, create and edit
buttons, and the application page show only what those allow. A route with a
capability refuses a typed or shared URL before its loader runs and shows "No
access" inside the shell. All of this is convenience, because OAuth's guards
decide every call, including delegation: nobody grants, denies or archives
more than they hold.

## Dashboard frontend

The frontend in `apps/dashboard/` is a React dashboard served at `/app`.
`apps/dashboard/src/core/` is official and read only for you. Everything else
in `apps/dashboard/src` is yours. Each frontend lives in its own folder under
`apps/`, so another app sits beside the dashboard, such as `apps/storefront`,
and you serve its `dist` with `serveStatic` under a route of your own.

| Path | Purpose |
|---|---|
| `src/main.tsx` | mounts `CodexaApp` from core |
| `src/overrides/routes.tsx` | your dashboard routes |
| `src/locales/<lang>/translation.json` | your strings, layered over core's |
| `src/core/router.tsx` | the route tree: session loader, callback, sign in gate, dashboard layout |
| `src/core/lib/routes.ts` | merges the built in routes with yours and builds the sidebar |
| `src/core/lib/api.ts` | every endpoint core calls, as one object of `{ id, execute }` entries |
| `src/core/lib/request.ts` | the transport behind them: timeouts, form bodies and errors that name their endpoint |
| `src/core/lib/oauth.ts` | sign in with PKCE, the in memory access token, refreshes and sign out |
| `src/core/lib/loaders.ts` | the session loader, which settles who is signed in before any page renders |
| `src/core/lib/utils.ts` | `cn` and every helper, such as the branding stylesheet |
| `src/core/types.ts` | every core type, including the route types your overrides use |
| `src/core/contexts/` | `Session` (`useSession`, `useSignedInSession`, `useBranding`), `Theme` (`useTheme`), `Sheet` (`sheet`, `useSheet`) and `Confirm` (`confirm`, `useConfirm`) |
| `src/core/hooks/` | `useAsyncAction`, `useSignOut`, `useCopy`, `useDashboardNav` |
| `src/core/config/navigation.ts` | the built in rail sections and the Settings lists, each with its management API path, columns, filters, create and edit capabilities and actions |
| `src/core/config/permissions.ts` | the roots and fields the condition builder suggests. Permissions and scopes come from OAuth's catalog |
| `src/core/layouts/dashboard/` | the admin shell on shadcn's `Sidebar`: `IconRail` and `SectionSidebar` as two nested sidebars that collapse to the rail, `MobileNav` inside the same sidebar's phone sheet, all sharing `NavTree` (`SidebarMenu` and `SidebarMenuSub`) for grouped pages, `PageBreadcrumb`, `SearchCommand` (Ctrl K), and `ProfileMenu` with the Language and Appearance submenus |
| `src/core/pages/settings/Application.tsx` | one application: its details, its Branding sheet (logos, font and every colour of each theme, each empty field keeping the app's own), credentials by kind with their state, and oauth-sso's sign in providers when the plugin is installed |
| `src/core/pages/ResourceList.tsx` | the one Settings list page: filters, paging, a table on a desktop, items on a phone, a create button, and details with Edit and actions in the sheet |
| `src/core/pages/settings/` | `forms.tsx` (every create and edit form), `RecordDetails.tsx` (the details sheet and its confirmed actions) and `Application.tsx` (an app with its credentials) |
| `src/core/components/form/` | `SheetForm` and the fields every form uses: text, text area, switch, select and chips |
| `src/overrides/sections.ts` | your rail sections |
| `src/core/components/` | `PageHeader`, `EmptyState`, `CopyField`, `IconTile` and other shared pieces |

Add a page by giving it a key in `src/overrides/routes.tsx`. A route with a
`name` appears in the sidebar and breadcrumb, ordered by `priority` and grouped
by `group`, and `display: false` keeps it out of the sidebar.

```tsx
export const routes: TRoutesOverride = {
	reports: {
		path: 'reports',
		name: 'nav.reports', // a key in src/locales/<lang>/translation.json
		icon: Analytics01Icon,
		priority: 20,
		lazy: async () => ({ Component: (await import('@/pages/Reports')).default }),
	},
};
```

The built in keys are `overview` and `account`. Using one replaces that page,
and adding `merge: true` keeps its icon and position while swapping the page.
The dashboard wears the branding OAuth stores on the application, in light and
dark mode, read from `GET /auth/applications/branding` by the session's
`appId`, or before sign in by the client id in `/app/config.json`, so the sign
in screen and OAuth App's pages wear the same theme. In Arabic and Urdu the sidebar and sheets sit on the right, and every
link between pages cross fades with a view transition.

Pages render inside the dashboard, signed in, so `useSessionInfo()` always has
the session. Open the shared sheet with `useSheet().open(...)` and ask for
confirmation with `useConfirm()` rather than mounting your own.

## Calling OAuth from a client

Facts the flow test established, which every client including OAuth App relies
on.

- `GET /oauth/authorize` with `Accept: text/html` redirects to the sign in UI at
  `/login?authTxnId=...`, or `/register` when `screen_hint=signup`. With
  `Accept: application/json` it returns the transaction instead.
- Versioned routes need `X-Auth-Version: 1.0.0`. Sending
  `x-oauth-interaction: json` makes interaction routes answer with JSON instead
  of a redirect.
- Password login and registration always answer `next: consent`. The client
  then calls `GET /auth/consent`, which either returns the scopes to show or
  skips straight to the redirect when the account already granted them.
- The token response includes `account_id`. Protected routes need it as
  `X-Account-Id` next to the bearer token.

## URLs the host derives

OAuth redirects browsers to URLs built from the public origin, or the listener
origin when `PUBLIC_ORIGIN` is unset.

| URL | Value |
|---|---|
| Sign in UI | origin plus `OAUTH_APP_MOUNT_PATH` |
| Management UI | origin plus `/app` |
| Email action links | the sign in UI followed by a slash |

The management UI lives in Codexa App rather than under `/auth/management`,
because OAuth serves its versioned management API on that path, and a versioned
route takes precedence over a UI on the same path.

## Development

```sh
deno check main.ts
deno lint
npm --prefix app run build        # the dashboard frontend
npm --prefix app run dev          # frontend dev server
```

`apps/dashboard/.env.example` lists the frontend dev settings. Copy it to `apps/dashboard/.env` to
change them. They are read only by `vite.config.ts` and never reach browser
code.

| Variable | Default | Purpose |
|---|---|---|
| `CODEXA_HOST_URL` | `http://localhost:8000` | host the dev server proxies `/oauth`, `/auth` and `/app/config.json` to |
| `DEV_PORT` | `5173` | `npm run dev` port |
| `PREVIEW_PORT` | `4173` | `npm run preview` port |

Browser settings are `VITE_` variables, inlined at build time, so rebuild after
changing one. All are optional.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_OAUTH_PATH` | `/oauth` | where OAuth serves its token and revocation endpoints |
| `VITE_AUTH_API_PATH` | `/auth` | where OAuth serves its versioned API |
| `VITE_AUTH_API_VERSION` | `1.0.0` | sent as `X-Auth-Version` |
| `VITE_REQUEST_TIMEOUT_MS` | `15000` | how long one request may take |
| `VITE_BRAND_URL` | `https://github.com/Codexa-by-HQ` | target of the "Powered by" link |
| `VITE_ENABLE_THEME_SWITCHER` | `true` | shows the theme toggle |
| `VITE_ENABLE_LANGUAGE_SWITCHER` | `true` | shows the language picker |

Signing in from the dev server needs a redirect URI for its origin, such as
`http://localhost:5173/app/callback`, registered on the client. The production
build served by the host needs no extra redirect URI.

After changing an official plugin, run `deno task install:plugins` and type check
again, so the host is verified against the installed copies.
