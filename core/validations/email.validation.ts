import { zod as z } from '@codexa/core/providers/zod';
import { envBoolean } from './shared.validation.ts';

const LOCAL_SMTP_HOSTS = ['localhost', '127.0.0.1', '::1', '[::1]'];

/** An address as `user@example.com` or `Display Name <user@example.com>`. */
export const EmailAddressSchema = z.string().trim().superRefine(
	(value, ctx) => {
		const match = value.match(/^(.+?)\s*<([^<>]+)>$/);
		const email = match ? match[2] : value;

		if (!z.email().safeParse(email).success) {
			ctx.addIssue({ code: 'custom', message: 'Invalid email address' });
		}
		if (match && !match[1].trim()) {
			ctx.addIssue({
				code: 'custom',
				message: 'Email display name cannot be empty',
			});
		}
	},
);

/** Host SMTP transport policy and credentials, kept outside every plugin. */
export const HostEmailConfigSchema = z.object({
	host: z.string().trim().min(1).max(253),
	port: z.coerce.number().int().min(1).max(65535).default(587),
	secure: envBoolean.default(false),
	requireTls: envBoolean.default(true),
	from: EmailAddressSchema,
	username: z.string().trim().min(1).optional(),
	password: z.string().min(1).optional(),
	connectionTimeoutMs: z.number().int().positive(),
	greetingTimeoutMs: z.number().int().positive(),
	socketTimeoutMs: z.number().int().positive(),
}).strict().superRefine((value, ctx) => {
	if (Boolean(value.username) !== Boolean(value.password)) {
		ctx.addIssue({
			code: 'custom',
			path: ['password'],
			message: 'Provide both SMTP username and password, or neither.',
		});
	}
	if (
		!value.secure && !value.requireTls &&
		!LOCAL_SMTP_HOSTS.includes(value.host)
	) {
		ctx.addIssue({
			code: 'custom',
			path: ['requireTls'],
			message: 'Remote SMTP connections require TLS.',
		});
	}
});

export type HostEmailConfigInput = z.input<typeof HostEmailConfigSchema>;
