import { env } from '@codexa/core/config';
import { createOAuthBaseScripts } from '@codexa/oauth/scripts';
import { createTokenLifetimes } from '../config/oauth.config.ts';
import { loadMongodb } from '../lib/database.ts';
import { getListenerHostname, getListenerOrigin } from '../lib/listener.ts';
import { SetupEnvironmentSchema } from '../validations/environment.validation.ts';

/**
 * Run the OAuth Base first run wizard on the host address and database. The
 * normal host must be stopped, because the wizard binds the same port.
 */
async function setup(): Promise<void> {
	if (Deno.args.includes('--help')) {
		console.info('Usage: deno task setup');
		console.info(
			'Run while the host is stopped. Setup uses the same address and database.',
		);
		return;
	}
	if (Deno.args.length) {
		throw new Error('Run deno task setup without arguments.');
	}

	const config = await env.loadEnv({
		paths: ['.env'],
		loadFiles: true,
		schema: SetupEnvironmentSchema,
	});
	if (config.PUBLIC_ORIGIN) {
		throw new Error(
			'The setup listener serves plain HTTP. Run setup locally before configuring the public HTTPS origin.',
		);
	}

	const scripts = createOAuthBaseScripts({
		connection: loadMongodb(config),
		config: { tokenLifetimes: createTokenLifetimes(config) },
	});
	await scripts.setup({
		hostname: getListenerHostname(config),
		port: config.SERVER_PORT,
		origin: getListenerOrigin(config),
	});
}

if (import.meta.main) await setup();
