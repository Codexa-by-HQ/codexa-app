import type { MongoDatabaseConnection } from '@codexa/core/config';
import type { OAuthBaseConfigInput } from '@codexa/oauth/config';
import type { EmailDeliveryProvider } from '@codexa/oauth/validations';
import type { OAuthBaseInstallConfig } from '@codexa/oauth';
import { getDatabaseRequirements } from '../lib/database.ts';
import type { HostDeployment } from '../lib/environment.ts';
import { HostAccessTokenProvider } from '../providers/accessToken.provider.ts';
import type { HostRuntimeOptions } from '../types/host.types.ts';
import type {
	HostEnvironment,
	TokenLifetimeEnvironment,
} from '../validations/environment.validation.ts';

/**
 * Credential lifetimes from the OAUTH_*_TTL variables. Normal startup and the
 * first run setup both build them here, so the two always agree.
 */
export function createTokenLifetimes(
	environment: TokenLifetimeEnvironment,
): OAuthBaseConfigInput['tokenLifetimes'] {
	return {
		accessTokenTtlMs: environment.OAUTH_ACCESS_TOKEN_TTL,
		sessionTtlMs: environment.OAUTH_SESSION_TTL,
		refreshTokenTtlMs: environment.OAUTH_REFRESH_TOKEN_TTL,
	};
}

/**
 * OAuth runtime policy from the environment. Defaults live in the environment
 * schema, and OAuth validates the result again when it installs.
 */
export function createOAuthConfig(
	environment: HostEnvironment,
): OAuthBaseConfigInput {
	return {
		authorization: {
			transactionTtlMs: environment.OAUTH_TRANSACTION_TTL,
			codeTtlMs: environment.OAUTH_AUTHORIZATION_CODE_TTL,
			csrfTtlMs: environment.OAUTH_CSRF_TTL,
		},
		security: {
			otpTtlMs: environment.OAUTH_OTP_TTL,
			rateLimitWindowMs: environment.OAUTH_RATE_LIMIT_WINDOW,
			passwordLoginMaxAttempts:
				environment.OAUTH_PASSWORD_LOGIN_MAX_ATTEMPTS,
		},
		tokenLifetimes: createTokenLifetimes(environment),
		permissions: {
			trustedCrossAppIssuerAppIds:
				environment.OAUTH_TRUSTED_CROSS_APP_ISSUER_APP_IDS,
		},
	};
}

export interface OAuthInstallContext {
	/** Must already be connected. */
	readonly connection: MongoDatabaseConnection;
	readonly deployment: HostDeployment;
	readonly emailProvider?: EmailDeliveryProvider;
	readonly options: HostRuntimeOptions;
}

/** Everything installOAuthBasePlugin needs, built from the host environment. */
export function createOAuthInstallConfig(
	{ connection, deployment, emailProvider, options }: OAuthInstallContext,
): OAuthBaseInstallConfig {
	const { environment } = deployment;
	return {
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
		config: createOAuthConfig(environment),
	};
}
