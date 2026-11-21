import type { OAuthPasskeyInstallConfig } from '@codexa/oauth-passkey';
import type { HostDeployment } from '../lib/environment.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';

/**
 * Passkeys belong to the browser facing origin, which is also the WebAuthn
 * relying party. WebAuthn rejects an IP address there, and allows plain HTTP
 * only on localhost, so an origin such as http://127.0.0.1:8000 leaves
 * passkeys off. Serve the host on localhost or an HTTPS domain to turn them on.
 */
export function createOAuthPasskeyInstallConfig(
	{ environment, origin }: HostDeployment,
): OptionalPluginConfig<OAuthPasskeyInstallConfig> {
	const { hostname, protocol } = new URL(origin);
	const isIpAddress = /^[\d.]+$/.test(hostname) || hostname.startsWith('[');
	if (isIpAddress) {
		return { off: `serve on localhost or a domain, not ${hostname}` };
	}
	if (protocol !== 'https:' && hostname !== 'localhost') {
		return { off: 'use HTTPS outside localhost' };
	}
	return {
		config: {
			requirements: {
				rpName: environment.OAUTH_PASSKEY_RP_NAME,
				rpId: hostname,
				origins: [origin],
			},
		},
	};
}
