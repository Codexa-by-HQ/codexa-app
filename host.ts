import { createApp, type ICodexaHttp } from '@codexa/http';
import { installOAuthBasePlugin } from '@codexa/oauth';
import { installOAuthAppPlugin } from '@codexa/oauth-app';
import { installOAuthDevicePlugin } from '@codexa/oauth-device';
import { installOAuthMagicLinkPlugin } from '@codexa/oauth-magic-link';
import { installOAuthMfaPlugin } from '@codexa/oauth-mfa';
import { installOAuthOidcPlugin } from '@codexa/oauth-oidc';
import { installOAuthPasskeyPlugin } from '@codexa/oauth-passkey';
import { installOAuthSsoPlugin } from '@codexa/oauth-sso';
import { createLogger } from '@codexa/core/logger';
import { installCodexaAppPlugin } from './plugin.ts';
import {
	createOAuthInstallConfig,
	type OAuthInstallContext,
} from './core/config/oauth.config.ts';
import { createCodexaAppInstallConfig } from './core/config/codexaApp.config.ts';
import { createOAuthAppInstallConfig } from './core/config/oauthApp.config.ts';
import { createOAuthDeviceInstallConfig } from './core/config/oauthDevice.config.ts';
import { createOAuthMagicLinkInstallConfig } from './core/config/oauthMagicLink.config.ts';
import { createOAuthMfaInstallConfig } from './core/config/oauthMfa.config.ts';
import { createOAuthOidcInstallConfig } from './core/config/oauthOidc.config.ts';
import { createOAuthPasskeyInstallConfig } from './core/config/oauthPasskey.config.ts';
import { createOAuthSsoInstallConfig } from './core/config/oauthSso.config.ts';
import { loadMongodb } from './core/lib/database.ts';
import {
	loadEnvironment,
	resolveHostDeployment,
} from './core/lib/environment.ts';
import { loadHostKeys } from './core/lib/keys.ts';
import { getListenerHostname, getListenerOrigin } from './core/lib/listener.ts';
import { rememberClientAddress } from './core/lib/clientAddress.ts';
import { HostEmailProvider } from './core/providers/email.provider.ts';
import { registerHostHooks } from './core/registries/hooks.registry.ts';
import type {
	HostRuntimeOptions,
	OptionalPluginConfig,
} from './core/types/host.types.ts';
import { smtpConfig } from './core/validations/environment.validation.ts';

const logger = createLogger('CodexaApp:Host');

/**
 * Run the Codexa App host. Load configuration, connect MongoDB, install OAuth,
 * its optional sign in plugins, OAuth App and Codexa App in that order, boot,
 * then listen until stopped. The host owns shutdown and reports the operation
 * error together with any cleanup error.
 */
