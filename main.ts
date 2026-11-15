import { createApp, type ICodexaHttp } from '@codexa/http';
import { installOAuthBasePlugin } from '@codexa/oauth';
import { installOAuthAppPlugin } from '@codexa/oauth-app';
import { installCodexaAppPlugin } from './plugin.ts';

export interface HostRuntimeOptions {
	readonly configure?: (app: ICodexaHttp) => void | Promise<void>;
	readonly signal?: AbortSignal;
}

export async function host(options: HostRuntimeOptions = {}) {
	if (options.signal?.aborted) return;

	const app = registerAppHooks(createApp('codexa-app'));
	const failures: unknown[] = [];

	try {
		const installedApp = await installPlugins(app);

		if (!options.signal?.aborted) {
			await installedApp.boot(() => options.configure?.(installedApp));
		}

		if (!options.signal?.aborted) {
			const server = Deno.serve(
				{ hostname: '127.0.0.1', port: 8000, signal: options.signal },
				installedApp.dispatch,
			);
			await server.finished;
		}
	} catch (error) {
		failures.push(error);
	}

	try {
		await app.shutdown();
	} catch (error) {
		failures.push(error);
	}

	if (failures.length > 1) {
		throw new AggregateError(
			failures,
			'Codexa App host operation and cleanup failed.',
		);
	}
	if (failures.length === 1) throw failures[0];
}

function registerAppHooks(app: ICodexaHttp): ICodexaHttp {
	return app
		.onException((error) => {
			console.error('Codexa App request failed.', error);
			return Response.json(
				{
					error: 'server_error',
					error_description: 'The request could not be completed.',
				},
				{ status: 500, headers: { 'cache-control': 'no-store' } },
			);
		})
		.onNotFound(() =>
			Response.json(
				{
					error: 'not_found',
					error_description: 'The requested route was not found.',
				},
				{ status: 404, headers: { 'cache-control': 'no-store' } },
			)
		);
}

async function installPlugins(app: ICodexaHttp) {
	const withOAuthBase = await installOAuthBasePlugin(app);
	const withOAuthApp = await installOAuthAppPlugin(withOAuthBase);
	const withCodexaApp = await installCodexaAppPlugin(withOAuthApp);
	return withCodexaApp;
}

if (import.meta.main) await host();
