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
| `app/src/core/` | official | the dashboard shell, sign in, session, built in pages and shared UI |
| `plugin.ts`, `config/`, `routes/`, `types/`, the rest of `app/` | you | the Codexa App plugin, your dashboard routes, pages and strings |
| `main.ts` | you | the entry point, which only starts the host |
| `host.ts` | you | the host lifecycle, and the installers for `oauth`, `oauth-app` and `codexa-app` |

Build your product outside `core/` and `app/src/core/`. Official plugin
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
deno task plugins:local           # install the official plugins
deno task setup                   # first run wizard, with the host stopped
deno task dev                     # start the host
```

Setup prints a one time URL and token. Open the URL, enter the token and create
the first account, administrator and OAuth client. Then start the host and open
`http://127.0.0.1:8000/app`.

Check that it is up with `GET /oauth/health`.

## Tasks

| Task | Purpose |
|---|---|
| `dev` | runs the host with watch mode |
| `setup` | runs the OAuth first run wizard on the host address and database |
| `plugins:local` | installs or refreshes the official plugins. `--oauth-source` installs OAuth Base from `../oauth-base` instead of its pinned commit, to test changes before they are pushed |
| `test` | runs the unit and integration tests in `tests/` |
| `test:e2e` | signs in through a real browser, see Tests |

## Official plugins

| Plugin | Package | Installed from |
|---|---|---|
| `oauth` | `@codexa/oauth` | GitHub, pinned to a commit in `core/scripts/install-local.ts` |
| `oauth-app` | `@codexa/oauth-app` | the sibling `../oauth-app` source folder |

`host.ts` installs `oauth`, then `oauth-app`, then `codexa-app`. The
requirements for the two official plugins are built in `core/config/`.

Installed copies live in `plugins/`, with their registry in `.codexa/`. Both are
managed by the Codexa CLI and ignored by git. Never edit them by hand.
`plugins:local` refreshes them: the CLI cannot update an installed plugin yet, so
the task reverses the previous install and installs again. A plugin already at
its pinned commit is skipped.

To move OAuth to a newer release, update its commit in
`core/scripts/install-local.ts` and run `deno task plugins:local`.

## Environment

The host reads `.env` and the process environment. Durations use `s`, `m`, `h`,
`d` or `w`, such as `30s`, `15m` or `1d`. `.env.example` lists every variable
with its default.

### Codexa App host

| Variable | Default | Purpose |
|---|---|---|
| `SERVER_HOSTNAME` | `127.0.0.1` | listen address |
| `SERVER_PORT` | `8000` | listen port |
| `PUBLIC_ORIGIN` | unset | public HTTPS origin behind a proxy |
| `DATABASE_URL` | required | MongoDB replica set URL |
| `DATABASE_NAME` | required | database shared by the host and setup |
| `REDIS_URL` | required | `redis://` or `rediss://` URL |

### OAuth

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_ACCESS_TOKEN_SIGNING_SECRET` | required | HS256 secret, at least 32 characters |
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

Setup reads the three lifetime variables too, so both agree.

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
| `CODEXA_APP_OAUTH_SCOPES` | `profile email` | space separated scopes, each allowed on that client |

It mounts at `/app`, set in `config/app.config.ts`.

### Tests

Read only by `deno task test`. The host ignores them.

| Variable | Default | Purpose |
|---|---|---|
| `OAUTH_TEST_CLIENT_ID` | unset | public client created by setup. The flow test is skipped while unset |
| `OAUTH_TEST_REDIRECT_URI` | `http://127.0.0.1:8000/app/callback` | a redirect URI registered on that client |
| `OAUTH_TEST_PORT` | `8199` | port the test host uses, so tests run alongside the dev host |

## Tests

Tests live in `tests/`, grouped by plugin, and run with `deno task test`.

