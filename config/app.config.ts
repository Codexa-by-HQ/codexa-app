import type { Hook } from '@codexa/http';
import { zod as z } from '@codexa/core/providers/zod';
import type { OAuthCatalogEntry } from '@codexa/oauth/types';

const dist = new URL('../apps/dashboard/dist/', import.meta.url);
export const CODEXA_APP_PATH = '/app';
export const CODEXA_APP_HEADERS = {
	'cache-control': 'no-store',
	'referrer-policy': 'no-referrer',
	'x-content-type-options': 'nosniff',
	'content-security-policy':
		"default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'; img-src 'self' data: https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
} as const;

/**
 * Your product's own entries in OAuth's catalog: the scopes its clients may ask
 * for and the permissions its policies may grant. Codexa App registers them at
 * startup, its dashboard asks for these scopes when signing in, and Settings
 * offers them in the policy editor and the credential forms. Guard your own
 * routes with the same names. Each permission sits in one of your namespaces,
 * such as `invoices` for `invoices:read`, and no namespace may be one OAuth or
 * a plugin owns.
 *
 * Example:
 *   namespaces: ['invoices'],
 *   scopes: [{ name: 'invoices', description: 'Use invoices' }],
 *   permissions: [{ name: 'invoices:read', description: 'See invoices' }],
 */
export const PRODUCT_CATALOG: OAuthCatalogEntry = {
	plugin: 'codexa-app',
	namespaces: [],
	scopes: [],
	permissions: [],
};

/** The OAuth client the Codexa App frontend signs in with. */
export const CodexaAppOAuthSchema = z.object({
	// Unset until setup creates a client, which keeps sign in off.
	clientId: z.string().trim().min(1).optional(),
	scopes: z.array(z.string().trim().min(1)).min(1).default([
		'profile',
		'email',
	]),
}).strict();

export interface CodexaAppReadyEvent {
	readonly mountPath: string;
	readonly assetsDirectory: URL;
}

export const CodexaAppConfigSchema = z.object({
	// Build with the same Vite base when overriding the default mount path.
	mountPath: z.string().regex(/^(\/[A-Za-z0-9_-]+)+$/).default(
		CODEXA_APP_PATH,
	),
	assetsDirectory: z.instanceof(URL).refine(
		(url) => url.protocol === 'file:' && !url.search && !url.hash,
		'Assets must use a local file URL without a query or fragment.',
	).default(dist),
	oauth: CodexaAppOAuthSchema.default({ scopes: ['profile', 'email'] }),

	// Runs after route registration. The host controls when it starts listening.
	onReady: z.custom<
		(event: CodexaAppReadyEvent) => void | Promise<void>
	>((value) => typeof value === 'function').optional(),
	onShutdown: z.custom<Hook>((value) => typeof value === 'function')
		.optional(),
}).strict();

export type CodexaAppConfigInput = z.input<typeof CodexaAppConfigSchema>;
export type CodexaAppConfig = z.infer<typeof CodexaAppConfigSchema>;
