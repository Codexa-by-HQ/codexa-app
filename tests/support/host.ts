import { parse } from '@codexa/core/providers/dotenv';
import { host } from '../../host.ts';
import { type HostKeys, loadHostKeys } from '../../core/lib/keys.ts';
import {
	type HostEnvironmentInput,
	KeyFilesEnvironmentSchema,
} from '../../core/validations/environment.validation.ts';

/** The .env file, including the Tests section the host itself ignores. */
export const dotenv = parse(await Deno.readTextFile('.env').catch(() => ''));

let keys: Promise<HostKeys> | undefined;

/** The host's keys from certs/, read the way the host reads them, so a test can skip a plugin that is off. */
export function hostKeys(): Promise<HostKeys> {
	keys ??= loadHostKeys(KeyFilesEnvironmentSchema.parse(dotenv));
	return keys;
}

/**
 * Boot the real host, run the checks against its origin, then stop it.
 * Failures inside the checks are rethrown after shutdown. The port defaults to
 * OAUTH_TEST_PORT, so tests can run beside the dev host. `timeoutMs` stops a
 * hung run, and long browser journeys raise it.
 */
export async function withHost(
	checks: (origin: string) => Promise<void>,
	port: string = dotenv.OAUTH_TEST_PORT ?? '8199',
	timeoutMs = 120_000,
): Promise<void> {
	const controller = new AbortController();
	const guard = setTimeout(() => controller.abort(), timeoutMs);
	const failures: unknown[] = [];

	await host({
		// host() validates the full environment against its schema at runtime.
		environment: {
			...dotenv,
			SERVER_PORT: port,
		} as HostEnvironmentInput,
		signal: controller.signal,
		onListening: async (origin) => {
			try {
				await checks(origin);
			} catch (error) {
				failures.push(error);
			} finally {
				controller.abort();
			}
		},
	});
	clearTimeout(guard);
	if (failures.length) throw failures[0];
}
