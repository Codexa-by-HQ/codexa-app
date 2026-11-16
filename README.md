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
| `plugin.ts`, `config/`, `routes/`, `types/`, `app/` | you | the Codexa App plugin and its dashboard frontend |
| `main.ts` | you | the entry point, which only starts the host from `core/host.ts` |

Build your product outside `core/`. Official plugin configuration, providers and
setup live only inside it.

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
| `plugins:local` | installs or refreshes the official plugins |

## Official plugins

| Plugin | Package | Installed from |
|---|---|---|
| `oauth` | `@codexa/oauth` | GitHub, pinned to a commit in `core/scripts/install-local.ts` |
| `oauth-app` | `@codexa/oauth-app` | the sibling `../oauth-app` source folder |

The host installs `oauth`, then `oauth-app`, then `codexa-app`, in
`core/registries/plugins.registry.ts`.

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

Nothing to configure yet. It mounts at `/app`, set in `config/app.config.ts`.

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
```

After changing an official plugin, run `deno task plugins:local` and type check
again, so the host is verified against the installed copies.
