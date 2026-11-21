import type { OAuthOidcInstallConfig } from '@codexa/oauth-oidc';
import { createRsaOidcSigner } from '@codexa/oauth-oidc/lib';
import type { HostDeployment } from '../lib/environment.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';

/**
 * OIDC signs ID tokens as the public origin with the RS256 key in
 * OAUTH_OIDC_SIGNING_KEY_FILE. The published public key is derived from that same
 * key, so the two can never disagree. The private key is imported
 * non-extractable.
 */
export async function createOAuthOidcInstallConfig(
	{ environment, keys, origin, hostedAppUrl }: HostDeployment,
): Promise<OptionalPluginConfig<OAuthOidcInstallConfig>> {
	const jwk = keys.oidc;
	if (!jwk) {
		return {
			off: `add ${environment.OAUTH_OIDC_SIGNING_KEY_FILE} with deno task keys:generate`,
		};
	}
	const privateKey = await crypto.subtle.importKey(
		'jwk',
		{ ...jwk, alg: 'RS256' },
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	);
	return {
		config: {
			requirements: {
				issuer: origin,
				publicKeys: [{
					kty: 'RSA',
					alg: 'RS256',
					use: 'sig',
					kid: jwk.kid,
					n: jwk.n,
					e: jwk.e,
				}],
				sign: createRsaOidcSigner(privateKey, jwk.kid),
				idTokenTtlSeconds: environment.OAUTH_OIDC_ID_TOKEN_TTL / 1_000,
				// Its logout confirmation page is OAuth App's /auth/logout.
				hostedAppUrl,
			},
		},
	};
}
