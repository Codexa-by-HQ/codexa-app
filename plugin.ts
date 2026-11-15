import { definePlugin, type ICodexaHttp } from '@codexa/http';
import { serveStaticApp } from './routes/index.ts';
import {
	type CodexaAppConfigInput,
	CodexaAppConfigSchema,
} from './config/app.config.ts';
import type {} from './types/base.d.ts';

export type {
	CodexaAppConfigInput,
	CodexaAppReadyEvent,
} from './config/app.config.ts';

export interface CodexaAppInstallConfig {
	readonly requirements: CodexaAppConfigInput;
}

const pending = new WeakSet<ICodexaHttp>();

export async function installCodexaAppPlugin(
	app: ICodexaHttp,
	input: CodexaAppInstallConfig = { requirements: {} },
) {
	const phase = app.getPhase();
	if (phase !== 'idle' && phase !== 'booting') {
		throw new Error('Install Codexa App before the host finishes booting.');
	}
	if (app.hasPlugin('codexa-app') || pending.has(app)) {
		throw new Error(
			'Codexa App is already installed or installing on this host.',
		);
	}
	if (!app.hasPlugin('oauth') || !app.hasPlugin('oauth-app')) {
		throw new Error('Install OAuth Base and OAuth App before Codexa App.');
	}

	const requirements = CodexaAppConfigSchema.parse(input.requirements);
	const { assetsDirectory, mountPath, onReady } = requirements;

	let registered = false;
	pending.add(app);
	try {
		const plugin = definePlugin({
			name: 'codexa-app',
			dependsOn: ['oauth', 'oauth-app'] as const,
			metadata: {
				license: 'MIT',
				description: 'Codexa plugin for the product dashboard.',
				tags: ['codexa-app'],
			},
			setup(scope, config) {
				// extract requirements
				const { assetsDirectory, mountPath, onShutdown } =
					config.requirements;

				// mount the router and serve app
				scope.mount(serveStaticApp(assetsDirectory, mountPath));

				// calling shutdown hook
				if (onShutdown) scope.onShutdown(onShutdown);
			},
		});

		const installed = app.install(plugin, { requirements });
		registered = true;

		// calling ready hook
		await onReady?.({ mountPath, assetsDirectory });

		return installed;
	} catch (failure) {
		throw new AggregateError(
			[failure],
			registered
				? 'Codexa App was installed, but its onReady callback failed.'
				: 'Codexa App installation failed.',
		);
	} finally {
		pending.delete(app);
	}
}
