import type { OAuthMagicLinkInstallConfig } from '@codexa/oauth-magic-link';
import type { EmailDeliveryProvider } from '@codexa/oauth/validations';
import type { HostDeployment } from '../lib/environment.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';
import { OAUTH_APP_PAGES } from './pages.config.ts';

/**
 * Magic links arrive by email and open OAuth App's confirmation page, which
 * posts the token only on an explicit click. Without email delivery there is
 * nothing to send them with.
 */
export function createOAuthMagicLinkInstallConfig(
	{ environment, hostedAppUrl }: HostDeployment,
	emailProvider: EmailDeliveryProvider | undefined,
): OptionalPluginConfig<OAuthMagicLinkInstallConfig> {
	if (!emailProvider) return { off: 'configure email with OAUTH_SMTP_HOST' };
	return {
		config: {
			requirements: {
				verificationUrl: `${hostedAppUrl}/${OAUTH_APP_PAGES.magicLink}`,
				ttlSeconds: environment.OAUTH_MAGIC_LINK_TTL / 1_000,
			},
		},
	};
}