export async function host(options: HostRuntimeOptions = {}): Promise<void> {
	if (options.signal?.aborted) return;
	const environment = await loadEnvironment(options.environment);
	if (options.signal?.aborted) return;

	const deployment = resolveHostDeployment(
		environment,
		await loadHostKeys(environment),
	);
	const connection = loadMongodb(environment);
	const app = registerHostHooks(createApp('codexa-app'));

	const controller = new AbortController();
	const stop = () => controller.abort();
	options.signal?.addEventListener('abort', stop, { once: true });
	if (options.signal?.aborted) stop();

	let server: Deno.HttpServer | undefined;
	let serverAwaited = false;
	let signalInstalled = false;
	let ownedEmailProvider: HostEmailProvider | undefined;

	async function run(): Promise<void> {
		Deno.addSignalListener('SIGINT', stop);
		signalInstalled = true;

		const smtp = options.emailProvider
			? undefined
			: smtpConfig(environment);
		if (smtp) ownedEmailProvider = new HostEmailProvider(smtp);

		if (controller.signal.aborted) return;
		await connection.connect();
		if (controller.signal.aborted) return;

		const installedApp = await installPlugins(app, {
			connection,
			deployment,
			emailProvider: options.emailProvider ?? ownedEmailProvider,
			options,
		});
		if (controller.signal.aborted) return;

		await installedApp.boot(() => options.configure?.(installedApp));
		if (controller.signal.aborted) return;

		server = Deno.serve({
			hostname: getListenerHostname(environment),
			port: environment.SERVER_PORT,
			signal: controller.signal,
		}, (request, info) => {
			rememberClientAddress(request, info);
			return installedApp.dispatch(request);
		});
		options.onListening?.(getListenerOrigin(environment));

		serverAwaited = true;
		await server.finished;
	}

	let failed = false;
	let failure: unknown;
	try {
		await run();
	} catch (error) {
		controller.abort();
		failed = true;
		failure = error;
	}

	options.signal?.removeEventListener('abort', stop);
	const cleanupFailures: unknown[] = [];
	const cleanups = [
		() => {
			if (signalInstalled) Deno.removeSignalListener('SIGINT', stop);
		},
		// Drain in flight requests when the run failed before awaiting the server.
		() => serverAwaited ? undefined : server?.finished,
		() => app.shutdown(),
		() => ownedEmailProvider?.close(),
		() => connection.disconnect(),
	];
	for (const cleanup of cleanups) {
		try {
			await cleanup();
		} catch (error) {
			cleanupFailures.push(error);
		}
	}

	if (cleanupFailures.length) {
		throw new AggregateError(
			failed ? [failure, ...cleanupFailures] : cleanupFailures,
			'Codexa App host operation or cleanup failed.',
		);
	}
	if (failed) throw failure;
}

/**
 * Install OAuth, its optional sign in plugins, OAuth App, then Codexa App, in
 * dependency order. Each optional plugin depends only on OAuth, and installs
 * when core has what it needs, or logs why it is off.
 */
async function installPlugins(app: ICodexaHttp, context: OAuthInstallContext) {
	const withOAuth = await installOAuthBasePlugin(
		app,
		createOAuthInstallConfig(context),
	);
	const { deployment, connection, emailProvider } = context;

	await installOptional(
		'oauth-mfa',
		await createOAuthMfaInstallConfig(deployment),
		(config) => installOAuthMfaPlugin(withOAuth, config),
	);
	await installOptional(
		'oauth-passkey',
		createOAuthPasskeyInstallConfig(deployment),
		(config) => installOAuthPasskeyPlugin(withOAuth, config),
	);
	await installOptional(
		'oauth-magic-link',
		createOAuthMagicLinkInstallConfig(deployment, emailProvider),
		(config) => installOAuthMagicLinkPlugin(withOAuth, config),
	);
	await installOptional(
		'oauth-sso',
		await createOAuthSsoInstallConfig(deployment, connection),
		(config) => installOAuthSsoPlugin(withOAuth, config),
	);
	await installOptional(
		'oauth-oidc',
		await createOAuthOidcInstallConfig(deployment),
		(config) => installOAuthOidcPlugin(withOAuth, config),
	);
	installOAuthDevicePlugin(
		withOAuth,
		createOAuthDeviceInstallConfig(deployment),
	);

	const withOAuthApp = await installOAuthAppPlugin(
		withOAuth,
		createOAuthAppInstallConfig(context.deployment, context.options),
	);
	// Codexa App is the product. Its frontend starts the OAuth flow itself.
	return await installCodexaAppPlugin(
		withOAuthApp,
		createCodexaAppInstallConfig(context.deployment),
	);
}

/** Install an optional plugin, or log why the host leaves it off. */
async function installOptional<T>(
	id: string,
	plugin: OptionalPluginConfig<T>,
	install: (config: T) => unknown,
): Promise<void> {
	if ('off' in plugin) {
		logger.info(`${id} is off: ${plugin.off}.`);
		return;
	}
	await install(plugin.config);
}
