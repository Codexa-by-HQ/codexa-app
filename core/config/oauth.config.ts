import type { OAuthBaseConfigInput } from '@codexa/oauth/config';
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
