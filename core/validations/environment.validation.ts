import { zod as z } from '@codexa/core/providers/zod';
import {
	type HostEmailConfigInput,
	HostEmailConfigSchema,
} from './email.validation.ts';
import { envBoolean, publicOriginSchema } from './shared.validation.ts';

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
	OAUTH_PUBLIC_ORIGIN: publicOriginSchema.optional(),
});

/** Everything the one time setup wizard needs, and nothing more. */
export const SetupEnvironmentSchema = z.object({
	...DatabaseEnvironmentSchema.shape,
	...ListenerEnvironmentSchema.shape,
});

const smtp = HostEmailConfigSchema.shape;

/** Environment variable that reports each SMTP config field. */
const SMTP_VARIABLES = {
	host: 'OAUTH_SMTP_HOST',
	port: 'OAUTH_SMTP_PORT',
	secure: 'OAUTH_SMTP_SECURE',
	requireTls: 'OAUTH_SMTP_REQUIRE_TLS',
	from: 'OAUTH_SMTP_FROM',
	username: 'OAUTH_SMTP_USERNAME',
	password: 'OAUTH_SMTP_PASSWORD',
} as const;

export const HostEnvironmentSchema = z.object({
	...DatabaseEnvironmentSchema.shape,
	...ListenerEnvironmentSchema.shape,
	REDIS_URL: z.string().trim().regex(/^rediss?:\/\//),

	OAUTH_ACCESS_TOKEN_SIGNING_SECRET: z.string().min(32),
	OAUTH_ACCESS_TOKEN_ISSUER: z.url(),
	OAUTH_ACCESS_TOKEN_AUDIENCE: z.string().trim().min(1).max(255),

	// Must match the Vite base the OAuth App frontend was built with.
	OAUTH_APP_MOUNT_PATH: z.string().regex(/^(\/[A-Za-z0-9_-]+)+$/).default(
		'/auth',
	),
	OAUTH_APP_ASSETS_URL: z.url({ protocol: /^file$/ }).refine(
		(value) => new URL(value).pathname.endsWith('/'),
		'Use a file URL ending in a slash.',
	).optional(),

	OAUTH_SMTP_HOST: smtp.host.optional(),
	OAUTH_SMTP_PORT: smtp.port,
	OAUTH_SMTP_SECURE: smtp.secure,
	OAUTH_SMTP_REQUIRE_TLS: smtp.requireTls,
	OAUTH_SMTP_FROM: smtp.from.optional(),
	OAUTH_SMTP_USERNAME: smtp.username,
	OAUTH_SMTP_PASSWORD: smtp.password,
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

interface SmtpEnvironment {
	readonly OAUTH_SMTP_HOST?: string;
	readonly OAUTH_SMTP_PORT: number;
	readonly OAUTH_SMTP_SECURE: boolean;
	readonly OAUTH_SMTP_REQUIRE_TLS: boolean;
	readonly OAUTH_SMTP_FROM?: string;
	readonly OAUTH_SMTP_USERNAME?: string;
	readonly OAUTH_SMTP_PASSWORD?: string;
}

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
	};
}
