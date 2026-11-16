import type { MongoDatabaseConnection } from '@codexa/core/config';
import type { ICodexaHttp } from '@codexa/http';
import { installOAuthBasePlugin } from '@codexa/oauth';
import { installOAuthAppPlugin } from '@codexa/oauth-app';
import type { EmailDeliveryProvider } from '@codexa/oauth/validations';
import { oauthConfig } from '../config/oauth.config.ts';
import { getDatabaseRequirements } from '../lib/database.ts';
import type { HostDeployment } from '../lib/environment.ts';
import { installCodexaAppPlugin } from '../../plugin.ts';
import { HostAccessTokenProvider } from '../providers/accessToken.provider.ts';
import type { HostRuntimeOptions } from '../types/host.types.ts';

export interface PluginInstallContext {
	readonly connection: MongoDatabaseConnection;
	readonly deployment: HostDeployment;
	readonly emailProvider?: EmailDeliveryProvider;
	readonly options: HostRuntimeOptions;
}

/** Install OAuth Base, then OAuth App, then Codexa App, in dependency order. */
export async function installPlugins(
	app: ICodexaHttp,
	{ connection, deployment, emailProvider, options }: PluginInstallContext,
) {
	const { environment } = deployment;

	const withOAuth = await installOAuthBasePlugin(app, {
		requirements: {
			...getDatabaseRequirements(connection),
			redisUrl: environment.REDIS_URL,
			hostedAppUrl: deployment.hostedAppUrl,
			managementAppUrl: deployment.managementAppUrl,
			accountActionBaseUrl: deployment.accountActionBaseUrl,
			emailProvider,
			sessionLocationResolver: options.sessionLocationResolver,
			accessTokenProvider: new HostAccessTokenProvider({
				secret: environment.OAUTH_ACCESS_TOKEN_SIGNING_SECRET,
				issuer: environment.OAUTH_ACCESS_TOKEN_ISSUER,
				audience: environment.OAUTH_ACCESS_TOKEN_AUDIENCE,
			}),
		},
		config: oauthConfig,
	});

	const assetsUrl = environment.OAUTH_APP_ASSETS_URL;
	const withOAuthApp = await installOAuthAppPlugin(withOAuth, {
		requirements: {
			...options.oauthApp,
			// One mount path feeds both the UI route and the OAuth Base redirects.
			mountPath: environment.OAUTH_APP_MOUNT_PATH,
			assetsDirectory: options.oauthApp?.assetsDirectory ??
				(assetsUrl ? new URL(assetsUrl) : undefined),
		},
	});

	return await installCodexaAppPlugin(withOAuthApp);
}
