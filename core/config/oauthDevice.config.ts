import type { OAuthDeviceInstallConfig } from '@codexa/oauth-device';
import type { HostDeployment } from '../lib/environment.ts';
import { CODEXA_APP_PAGES } from './pages.config.ts';

/**
 * Devices send people to Codexa App's device page, because approving a code
 * needs the signed in user's token, which OAuth App never holds.
 */
export function createOAuthDeviceInstallConfig(
	{ environment, productAppUrl }: HostDeployment,
): OAuthDeviceInstallConfig {
	return {
		requirements: {
			verificationUri: `${productAppUrl}/${CODEXA_APP_PAGES.device}`,
			deviceCodeTtlMs: environment.OAUTH_DEVICE_CODE_TTL,
			pollingIntervalMs: environment.OAUTH_DEVICE_POLLING_INTERVAL,
		},
	};
}
