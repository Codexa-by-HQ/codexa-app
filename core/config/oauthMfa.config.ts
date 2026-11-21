import { fromBase64Url } from '@codexa/core/crypto';
import type { OAuthMfaInstallConfig } from '@codexa/oauth-mfa';
import { createAesGcmSecretProtector } from '@codexa/oauth-mfa/lib';
import type { HostDeployment } from '../lib/environment.ts';
import type { MfaKey } from '../lib/keys.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';

/**
 * MFA seals each authenticator secret with the host's AES-256-GCM key ring
 * from the v<n>.key files in OAUTH_MFA_KEYS_DIR. The newest key seals, every
 * key opens, and keys:rotate re-seals old secrets before an old key leaves.
 */
export async function createOAuthMfaInstallConfig(
	{ environment, keys }: HostDeployment,
): Promise<OptionalPluginConfig<OAuthMfaInstallConfig>> {
	if (!keys.mfa) {
		return {
			off: `add an MFA key to ${environment.OAUTH_MFA_KEYS_DIR} with deno task keys:generate`,
		};
	}
	return {
		config: {
			requirements: {
				secretProtector: await createMfaSecretProtector(keys.mfa),
			},
			config: { issuer: environment.OAUTH_MFA_ISSUER },
		},
	};
}

/**
 * The protector for a key ring, newest key first. Keys are imported
 * non-extractable, so their raw bytes never leave this function. keys:rotate
 * builds the same protector to re-seal stored secrets.
 */
export async function createMfaSecretProtector(ring: readonly MfaKey[]) {
	const keys = new Map<string, CryptoKey>();
	for (const { id, key } of ring) {
		keys.set(
			id,
			await crypto.subtle.importKey(
				'raw',
				new Uint8Array(fromBase64Url(key)),
				'AES-GCM',
				false,
				['encrypt', 'decrypt'],
			),
		);
	}
	return createAesGcmSecretProtector(ring[0].id, keys);
}
