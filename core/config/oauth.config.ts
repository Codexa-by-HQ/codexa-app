import type { OAuthBaseConfigInput } from '@codexa/oauth/config';

/** Credential lifetimes shared by normal startup and the first run setup. */
export const tokenLifetimes = {
	accessTokenTtlMs: 15 * 60 * 1_000, // 15 min
	sessionTtlMs: 24 * 60 * 60 * 1_000, // 1 day
	refreshTokenTtlMs: 30 * 24 * 60 * 60 * 1_000, // 30 days
} satisfies OAuthBaseConfigInput['tokenLifetimes'];

/** OAuth Base runtime policy installed by this host. */
export const oauthConfig = {
	authorization: {
		transactionTtlMs: 5 * 60 * 1_000, // 5 min
		codeTtlMs: 60 * 1_000, // 1 min
		csrfTtlMs: 5 * 60 * 1_000, // 5 min
	},
	security: {
		otpTtlMs: 5 * 60 * 1_000, // 5 min
		rateLimitWindowMs: 5 * 60 * 1_000, // 5 min
		passwordLoginMaxAttempts: 5,
	},
	tokenLifetimes,
	permissions: { trustedCrossAppIssuerAppIds: [] },
} satisfies OAuthBaseConfigInput;
