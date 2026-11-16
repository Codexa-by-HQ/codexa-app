import { parseTtlToMs } from '@codexa/core/ttl';
import { zod as z } from '@codexa/core/providers/zod';
import {
	type HostEmailConfigInput,
	HostEmailConfigSchema,
} from './email.validation.ts';
import { publicOriginSchema } from './shared.validation.ts';

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
export const DatabaseEnvironmentSchema = z.object({
	DATABASE_URL: z.string().trim().regex(/^mongodb(?:\+srv)?:\/\//),
	DATABASE_NAME: z.string().trim().min(1),
});

/** The address the host and the setup wizard listen on. */
export const ListenerEnvironmentSchema = z.object({
	SERVER_HOSTNAME: z.string().trim().min(1).default('127.0.0.1'),
	SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(8000),
	PUBLIC_ORIGIN: publicOriginSchema.optional(),
});

// OAuth plugin

/** Credential lifetimes. Setup reads these too, so both stay in agreement. */
export const TokenLifetimeEnvironmentSchema = z.object({
	OAUTH_ACCESS_TOKEN_TTL: duration('15m'),
	OAUTH_SESSION_TTL: duration('1d'),
	OAUTH_REFRESH_TOKEN_TTL: duration('30d'),
});

const OAuthEnvironmentSchema = z.object({
	OAUTH_ACCESS_TOKEN_SIGNING_SECRET: z.string().min(32),
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
	REDIS_URL: z.string().trim().regex(/^rediss?:\/\//),
	...OAuthEnvironmentSchema.shape,
	...SmtpEnvironmentSchema.shape,
	...OAuthAppEnvironmentSchema.shape,
}).superRefine((config, ctx) => {
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
			message: 'Set the SMTP host when providing a sender or credentials.',
		});
	}
});

export type HostEnvironment = z.infer<typeof HostEnvironmentSchema>;
export type HostEnvironmentInput = z.input<typeof HostEnvironmentSchema>;
export type SetupEnvironment = z.infer<typeof SetupEnvironmentSchema>;
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