| File | Covers |
|---|---|
| `tests/oauth/accessToken.provider.test.ts` | the access token provider: round trip, tampering, `alg none`, malformed input, foreign issuer or secret, expiry |
| `tests/oauth/flow.test.ts` | the full OAuth flow against the real host, MongoDB and Redis, then the management lists (paging, order, joins, search), session revocation and the collaborator cap |
| `tests/codexa-app/client.test.ts` | the root redirect, `/app/config.json`, the `/app` security headers and the callback page |

`tests/support/host.ts` boots the real host on `OAUTH_TEST_PORT` for any test
that needs it, and `tests/support/browser.ts` finds a browser and opens pages
for the browser tests.

### Browser tests

`deno task test:e2e` runs `tests/e2e/signin.e2e.ts` and
`tests/e2e/branding.e2e.ts`. The second brands the setup app for one run and
checks that OAuth App wears it in light and dark under the real CSP, then
restores the original branding. The first drives a real headless Chrome or Edge
through the actual screens:

1. `/` opens the app signed out.
2. Sign in hands over to OAuth App.
3. A new account is registered.
4. Consent returns to the Overview, with its tab title.
5. The user menu opens the shared session sheet.
6. The sidebar opens the Account page.
7. An unknown path shows the not found page.
8. A reload keeps the session.
9. Sign out asks first, then returns to sign in.
10. A wrong password shows an error.
11. Signing in again skips the remembered consent.

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
authorization code flow with PKCE. The code lives in `app/src/core/lib/oauth.ts`
and `app/src/core/lib/session.ts`.

1. Opening `/` redirects to `/app/`. Until signed in, every dashboard URL shows
   the sign in page.
2. The app reads its client from `/app/config.json`, creates a PKCE verifier and
   a `state`, and redirects to `/oauth/authorize`.
3. OAuth sends the browser to OAuth App at `/auth/login`, which handles sign in
   and consent.
4. The browser returns to `/app/callback`. The app checks the `state`, exchanges
   the code at `/oauth/token`, replaces the URL with `/app`, and shows the
   dashboard.
5. Sign out asks first, then revokes the refresh token, which ends its whole
   token family.

Tokens are kept in `sessionStorage`, scoped to one tab and cleared when it
closes. They are never written to `localStorage`.

The redirect URI the app sends is the page origin plus `/app/callback`, and it
must exactly match one registered on the client. With the setup client that is
`http://127.0.0.1:8000/app/callback`, so open the app at
`http://127.0.0.1:8000`, not `localhost`.

## Dashboard frontend

The frontend in `app/` is a React dashboard. `app/src/core/` is official and
read only for you. Everything else in `app/src` is yours.

| Path | Purpose |
|---|---|
| `src/main.tsx` | mounts `CodexaApp` from core |
| `src/overrides/routes.tsx` | your dashboard routes |
| `src/locales/<lang>/translation.json` | your strings, layered over core's |
| `src/core/router.tsx` | the route tree: session loader, callback, sign in gate, dashboard layout |
| `src/core/lib/routes.ts` | merges the built in routes with yours and builds the sidebar |
| `src/core/lib/api.ts` | every endpoint core calls, as one object of `{ id, execute }` entries |
| `src/core/lib/request.ts` | the transport behind them: timeouts, form bodies and errors that name their endpoint |
| `src/core/lib/branding.ts` | wears the OAuth application's logo, colours, radius and font from the session |
| `src/core/hooks/` | `useSession`, `useSessionInfo`, `useAsyncAction`, `useConfirm`, `useSheet`, `useSignOut`, `useCopy`, `useTheme` |
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
dark mode. In Arabic and Urdu the sidebar and sheets sit on the right, and every
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

`app/.env.example` lists the frontend dev settings. Copy it to `app/.env` to
change them. They are read only by `vite.config.ts` and never reach browser
code.

| Variable | Default | Purpose |
|---|---|---|
| `CODEXA_HOST_URL` | `http://127.0.0.1:8000` | host the dev server proxies `/oauth`, `/auth` and `/app/config.json` to |
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
`http://127.0.0.1:5173/app/callback`, registered on the client. The production
build served by the host needs no extra redirect URI.

After changing an official plugin, run `deno task plugins:local` and type check
again, so the host is verified against the installed copies.
