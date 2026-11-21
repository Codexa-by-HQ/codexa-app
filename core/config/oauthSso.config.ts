import type { MongoDatabaseConnection } from '@codexa/core/config';
import { getOAuthCredentialCollection } from '@codexa/oauth/models';
import type { OAuthSsoInstallConfig } from '@codexa/oauth-sso';
import {
	facebookSsoProvider,
	githubSsoProvider,
	googleSsoProvider,
	type SsoPresetInput,
	type SsoProviderInput,
} from '@codexa/oauth-sso/config';
import type { HostDeployment } from '../lib/environment.ts';
import type { OptionalPluginConfig } from '../types/host.types.ts';
import {
	SSO_PROVIDER_KEYS,
	type TSsoProviderKey,
} from '../validations/environment.validation.ts';
import { OAUTH_APP_PAGES } from './pages.config.ts';

const PRESETS: Record<
	TSsoProviderKey,
	(input: SsoPresetInput) => SsoProviderInput
> = {
	GOOGLE: googleSsoProvider,
	GITHUB: githubSsoProvider,
	FACEBOOK: facebookSsoProvider,
};

/** The OAuth app that Codexa App's client signs in to, which the providers serve. */
async function codexaAppOAuthApp(
	connection: MongoDatabaseConnection,
	clientId: string,
): Promise<string | undefined> {
	const credential = await getOAuthCredentialCollection(connection.getDb())
		.findOne({ clientId }, { projection: { app: 1 } });
	return credential?.app.toHexString();
}

/**
 * SSO signs people in with every provider whose OAUTH_SSO_<NAME>_ values are
 * set, for the OAuth app Codexa App uses. Each comes from oauth-sso's preset,
 * so a provider needs only its ID and credentials. Its callback continues to
 * OAuth App's pages by their real names, and linking lands in the account area.
 */
export async function createOAuthSsoInstallConfig(
	{ environment, origin, hostedAppUrl, managementAppUrl }: HostDeployment,
	connection: MongoDatabaseConnection,
): Promise<OptionalPluginConfig<OAuthSsoInstallConfig>> {
	// A provider is on only when all three of its values are set.
	const configured = SSO_PROVIDER_KEYS.flatMap((key) => {
		const id = environment[`OAUTH_SSO_${key}_PROVIDER_ID`];
		const clientId = environment[`OAUTH_SSO_${key}_CLIENT_ID`];
		const clientSecret = environment[`OAUTH_SSO_${key}_CLIENT_SECRET`];
		return id && clientId && clientSecret
			? [{ key, id, clientId, clientSecret }]
			: [];
	});
	if (!configured.length) {
		return { off: 'set the OAUTH_SSO values of at least one provider' };
	}
	const codexaClientId = environment.CODEXA_APP_OAUTH_CLIENT_ID;
	if (!codexaClientId) return { off: 'set CODEXA_APP_OAUTH_CLIENT_ID' };
	const app = await codexaAppOAuthApp(connection, codexaClientId);
	if (!app) return { off: 'the Codexa App client does not exist, run setup' };

	return {
		config: {
			requirements: {
				callbackUrl: `${origin}/oauth/sso/callback`,
				hostedAppUrl,
				hostedAppPaths: {
					login: OAUTH_APP_PAGES.login,
					consent: OAUTH_APP_PAGES.consent,
					mfa: OAUTH_APP_PAGES.mfa,
				},
				managementAppUrl,
				providers: configured.map((
					{ key, id, clientId, clientSecret },
				) => PRESETS[key]({
					id,
					clientId,
					clientSecret,
					apps: [app],
					// Raise it whenever a provider's trust settings change.
					revision: 2,
					allowRegistration:
						environment[`OAUTH_SSO_${key}_ALLOW_REGISTRATION`],
					linkVerifiedEmail:
						environment[`OAUTH_SSO_${key}_LINK_VERIFIED_EMAIL`],
				})),
			},
		},
	};
}
