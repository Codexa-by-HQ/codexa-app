import { fromBase64Url, toBase64Url } from '@codexa/core/crypto';
import {
	type AccessTokenClaims,
	AccessTokenClaimsSchema,
	type AccessTokenProvider,
	type AccessTokenSignInput,
	AccessTokenSignInputSchema,
} from '@codexa/oauth/validations';
import {
	type HostAccessTokenProviderConfig,
	HostAccessTokenProviderConfigSchema,
} from '../validations/accessToken.validation.ts';

const ALGORITHM = 'HS256';
const TOKEN_TYPE = 'JWT';
const MAXIMUM_TOKEN_LENGTH = 8_192;
const CLOCK_SKEW_SECONDS = 60; // 1 min
const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Host owned HS256 signer for OAuth Base access tokens. The algorithm, issuer
 * and audience are fixed by the host, and every verified token must match them.
 */
export class HostAccessTokenProvider implements AccessTokenProvider {
	readonly #config: HostAccessTokenProviderConfig;
	readonly #key: Promise<CryptoKey>;

	constructor(config: HostAccessTokenProviderConfig) {
		this.#config = HostAccessTokenProviderConfigSchema.parse(config);
		// Non extractable key that can only sign and verify with HMAC SHA-256.
		this.#key = crypto.subtle.importKey(
			'raw',
			encoder.encode(this.#config.secret),
			{ name: 'HMAC', hash: 'SHA-256' },
			false,
			['sign', 'verify'],
		);
	}

	async sign(input: AccessTokenSignInput): Promise<string> {
		const claims = AccessTokenClaimsSchema.parse({
			...AccessTokenSignInputSchema.parse(input),
			iss: this.#config.issuer,
			aud: this.#config.audience,
		});
		const header = encodeSegment({ alg: ALGORITHM, typ: TOKEN_TYPE });
		const signingInput = `${header}.${encodeSegment(claims)}`;
		const signature = await crypto.subtle.sign(
			'HMAC',
			await this.#key,
			encoder.encode(signingInput),
		);
		return `${signingInput}.${toBase64Url(new Uint8Array(signature))}`;
	}

	async verify(token: string): Promise<AccessTokenClaims> {
		if (token.length > MAXIMUM_TOKEN_LENGTH) {
			throw new Error('Access token exceeds the supported length.');
		}
		const parts = token.split('.');
		if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
			throw new Error('Access token is malformed.');
		}
		const [encodedHeader, encodedPayload, encodedSignature] = parts;

		// Accept only the algorithm this provider signs with.
		const header = decodeSegment(encodedHeader);
		if (header.alg !== ALGORITHM || header.typ !== TOKEN_TYPE) {
			throw new Error('Access token algorithm or type is invalid.');
		}

		// Check the signature before trusting any claim.
		const valid = await crypto.subtle.verify(
			'HMAC',
			await this.#key,
			decodeBytes(encodedSignature),
			encoder.encode(`${encodedHeader}.${encodedPayload}`),
		);
		if (!valid) throw new Error('Access token signature is invalid.');

		const claims = AccessTokenClaimsSchema.parse(
			decodeSegment(encodedPayload),
		);
		const now = Math.floor(Date.now() / 1_000);
		if (
			claims.iss !== this.#config.issuer ||
			claims.aud !== this.#config.audience ||
			claims.iat > now + CLOCK_SKEW_SECONDS ||
			claims.exp <= now
		) {
			throw new Error(
				'Access token is expired or not valid for this host.',
			);
		}
		return Object.freeze(claims);
	}
}

function encodeSegment(value: unknown): string {
	return toBase64Url(encoder.encode(JSON.stringify(value)));
}

/** Decode base64url, reporting any failure as a malformed token. */
function decodeBytes(segment: string): Uint8Array<ArrayBuffer> {
	try {
		return Uint8Array.from(fromBase64Url(segment));
	} catch {
		throw new Error('Access token is malformed.');
	}
}

/** Decode one JSON object segment, rejecting anything that is not an object. */
function decodeSegment(segment: string): Record<string, unknown> {
	let value: unknown;
	try {
		value = JSON.parse(decoder.decode(decodeBytes(segment)));
	} catch {
		throw new Error('Access token is malformed.');
	}
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Access token is malformed.');
	}
	return value as Record<string, unknown>;
}
