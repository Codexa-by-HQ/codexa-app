import { parseTtlToMs } from '@codexa/core/ttl';
import { zod as z } from '@codexa/core/providers/zod';
import {
	type HostEmailConfigInput,
	HostEmailConfigSchema,
} from './email.validation.ts';
import { envBoolean, publicOriginSchema } from './shared.validation.ts';

/**
 * A human readable duration such as 30s, 15m, 1h, 1d or 2w, parsed to
 * milliseconds. The default is the value used when the variable is unset.
 */
function duration(defaultValue: string) {
	return z.string().trim()
		.regex(/^\d+[smhdw]$/, 'Use a duration such as 30s, 15m, 1h or 30d.')
		.default(defaultValue)
		.transform(parseTtlToMs)
		.refine((ms) => ms > 0, 'Use a duration greater than zero.');
}

/** A comma separated list, trimmed, with empty entries dropped. */
function list() {
	return z.string().default('').transform((value) =>
		value.split(',').map((item) => item.trim()).filter(Boolean)
	);
}

// Codexa App host

/**
 * Where OAuth data lives. Setup and the host must point at the same database,
 * so neither one guesses a default name.
 */
/** Image types a browser can encode a cropped photo as. */

/** A path to a key file or folder, relative to where the host runs. */
const keyPath = (fallback: string) =>
	z.string().trim().min(1).max(500).default(fallback);

export const DatabaseEnvironmentSchema = z.object({
	DATABASE_URL: z.string().trim().regex(/^mongodb(?:\+srv)?:\/\//),
	DATABASE_NAME: z.string().trim().min(1),
});

/** The address the host and the setup wizard listen on. */
export const ListenerEnvironmentSchema = z.object({
	SERVER_HOSTNAME: z.string().trim().min(1).default('localhost'),
	SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
	PUBLIC_ORIGIN: publicOriginSchema.optional(),
	// Read client addresses from X-Forwarded-For. Only behind your own proxy.
	TRUST_PROXY: envBoolean.default(false),
});

// OAuth plugin

/** Credential lifetimes. Setup reads these too, so both stay in agreement. */
/**
 * Generated keys live in files under certs/, made and rotated by deno task
 * keys:generate and keys:rotate. Paths are relative to codexa-app. oauth-mfa
 * stays off while the folder holds no v<n>.key file, oauth-oidc while its file
 * is missing.
 */
export const KeyFilesEnvironmentSchema = z.object({
	OAUTH_ACCESS_TOKEN_KEY_FILE: keyPath('certs/access-token.key'),
	OAUTH_MFA_KEYS_DIR: keyPath('certs/mfa'),
	OAUTH_OIDC_SIGNING_KEY_FILE: keyPath('certs/oidc-signing.jwk.json'),
});

/** What keys:generate and keys:rotate read: the database, the listener and the key files. */
export const KeysEnvironmentSchema = z.object({
	...DatabaseEnvironmentSchema.shape,
	...ListenerEnvironmentSchema.shape,
	...KeyFilesEnvironmentSchema.shape,
});

export const TokenLifetimeEnvironmentSchema = z.object({
	OAUTH_ACCESS_TOKEN_TTL: duration('15m'),
	OAUTH_SESSION_TTL: duration('1d'),
	OAUTH_REFRESH_TOKEN_TTL: duration('30d'),
});

const OAuthEnvironmentSchema = z.object({
	OAUTH_ACCESS_TOKEN_ISSUER: z.url(),
	OAUTH_ACCESS_TOKEN_AUDIENCE: z.string().trim().min(1).max(255),

	...TokenLifetimeEnvironmentSchema.shape,

	OAUTH_TRANSACTION_TTL: duration('5m'),
	OAUTH_AUTHORIZATION_CODE_TTL: duration('1m'),
	OAUTH_CSRF_TTL: duration('5m'),

	OAUTH_OTP_TTL: duration('5m'),
	OAUTH_RATE_LIMIT_WINDOW: duration('5m'),
	OAUTH_PASSWORD_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).default(
		5,
	),

	OAUTH_TRUSTED_CROSS_APP_ISSUER_APP_IDS: list(),
	// How deep accounts nest below a root account.
	OAUTH_ACCOUNT_MAX_DEPTH: z.coerce.number().int().min(0).max(20).default(5),
});

