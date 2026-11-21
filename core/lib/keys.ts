import {
	fromBase64Url,
	randomBytesRaw,
	toBase64Url,
} from '@codexa/core/crypto';
import type { HostEnvironment } from '../validations/environment.validation.ts';

/** The fields of an RSA private JWK that OIDC needs, checked before import. */
export interface RsaPrivateJwk extends JsonWebKey {
	readonly kid: string;
	readonly kty: 'RSA';
	readonly n: string;
	readonly e: 'AQAB';
	readonly d: string;
}

/** One AES-256-GCM key of the MFA ring, its raw bytes as base64url. */
export interface MfaKey {
	readonly id: string;
	readonly key: string;
}

/** Every generated key the host uses, read once at startup from `certs/`. */
export interface HostKeys {
	/** HS256 secret that signs and verifies access tokens. */
	readonly accessToken: string;
	/** Newest first: the first key seals new secrets, every key opens old ones. Null keeps oauth-mfa off. */
	readonly mfa: readonly MfaKey[] | null;
	/** Null keeps oauth-oidc off. */
	readonly oidc: RsaPrivateJwk | null;
}

type KeyPaths = Pick<
	HostEnvironment,
	| 'OAUTH_ACCESS_TOKEN_KEY_FILE'
	| 'OAUTH_MFA_KEYS_DIR'
	| 'OAUTH_OIDC_SIGNING_KEY_FILE'
>;

const MFA_FILE = /^(v[1-9]\d{0,8})\.key$/;
const BASE64URL = /^[A-Za-z0-9_-]+$/;

/**
 * Read every key the host needs. A missing access token key stops the host,
 * since nothing can sign in without it. A missing MFA directory or OIDC key
 * leaves that plugin off. Errors name the file and never its content.
 */
export async function loadHostKeys(paths: KeyPaths): Promise<HostKeys> {
	const accessToken = await readTextKey(paths.OAUTH_ACCESS_TOKEN_KEY_FILE);
	if (accessToken === null) {
		throw new Error(
			`No access token key at ${paths.OAUTH_ACCESS_TOKEN_KEY_FILE}. Run deno task keys:generate to create it.`,
		);
	}
	return Object.freeze({
		accessToken: parseAccessTokenKey(
			accessToken,
			paths.OAUTH_ACCESS_TOKEN_KEY_FILE,
		),
		mfa: await readMfaRing(paths.OAUTH_MFA_KEYS_DIR),
		oidc: await readOidcKey(paths.OAUTH_OIDC_SIGNING_KEY_FILE),
	});
}

/** The MFA ring in a directory of `v<n>.key` files, newest first, or null when there is none. */
export async function readMfaRing(dir: string): Promise<MfaKey[] | null> {
	const ids: number[] = [];
	try {
		for await (const entry of Deno.readDir(dir)) {
			const match = entry.isFile ? MFA_FILE.exec(entry.name) : null;
			if (match) ids.push(Number(match[1].slice(1)));
		}
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return null;
		throw error;
	}
	if (!ids.length) return null;
	ids.sort((a, b) => b - a);
	const ring: MfaKey[] = [];
	for (const n of ids) {
		const file = `${dir}/v${n}.key`;
		const key = (await Deno.readTextFile(file)).trim();
		if (!BASE64URL.test(key) || decodedLength(key) !== 32) {
			throw new Error(
				`${file} must hold one AES-256 key: 32 random bytes as base64url.`,
			);
		}
		ring.push({ id: `v${n}`, key });
	}
	return ring;
}

async function readOidcKey(file: string): Promise<RsaPrivateJwk | null> {
	const text = await readTextKey(file);
	return text === null ? null : parseOidcKey(text, file);
}

/** A file's trimmed text, or null when it does not exist. */
async function readTextKey(file: string): Promise<string | null> {
	try {
		return (await Deno.readTextFile(file)).trim();
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return null;
		throw error;
	}
}

function parseAccessTokenKey(value: string, file: string): string {
	if (value.length < 32 || /\s/.test(value)) {
		throw new Error(
			`${file} must hold one secret of at least 32 characters on one line.`,
		);
	}
	return value;
}

export function parseOidcKey(value: string, file: string): RsaPrivateJwk {
	let jwk: Partial<RsaPrivateJwk>;
	try {
		jwk = JSON.parse(value);
	} catch {
		throw new Error(`${file} must hold a JSON Web Key.`);
	}
	if (
		jwk.kty !== 'RSA' || !jwk.n || jwk.e !== 'AQAB' || !jwk.d ||
		typeof jwk.kid !== 'string' || !jwk.kid
	) {
		throw new Error(
			`${file} must hold an RSA private JWK with exponent AQAB and a kid.`,
		);
	}
	return jwk as RsaPrivateJwk;
}

/** The byte length of a base64url value, or -1 when it does not decode. */
function decodedLength(value: string): number {
	try {
		return fromBase64Url(value).length;
	} catch {
		return -1;
	}
}

/* Generating keys, for core/scripts/keys.ts */

/** A new HS256 access token secret: 64 random bytes as base64url. */
export function generateAccessTokenKey(): string {
	return toBase64Url(randomBytesRaw(64));
}

/** A new AES-256 MFA key: 32 random bytes as base64url. */
export function generateMfaKey(): string {
	return toBase64Url(randomBytesRaw(32));
}

/** A new 2048 bit RSA signing key for OIDC, as a private JWK with a dated kid. */
export async function generateOidcKey(): Promise<RsaPrivateJwk> {
	const pair = await crypto.subtle.generateKey(
		{
			name: 'RSASSA-PKCS1-v1_5',
			modulusLength: 2048,
			publicExponent: new Uint8Array([1, 0, 1]),
			hash: 'SHA-256',
		},
		true,
		['sign', 'verify'],
	);
	const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
	const kid = `oidc-${new Date().toISOString().slice(0, 10)}-${
		toBase64Url(randomBytesRaw(4))
	}`;
	const { alg: _alg, key_ops: _ops, ext: _ext, ...key } = jwk;
	return { ...key, kid } as RsaPrivateJwk;
}

/**
 * Write a key file so that it is complete or absent, never half written: the
 * new content goes to a temporary file beside it, which then replaces the old.
 * On systems that support it the file is readable by its owner only.
 */
export async function writeKeyFile(
	file: string,
	content: string,
): Promise<void> {
	const temporary = `${file}.${toBase64Url(randomBytesRaw(6))}.tmp`;
	await Deno.writeTextFile(
		temporary,
		content.endsWith('\n') ? content : content + '\n',
		{ mode: 0o600 },
	);
	await Deno.rename(temporary, file);
}
