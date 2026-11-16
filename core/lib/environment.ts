import { env } from '@codexa/core/config';
import { CODEXA_APP_PATH } from '../../config/app.config.ts';
import {
	type HostEnvironment,
	type HostEnvironmentInput,
	HostEnvironmentSchema,
} from '../validations/environment.validation.ts';
import { getListenerOrigin } from './listener.ts';

/** Validated environment plus the browser facing URLs derived from it. */
export interface HostDeployment {
	readonly environment: HostEnvironment;
	/** Public origin when configured, otherwise the local listener origin. */
	readonly origin: string;
	readonly hostedAppUrl: string;
	readonly managementAppUrl: string;
	readonly accountActionBaseUrl: string;
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
 * Derive the URLs OAuth Base sends browsers to. Management points at Codexa
 * App rather than OAuth App, because OAuth Base serves its management API under
 * /auth/management and versioned API routes shadow a UI on the same path.
 */
export function resolveHostDeployment(
	environment: HostEnvironment,
): HostDeployment {
	const origin = environment.OAUTH_PUBLIC_ORIGIN ??
		getListenerOrigin(environment);
	const hostedAppUrl = origin + environment.OAUTH_APP_MOUNT_PATH;
	return Object.freeze({
		environment,
		origin,
		hostedAppUrl,
		managementAppUrl: origin + CODEXA_APP_PATH,
		accountActionBaseUrl: hostedAppUrl + '/',
	});
}