/**
 * The media plugin's storage provider credentials, which the provider issues.
 * Media is off while MEDIA_STORAGE_PROVIDER is unset. What may be uploaded is
 * set in core/config/media.config.ts, not here.
 */
export const MediaEnvironmentSchema = z.object({
	MEDIA_STORAGE_PROVIDER: z.enum(['cloudinary']).optional(),
	MEDIA_CLOUDINARY_CLOUD_NAME: z.string().trim().min(1).optional(),
	MEDIA_CLOUDINARY_API_KEY: z.string().trim().min(1).optional(),
	MEDIA_CLOUDINARY_API_SECRET: z.string().trim().min(1).optional(),
});

const smtp = HostEmailConfigSchema.shape;

/** OAuth email delivery. Off until OAUTH_SMTP_HOST is set. */
const SmtpEnvironmentSchema = z.object({
	OAUTH_SMTP_HOST: smtp.host.optional(),
	OAUTH_SMTP_PORT: smtp.port,
	OAUTH_SMTP_SECURE: smtp.secure,
	OAUTH_SMTP_REQUIRE_TLS: smtp.requireTls,
	OAUTH_SMTP_FROM: smtp.from.optional(),
	OAUTH_SMTP_USERNAME: smtp.username,
	OAUTH_SMTP_PASSWORD: smtp.password,
	OAUTH_SMTP_CONNECTION_TIMEOUT: duration('10s'),
	OAUTH_SMTP_GREETING_TIMEOUT: duration('10s'),
	OAUTH_SMTP_SOCKET_TIMEOUT: duration('30s'),
});

// OAuth App plugin

const OAuthAppEnvironmentSchema = z.object({
	// Must match the Vite base the OAuth App frontend was built with.
	OAUTH_APP_MOUNT_PATH: z.string().regex(/^(\/[A-Za-z0-9_-]+)+$/).default(
		'/auth',
	),
	OAUTH_APP_ASSETS_URL: z.url({ protocol: /^file$/ }).refine(
		(value) => new URL(value).pathname.endsWith('/'),
		'Use a file URL ending in a slash.',
	).optional(),
});

// Codexa App plugin

/** The OAuth client Codexa App signs in with. */
const CodexaAppEnvironmentSchema = z.object({
	// Public client from setup. Sign in stays off while this is unset.
	CODEXA_APP_OAUTH_CLIENT_ID: z.string().trim().min(1).optional(),
});

// Optional OAuth plugins. Each one installs only when core has what it needs.

/** A 24 character hex MongoDB ObjectId, as plugins identify apps and providers. */
const objectIdSchema = z.string().trim().regex(
	/^[a-f0-9]{24}$/,
	'Use a 24 character lowercase hex ObjectId.',
);

/** The SSO providers the host offers, each read from OAUTH_SSO_<KEY>_ variables. */
export const SSO_PROVIDER_KEYS = ['GOOGLE', 'GITHUB', 'FACEBOOK'] as const;
export type TSsoProviderKey = (typeof SSO_PROVIDER_KEYS)[number];

/**
 * One SSO provider's settings. The provider ID is a fixed ObjectId, because
 * the redirect URI registered at the provider ends with it. Registration is on
 * by default, and so is signing a verified email in to the existing user with
 * the same verified email.
 */
