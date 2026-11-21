import { env } from '@codexa/core/config';
import { CODEXA_APP_PATH } from '../../config/app.config.ts';
import { OAUTH_APP_PAGES } from '../config/pages.config.ts';
import {
	type HostEnvironment,
	type HostEnvironmentInput,
	HostEnvironmentSchema,
} from '../validations/environment.validation.ts';
import type { HostKeys } from './keys.ts';
import { getListenerOrigin } from './listener.ts';

/** Validated environment, the keys read from certs/, and the browser facing URLs derived from them. */
export interface HostDeployment {
	readonly environment: HostEnvironment;
	readonly keys: HostKeys;
	/** Public origin when configured, otherwise the local listener origin. */
	readonly origin: string;
	readonly hostedAppUrl: string;
	/** OAuth App's personal account area, where management handoffs land. */
	readonly managementAppUrl: string;
	readonly accountActionBaseUrl: string;
	/** The Codexa App product, where the signed in dashboard lives. */
	readonly productAppUrl: string;
}

/** Validate the given environment, or load it from .env and Deno.env. */
export async function loadEnvironment(
	input?: HostEnvironmentInput,
): Promise<HostEnvironment> {
	if (input) return HostEnvironmentSchema.parse(input);
	return await env.loadEnv({
		paths: ['.env'],
		loadFiles: true,
		schema: HostEnvironmentSchema,
	});
}

/**
 * Derive the URLs OAuth and its plugins send browsers to. Management handoffs
 * land in OAuth App's account area at /auth/account, which no OAuth API path
 * shadows, unlike anything under /auth/management.
 */
export function resolveHostDeployment(
	environment: HostEnvironment,
	keys: HostKeys,
): HostDeployment {
	const origin = environment.PUBLIC_ORIGIN ??
		getListenerOrigin(environment);
	const hostedAppUrl = origin + environment.OAUTH_APP_MOUNT_PATH;
	return Object.freeze({
		environment,
		keys,
		origin,
		hostedAppUrl,
		managementAppUrl: hostedAppUrl + '/' + OAUTH_APP_PAGES.account,
		accountActionBaseUrl: hostedAppUrl + '/',
		productAppUrl: origin + CODEXA_APP_PATH,
	});
}
