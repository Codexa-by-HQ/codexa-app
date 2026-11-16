import { createApp, type ICodexaHttp } from '@codexa/http';
import { installOAuthBasePlugin } from '@codexa/oauth';
import { installOAuthAppPlugin } from '@codexa/oauth-app';
import { installCodexaAppPlugin } from './plugin.ts';
import {
	createOAuthInstallConfig,
	type OAuthInstallContext,
} from './core/config/oauth.config.ts';
import { createOAuthAppInstallConfig } from './core/config/oauthApp.config.ts';
import { loadMongodb } from './core/lib/database.ts';
import {
	loadEnvironment,
	resolveHostDeployment,
} from './core/lib/environment.ts';
import { getListenerHostname, getListenerOrigin } from './core/lib/listener.ts';
import { HostEmailProvider } from './core/providers/email.provider.ts';
import { registerHostHooks } from './core/registries/hooks.registry.ts';
import type { HostRuntimeOptions } from './core/types/host.types.ts';
import { smtpConfig } from './core/validations/environment.validation.ts';

/**
 * Run the Codexa App host. Load configuration, connect MongoDB, install OAuth,
 * OAuth App and Codexa App in that order, boot, then listen until stopped. The
 * host owns shutdown and reports the operation error together with any
 * cleanup error.
 */
export async function host(options: HostRuntimeOptions = {}): Promise<void> {
	if (options.signal?.aborted) return;
	const environment = await loadEnvironment(options.environment);
	if (options.signal?.aborted) return;

	const deployment = resolveHostDeployment(environment);
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
		}, installedApp.dispatch);
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

/** Install OAuth, then OAuth App, then Codexa App, in dependency order. */
async function installPlugins(app: ICodexaHttp, context: OAuthInstallContext) {
	const withOAuth = await installOAuthBasePlugin(
		app,
		createOAuthInstallConfig(context),
	);
	const withOAuthApp = await installOAuthAppPlugin(
		withOAuth,
		createOAuthAppInstallConfig(context.deployment, context.options),
	);
	// Codexa App is the product. Its frontend starts the OAuth flow itself.
	const { environment } = context.deployment;
	return await installCodexaAppPlugin(withOAuthApp, {
		requirements: {
			oauth: {
				clientId: environment.CODEXA_APP_OAUTH_CLIENT_ID,
				scopes: environment.CODEXA_APP_OAUTH_SCOPES,
			},
		},
	});
}