function ssoProviderEnvironment<K extends TSsoProviderKey>(key: K) {
	return {
		[`OAUTH_SSO_${key}_PROVIDER_ID`]: objectIdSchema.optional(),
		[`OAUTH_SSO_${key}_CLIENT_ID`]: z.string().trim().min(1).optional(),
		[`OAUTH_SSO_${key}_CLIENT_SECRET`]: z.string().trim().min(1).optional(),
		[`OAUTH_SSO_${key}_ALLOW_REGISTRATION`]: envBoolean.default(true),
		[`OAUTH_SSO_${key}_LINK_VERIFIED_EMAIL`]: envBoolean.default(true),
	} as
		& {
			[N in `OAUTH_SSO_${K}_PROVIDER_ID`]: z.ZodOptional<
				typeof objectIdSchema
			>;
		}
		& {
			[N in `OAUTH_SSO_${K}_CLIENT_ID` | `OAUTH_SSO_${K}_CLIENT_SECRET`]:
				z.ZodOptional<z.ZodString>;
		}
		& {
			[
				N in
					| `OAUTH_SSO_${K}_ALLOW_REGISTRATION`
					| `OAUTH_SSO_${K}_LINK_VERIFIED_EMAIL`
			]: z.ZodDefault<typeof envBoolean>;
		};
}

const OAuthPluginsEnvironmentSchema = z.object({
	// oauth-mfa. Off while OAUTH_MFA_KEYS_DIR holds no v<n>.key file.
	OAUTH_MFA_ISSUER: z.string().trim().min(1).max(100).default('Codexa'),

	// oauth-passkey. On when the public origin is localhost or an HTTPS domain,
	// because WebAuthn rejects an IP address as the relying party.
	OAUTH_PASSKEY_RP_NAME: z.string().trim().min(1).max(100).default('Codexa'),

	// oauth-magic-link. On when email delivery is configured.
	OAUTH_MAGIC_LINK_TTL: duration('5m').refine(
		(ms) => ms >= 60_000 && ms <= 600_000,
		'Use a lifetime from 1m to 10m.',
	),

	// oauth-sso. Each provider turns on when its ID, client ID and secret are set.
	...ssoProviderEnvironment('GOOGLE'),
	...ssoProviderEnvironment('GITHUB'),
	...ssoProviderEnvironment('FACEBOOK'),

	// oauth-oidc. Off while OAUTH_OIDC_SIGNING_KEY_FILE is missing.
	OAUTH_OIDC_ID_TOKEN_TTL: duration('5m').refine(
		(ms) => ms >= 60_000 && ms <= 3_600_000,
		'Use a lifetime from 1m to 1h.',
	),

	// oauth-device. Always on.
	OAUTH_DEVICE_CODE_TTL: duration('10m').refine(
		(ms) => ms >= 300_000 && ms <= 1_800_000,
		'Use a lifetime from 5m to 30m.',
	),
	OAUTH_DEVICE_POLLING_INTERVAL: duration('5s').refine(
		(ms) => ms >= 5_000 && ms <= 60_000,
		'Use an interval from 5s to 60s.',
	),
});

// Composed schemas

/** Everything the one time setup wizard needs, and nothing more. */
export const SetupEnvironmentSchema = z.object({
	...DatabaseEnvironmentSchema.shape,
	...ListenerEnvironmentSchema.shape,
	...TokenLifetimeEnvironmentSchema.shape,
});

/** Environment variable that reports each SMTP config field. */
const SMTP_VARIABLES = {
	host: 'OAUTH_SMTP_HOST',
	port: 'OAUTH_SMTP_PORT',
	secure: 'OAUTH_SMTP_SECURE',
	requireTls: 'OAUTH_SMTP_REQUIRE_TLS',
	from: 'OAUTH_SMTP_FROM',
	username: 'OAUTH_SMTP_USERNAME',
	password: 'OAUTH_SMTP_PASSWORD',
	connectionTimeoutMs: 'OAUTH_SMTP_CONNECTION_TIMEOUT',
	greetingTimeoutMs: 'OAUTH_SMTP_GREETING_TIMEOUT',
	socketTimeoutMs: 'OAUTH_SMTP_SOCKET_TIMEOUT',
} as const;

