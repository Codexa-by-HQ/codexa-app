import { PRODUCT_CATALOG } from '../../config/app.config.ts';
import type { CodexaAppInstallConfig } from '../../plugin.ts';
import type { HostDeployment } from '../lib/environment.ts';

/**
 * Scopes Codexa App always requests, because its official screens are built
 * on them: the profile, the email address, and reading and managing the
 * workspace through OAuth's management API. The product's own scopes, from
 * PRODUCT_CATALOG in config/app.config.ts, are added and never remove these.
 */
export const CODEXA_APP_REQUIRED_SCOPES = Object.freeze([
	'profile',
	'email',
	'api:read',
	'api:write',
]);

/** Everything installCodexaAppPlugin needs, built from the host environment. */
export function createCodexaAppInstallConfig(
	{ environment }: HostDeployment,
): CodexaAppInstallConfig {
	return {
		requirements: {
			oauth: {
				clientId: environment.CODEXA_APP_OAUTH_CLIENT_ID,
				scopes: [
					...new Set([
						...CODEXA_APP_REQUIRED_SCOPES,
						...(PRODUCT_CATALOG.scopes ?? []).map(({ name }) =>
							name
						),
					]),
				],
			},
		},
	};
}
