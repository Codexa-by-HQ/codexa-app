import type { OAuthAppInstallConfig } from '@codexa/oauth-app';
import type { HostDeployment } from '../lib/environment.ts';
import type { HostRuntimeOptions } from '../types/host.types.ts';

/** Everything installOAuthAppPlugin needs, built from the host environment. */
export function createOAuthAppInstallConfig(
	deployment: HostDeployment,
	options: HostRuntimeOptions,
): OAuthAppInstallConfig {
	const { environment } = deployment;
	const assetsUrl = environment.OAUTH_APP_ASSETS_URL;
	return {
		requirements: {
			...options.oauthApp,
			// One mount path feeds both the UI route and the OAuth redirects.
			mountPath: environment.OAUTH_APP_MOUNT_PATH,
			assetsDirectory: options.oauthApp?.assetsDirectory ??
				(assetsUrl ? new URL(assetsUrl) : undefined),
			// Profile pictures upload from the page straight to the provider.
			connectOrigins: environment.OAUTH_STORAGE_PROVIDER === 'cloudinary'
				? ['https://api.cloudinary.com']
				: [],
		},
	};
}