export const HostEnvironmentSchema = z.object({
	...DatabaseEnvironmentSchema.shape,
	...ListenerEnvironmentSchema.shape,
	...KeyFilesEnvironmentSchema.shape,
	REDIS_URL: z.string().trim().regex(/^rediss?:\/\//),
	...OAuthEnvironmentSchema.shape,
	...SmtpEnvironmentSchema.shape,
	...MediaEnvironmentSchema.shape,
	...OAuthAppEnvironmentSchema.shape,
	...OAuthPluginsEnvironmentSchema.shape,
	...CodexaAppEnvironmentSchema.shape,
}).superRefine((config, ctx) => {
	if (config.MEDIA_STORAGE_PROVIDER === 'cloudinary') {
		for (
			const name of [
				'MEDIA_CLOUDINARY_CLOUD_NAME',
				'MEDIA_CLOUDINARY_API_KEY',
				'MEDIA_CLOUDINARY_API_SECRET',
			] as const
		) {
			if (config[name]) continue;
			ctx.addIssue({
				code: 'custom',
				path: [name],
				message:
					'Cloudinary storage needs its cloud name, key and secret.',
			});
		}
	}
	for (const provider of SSO_PROVIDER_KEYS) {
		const names = [
			`OAUTH_SSO_${provider}_PROVIDER_ID`,
			`OAUTH_SSO_${provider}_CLIENT_ID`,
			`OAUTH_SSO_${provider}_CLIENT_SECRET`,
		] as const;
		const set = names.filter((name) => config[name] !== undefined);
		if (set.length && set.length < names.length) {
			for (const name of names) {
				if (config[name] !== undefined) continue;
				ctx.addIssue({
					code: 'custom',
					path: [name],
					message:
						`${provider} sign in needs all three OAUTH_SSO_${provider} values.`,
				});
			}
		}
	}
	const input = smtpConfig(config);
	if (input) {
		const result = HostEmailConfigSchema.safeParse(input);
		for (const issue of result.error?.issues ?? []) {
			const field = issue.path[0] as keyof typeof SMTP_VARIABLES;
			ctx.addIssue({
				code: 'custom',
				path: [SMTP_VARIABLES[field] ?? 'OAUTH_SMTP_HOST'],
				message: issue.message,
			});
		}
	} else if (
		config.OAUTH_SMTP_FROM || config.OAUTH_SMTP_USERNAME ||
		config.OAUTH_SMTP_PASSWORD
	) {
		ctx.addIssue({
			code: 'custom',
			path: ['OAUTH_SMTP_HOST'],
			message:
				'Set the SMTP host when providing a sender or credentials.',
		});
	}
});

export type HostEnvironment = z.infer<typeof HostEnvironmentSchema>;
export type HostEnvironmentInput = z.input<typeof HostEnvironmentSchema>;
export type SetupEnvironment = z.infer<typeof SetupEnvironmentSchema>;
export type KeysEnvironment = z.infer<typeof KeysEnvironmentSchema>;
export type TokenLifetimeEnvironment = z.infer<
	typeof TokenLifetimeEnvironmentSchema
>;

type SmtpEnvironment = z.infer<typeof SmtpEnvironmentSchema>;

/**
 * Map the SMTP variables onto the email provider input. Returns undefined when
 * no SMTP host is set, which leaves email delivery off. A missing sender
 * becomes an empty string so validation reports it against OAUTH_SMTP_FROM.
 */
export function smtpConfig(
	config: SmtpEnvironment,
): HostEmailConfigInput | undefined {
	if (!config.OAUTH_SMTP_HOST) return undefined;
	return {
		host: config.OAUTH_SMTP_HOST,
		port: config.OAUTH_SMTP_PORT,
		secure: config.OAUTH_SMTP_SECURE,
		requireTls: config.OAUTH_SMTP_REQUIRE_TLS,
		from: config.OAUTH_SMTP_FROM ?? '',
		username: config.OAUTH_SMTP_USERNAME,
		password: config.OAUTH_SMTP_PASSWORD,
		connectionTimeoutMs: config.OAUTH_SMTP_CONNECTION_TIMEOUT,
		greetingTimeoutMs: config.OAUTH_SMTP_GREETING_TIMEOUT,
		socketTimeoutMs: config.OAUTH_SMTP_SOCKET_TIMEOUT,
	};
}
