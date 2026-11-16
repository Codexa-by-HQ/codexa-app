import { zod as z } from '@codexa/core/providers/zod';

/**
 * Signing secret and deployment binding for the host access token provider.
 * The token claims themselves come from OAuth Base so the two never drift.
 */
export const HostAccessTokenProviderConfigSchema = z.object({
	secret: z.string().min(32),
	issuer: z.url(),
	audience: z.string().trim().min(1).max(255),
}).strict();

export type HostAccessTokenProviderConfig = z.infer<
	typeof HostAccessTokenProviderConfigSchema
>;
