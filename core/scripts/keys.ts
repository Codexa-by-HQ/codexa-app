import { env } from '@codexa/core/config';
import type { Db } from '@codexa/core/providers/mongodb';
import { getOAuthSessionCollection } from '@codexa/oauth/models';
import { rewrapMfaSecrets } from '@codexa/oauth-mfa/lib';
import { createMfaSecretProtector } from '../config/oauthMfa.config.ts';
import { loadMongodb } from '../lib/database.ts';
import {
	generateAccessTokenKey,
	generateMfaKey,
	generateOidcKey,
	type MfaKey,
	readMfaRing,
	writeKeyFile,
} from '../lib/keys.ts';
import { getListenerHostname } from '../lib/listener.ts';
import {
	type KeysEnvironment,
	KeysEnvironmentSchema,
} from '../validations/environment.validation.ts';

const USAGE = `Usage:
  deno task keys:generate                 create every key that is missing, never replacing one
  deno task keys:rotate                   replace the access token and OIDC keys, signing everyone out
  deno task keys:rotate --only=access     replace one key: access, oidc or mfa

Stop the host first. Rotating the MFA key re-seals every stored authenticator
secret, so two step verification keeps working and nobody is signed out.`;

type TTarget = 'access' | 'oidc' | 'mfa';
const TARGETS: readonly TTarget[] = ['access', 'oidc', 'mfa'];

async function main(): Promise<void> {
	const [command, ...flags] = Deno.args;
	if (command !== 'generate' && command !== 'rotate') {
		console.info(USAGE);
		if (command !== '--help') Deno.exit(1);
		return;
	}
	const config = await env.loadEnv({
		paths: ['.env'],
		loadFiles: true,
		schema: KeysEnvironmentSchema,
	});
	await assertHostStopped(config);

	if (command === 'generate') return await generate(config);

	const only = flags.find((flag) => flag.startsWith('--only='))?.slice(
		'--only='.length,
	);
	if (only !== undefined && !TARGETS.includes(only as TTarget)) {
		throw new Error(`--only takes one of ${TARGETS.join(', ')}.`);
	}
	await rotate(config, only ? [only as TTarget] : ['access', 'oidc']);
}

/** Creates each missing key. An existing key is never touched. */
async function generate(config: KeysEnvironment): Promise<void> {
	if (!(await exists(config.OAUTH_ACCESS_TOKEN_KEY_FILE))) {
		await writeNew(
			config.OAUTH_ACCESS_TOKEN_KEY_FILE,
			generateAccessTokenKey(),
		);
		console.info(`Created ${config.OAUTH_ACCESS_TOKEN_KEY_FILE}.`);
	}
	if (!(await readMfaRing(config.OAUTH_MFA_KEYS_DIR))) {
		await writeNew(`${config.OAUTH_MFA_KEYS_DIR}/v1.key`, generateMfaKey());
		console.info(`Created ${config.OAUTH_MFA_KEYS_DIR}/v1.key.`);
	}
	if (!(await exists(config.OAUTH_OIDC_SIGNING_KEY_FILE))) {
		await writeNew(
			config.OAUTH_OIDC_SIGNING_KEY_FILE,
			JSON.stringify(await generateOidcKey()),
		);
		console.info(`Created ${config.OAUTH_OIDC_SIGNING_KEY_FILE}.`);
	}
	console.info('Every key is in place.');
}

async function rotate(
	config: KeysEnvironment,
	targets: readonly TTarget[],
): Promise<void> {
	const connection = loadMongodb(config);
	await connection.connect();
	try {
		const database = connection.getDb();
		if (targets.includes('access')) {
			await writeKeyFile(
				config.OAUTH_ACCESS_TOKEN_KEY_FILE,
				generateAccessTokenKey(),
			);
			console.info(`Replaced ${config.OAUTH_ACCESS_TOKEN_KEY_FILE}.`);
		}
		if (targets.includes('oidc')) {
			await writeKeyFile(
				config.OAUTH_OIDC_SIGNING_KEY_FILE,
				JSON.stringify(await generateOidcKey()),
			);
			console.info(`Replaced ${config.OAUTH_OIDC_SIGNING_KEY_FILE}.`);
		}
		if (targets.includes('access') || targets.includes('oidc')) {
			// Old access tokens already fail the new signature. Ending every
			// session makes every refresh token fail too, so everyone signs in again.
			const { modifiedCount } = await getOAuthSessionCollection(database)
				.updateMany(
					{ isActive: true },
					{ $set: { isActive: false, updatedAt: new Date() } },
				);
			console.info(
				`Ended ${modifiedCount} sessions. Every user must sign in again.`,
			);
		}
		if (targets.includes('mfa')) await rotateMfa(config, database);
		console.info('Restart the host to use the new keys.');
	} finally {
		await connection.disconnect();
	}
}

/**
 * Adds a newer MFA key, re-seals every stored secret with it, then deletes
 * the older keys, but only once no secret still needs them. Until then they
 * stay, so every secret is always readable, and running the command again
 * finishes the job.
 */
async function rotateMfa(config: KeysEnvironment, database: Db): Promise<void> {
	const old = await readMfaRing(config.OAUTH_MFA_KEYS_DIR);
	if (!old) {
		throw new Error(
			`No MFA key in ${config.OAUTH_MFA_KEYS_DIR}. Run deno task keys:generate first.`,
		);
	}
	const next: MfaKey = {
		id: `v${Number(old[0].id.slice(1)) + 1}`,
		key: generateMfaKey(),
	};
	await writeNew(`${config.OAUTH_MFA_KEYS_DIR}/${next.id}.key`, next.key);
	console.info(`Created ${config.OAUTH_MFA_KEYS_DIR}/${next.id}.key.`);

	const protector = await createMfaSecretProtector([next, ...old]);
	const result = await rewrapMfaSecrets(database, protector, next.id);
	console.info(
		`Re-sealed ${result.rewrapped} authenticator secrets with ${next.id}.`,
	);
	if (result.remaining > 0) {
		console.warn(
			`${result.remaining} secrets still use an older key (${result.failed} could not be opened). ` +
				'The older keys stay, so nothing is unreadable. Run the command again, or investigate those users.',
		);
		return;
	}
	for (const { id } of old) {
		await Deno.remove(`${config.OAUTH_MFA_KEYS_DIR}/${id}.key`);
	}
	console.info(
		`Deleted ${
			old.map(({ id }) => id).join(', ')
		}. Two step verification keeps working.`,
	);
}

/** Keys must not change under a running host, which would keep using the old ones. */
async function assertHostStopped(config: KeysEnvironment): Promise<void> {
	try {
		const listener = Deno.listen({
			hostname: getListenerHostname(config),
			port: config.SERVER_PORT,
		});
		listener.close();
	} catch (error) {
		if (error instanceof Deno.errors.AddrInUse) {
			throw new Error(
				`Something is listening on port ${config.SERVER_PORT}. Stop the host before changing keys.`,
			);
		}
		throw error;
	}
}

async function writeNew(file: string, content: string): Promise<void> {
	const folder = file.slice(0, Math.max(file.lastIndexOf('/'), 0));
	if (folder) await Deno.mkdir(folder, { recursive: true });
	await writeKeyFile(file, content);
}

async function exists(file: string): Promise<boolean> {
	try {
		await Deno.stat(file);
		return true;
	} catch (error) {
		if (error instanceof Deno.errors.NotFound) return false;
		throw error;
	}
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		// A plain message is enough for an operator, and it never includes a key.
		console.error(error instanceof Error ? error.message : String(error));
		Deno.exit(1);
	}
}
