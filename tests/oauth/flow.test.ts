import { assert, assertEquals, assertNotEquals } from '@std/assert';
import { parse } from '@codexa/core/providers/dotenv';
import { ObjectId } from '@codexa/core/providers/mongodb';
import {
	getAccountCollection,
	getCollaboratorCollection,
} from '@codexa/oauth/models';
import { host } from '../../host.ts';
import { loadMongodb } from '../../core/lib/database.ts';
import type { HostEnvironmentInput } from '../../core/validations/environment.validation.ts';

/**
 * End to end OAuth flow against the real host, MongoDB and Redis from .env.
 * Needs a completed setup and a public client in OAUTH_TEST_CLIENT_ID. Each run
 * registers one throwaway user named flowtest_ followed by random characters.
 */

const dotenv = parse(await Deno.readTextFile('.env').catch(() => ''));
const CLIENT_ID = dotenv.OAUTH_TEST_CLIENT_ID;
const REDIRECT_URI = dotenv.OAUTH_TEST_REDIRECT_URI ??
	'http://localhost:8000/app/callback';
// A separate port, so the test can run while the dev host is up.
const PORT = dotenv.OAUTH_TEST_PORT ?? '8199';

const VERSIONED = { 'X-Auth-Version': '1.0.0', 'x-oauth-interaction': 'json' };

interface Json {
	// deno-lint-ignore no-explicit-any
	[key: string]: any;
}

function base64Url(bytes: ArrayBuffer | Uint8Array): string {
	return btoa(String.fromCharCode(...new Uint8Array(bytes)))
		.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function pkce() {
	const verifier = base64Url(crypto.getRandomValues(new Uint8Array(32)));
	const digest = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(verifier),
	);
	return { verifier, challenge: base64Url(digest) };
}

async function readJson(response: Response) {
	return { status: response.status, body: await response.json() as Json };
}

function client(base: string) {
	return {
		authorize: (challenge: string, state: string, scope = 'profile email') =>
			fetch(
				`${base}/oauth/authorize?${new URLSearchParams({
					response_type: 'code',
					client_id: CLIENT_ID,
					redirect_uri: REDIRECT_URI,
					scope,
					state,
					code_challenge: challenge,
					code_challenge_method: 'S256',
				})}`,
				{ headers: { accept: 'application/json' } },
			).then(readJson),
		post: (path: string, body: unknown) =>
			fetch(base + path, {
				method: 'POST',
				headers: { ...VERSIONED, 'content-type': 'application/json' },
				body: JSON.stringify(body),
			}).then(readJson),
		consent: (authTxnId: string) =>
			fetch(
				`${base}/auth/consent?authTxnId=${
					encodeURIComponent(authTxnId)
				}`,
				{ headers: VERSIONED },
			).then(readJson),
		token: (form: Record<string, string>) =>
			fetch(`${base}/oauth/token`, {
				method: 'POST',
				headers: {
					'content-type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams(form),
			}).then(readJson),
		/** A versioned management call as the signed in user. */
		management: (
			method: 'GET' | 'POST' | 'PATCH',
			path: string,
			tokens: Json,
			input: Record<string, unknown> = {},
		) =>
			fetch(
				base + path +
					(method === 'GET'
						? `?${new URLSearchParams(input as Record<string, string>)}`
						: ''),
				{
					method,
					headers: {
						...VERSIONED,
						authorization: `Bearer ${tokens.access_token}`,
						'x-account-id': tokens.account_id,
						...(method === 'GET'
							? {}
							: { 'content-type': 'application/json' }),
					},
					body: method === 'GET' ? undefined : JSON.stringify(input),
				},
			).then(readJson),
		session: async (accessToken: string, accountId: string) => {
			const response = await fetch(`${base}/auth/management/session`, {
				headers: {
					...VERSIONED,
					authorization: `Bearer ${accessToken}`,
					'x-account-id': accountId,
				},
			});
			await response.body?.cancel();
			return response.status;
		},
	};
}

Deno.test({
	name: 'OAuth authorization code flow end to end',
	ignore: !CLIENT_ID,
	sanitizeOps: false,
	sanitizeResources: false,
	async fn(t) {
		const controller = new AbortController();
		const guard = setTimeout(() => controller.abort(), 120_000);
		const failures: unknown[] = [];

		const running = host({
			// host() validates the full environment against its schema at runtime.
			environment: {
				...dotenv,
				SERVER_PORT: PORT,
			} as HostEnvironmentInput,
			signal: controller.signal,
			onListening: async (origin) => {
				try {
					await run(t, client(origin));
				} catch (error) {
					failures.push(error);
				} finally {
					controller.abort();
				}
			},
		});
		await running;
		clearTimeout(guard);
		if (failures.length) throw failures[0];
	},
});

async function run(t: Deno.TestContext, api: ReturnType<typeof client>) {
	const username = 'flowtest_' + crypto.randomUUID().slice(0, 8);
	const password = 'FlowTest' + crypto.randomUUID().slice(0, 6) + '9';
	const first = await pkce();
	let code = '';
	let tokens: Json = {};
	let rotated: Json = {};

	await t.step('authorize, register, consent', async () => {
		const authorize = await api.authorize(first.challenge, 'state-one');
		assertEquals(authorize.status, 200);
		const { authTxnId } = authorize.body;

		const register = await api.post('/auth/register', {
			authTxnId,
			username,
			password,
			confirmPassword: password,
		});
		assertEquals(register.status, 201);
		assertEquals(register.body.next, 'consent');

		const consent = await api.consent(authTxnId);
		assertEquals(consent.body.next, 'consent');
		const approve = await api.post('/auth/consent/approve', {
			authTxnId,
			approvedScopes: consent.body.requestedScopes,
		});
		assertEquals(approve.body.next, 'redirect');
		const callback = new URL(approve.body.redirectUri);
		assertEquals(callback.searchParams.get('state'), 'state-one');
		code = callback.searchParams.get('code') ?? '';
		assert(code, 'the redirect carries a code');
	});

	await t.step('code exchange, single use', async () => {
		// OAuth wire names, fixed by the protocol.
		const form = {
			'grant_type': 'authorization_code',
			code,
			'redirect_uri': REDIRECT_URI,
			'client_id': CLIENT_ID,
			'code_verifier': first.verifier,
		};
		const exchange = await api.token(form);
		assertEquals(exchange.status, 200);
		assertEquals(exchange.body.token_type, 'Bearer');
		assert(exchange.body.access_token && exchange.body.refresh_token);
		tokens = exchange.body;

		const replay = await api.token(form);
		assertEquals(replay.body.error, 'invalid_grant');
	});

	await t.step('access token works and a forged one does not', async () => {
		const accountId = tokens.account_id;
		assertEquals(await api.session(tokens.access_token, accountId), 200);
		const forged = tokens.access_token.slice(0, -3) + 'AAA';
		assertEquals(await api.session(forged, accountId), 401);
	});

	await t.step('refresh rotates, replay revokes the family', async () => {
		const refresh = (token: string) =>
			api.token({
				grant_type: 'refresh_token',
				refresh_token: token,
				client_id: CLIENT_ID,
			});

		const rotation = await refresh(tokens.refresh_token);
		assertEquals(rotation.status, 200);
		assertNotEquals(rotation.body.refresh_token, tokens.refresh_token);
		rotated = rotation.body;

		assertEquals(
			(await refresh(tokens.refresh_token)).body.error,
			'invalid_grant',
		);
		assertEquals(
			(await refresh(rotated.refresh_token)).body.error,
			'invalid_grant',
		);
		assertEquals(
			await api.session(rotated.access_token, rotated.account_id),
			401,
		);
	});

	await t.step('second sign in reuses the stored consent', async () => {
		const second = await pkce();
		const { authTxnId } =
			(await api.authorize(second.challenge, 'state-two'))
				.body;

		const wrong = await api.post('/auth/login/password', {
			authTxnId,
			username,
			password: password + 'x',
		});
		assertEquals(wrong.status, 401);

		// Login always answers consent. GET /auth/consent then skips the
		// screen when the account already granted every requested scope.
		const login = await api.post('/auth/login/password', {
			authTxnId,
			username,
			password,
		});
		assertEquals(login.body.next, 'consent');
		const consent = await api.consent(authTxnId);
		assertEquals(consent.body.next, 'redirect');

		const code2 = new URL(consent.body.redirectUri).searchParams.get(
			'code',
		);
		const badVerifier = await api.token({
			grant_type: 'authorization_code',
			code: code2 ?? '',
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: first.verifier,
		});
		assertEquals(badVerifier.body.error, 'invalid_grant');
	});

	/**
	 * Sign in with the management scope and return fresh tokens. The first
	 * call approves the added scope, later ones reuse that consent.
	 */
	const signIn = async () => {
		const { verifier, challenge } = await pkce();
		const authorize = await api.authorize(
			challenge,
			'state-list',
			'profile email api:read api:write',
		);
		assertEquals(authorize.status, 200, JSON.stringify(authorize.body));
		const { authTxnId } = authorize.body;
		await api.post('/auth/login/password', { authTxnId, username, password });
		let consent = await api.consent(authTxnId);
		if (consent.body.next === 'consent') {
			consent = await api.post('/auth/consent/approve', {
				authTxnId,
				approvedScopes: consent.body.requestedScopes,
			});
		}
		const code = new URL(consent.body.redirectUri).searchParams.get('code');
		const exchange = await api.token({
			grant_type: 'authorization_code',
			code: code ?? '',
			redirect_uri: REDIRECT_URI,
			client_id: CLIENT_ID,
			code_verifier: verifier,
		});
		assertEquals(exchange.status, 200);
		return exchange.body;
	};

	// The list queries sort through their indexes before any join, and join
	// only the returned page unless a search needs the joined names.
	await t.step('management lists page, sort, join and search', async () => {
		const older = await signIn();
		const newer = await signIn();
		const list = (path: string, input: Record<string, string> = {}) =>
			api.management('GET', path, newer, input);

		const first = await list('/auth/management/account-sessions', {
			limit: '1',
			offset: '0',
		});
		assertEquals(first.status, 200, JSON.stringify(first.body));
		assertEquals(first.body.items.length, 1);
		assert(first.body.total >= 2, 'both live sessions are counted');
		assertEquals(first.body.items[0].username, username);
		assertEquals(first.body.items[0].current, true, 'newest first');
		const second = await list('/auth/management/account-sessions', {
			limit: '1',
			offset: '1',
		});
		assert(
			new Date(first.body.items[0].createdAt) >=
				new Date(second.body.items[0].createdAt),
		);
		const byName = await list('/auth/management/account-sessions', {
			search: username,
		});
		assertEquals(byName.body.total, first.body.total);

		const consents = await list('/auth/management/consents');
		assertEquals(consents.status, 200, JSON.stringify(consents.body));
		assertEquals(consents.body.total, 1);
		assertEquals(consents.body.items[0].username, username);
		assert(consents.body.items[0].clientName, 'the page is joined');
		const consentSearch = await list('/auth/management/consents', {
			search: consents.body.items[0].clientName,
		});
		assertEquals(consentSearch.body.total, 1);
		assertEquals(
			(await list('/auth/management/consents', { search: 'no-such-client' }))
				.body.total,
			0,
		);

		const apps = await list('/auth/management/connected-apps');
		assertEquals(apps.status, 200, JSON.stringify(apps.body));
		assertEquals(apps.body.total, 1);
		assert(apps.body.items[0].clientName, 'the page is joined');
		assertEquals(
			(await list('/auth/management/connected-apps', {
				search: apps.body.items[0].clientName,
			})).body.total,
			1,
		);
		assertEquals(
			(await list('/auth/management/connected-apps', {
				search: 'no-such-client',
			})).body.total,
			0,
		);

		// The tenant chooser offers only accounts a switch would accept.
		const memberships = await list('/auth/management/accounts/memberships');
		assertEquals(memberships.status, 200, JSON.stringify(memberships.body));
		assertEquals(memberships.body.length, 1);
		assertEquals(memberships.body[0].accountId, newer.account_id);

		const members = await list('/auth/management/collaborators');
		assertEquals(members.status, 200, JSON.stringify(members.body));
		assertEquals(members.body.total, 1);
		assertEquals(members.body.items[0].userProfile.username, username);

		// Revoking needs no separate lookup: the revoke itself reports a miss.
		const target = second.body.items[0]._id;
		const revoke = () =>
			api.management('POST', '/auth/management/account-sessions/revoke', newer, {
				id: target,
			});
		assertEquals((await revoke()).body.revoked, true);
		assertEquals((await revoke()).status, 404);
		assertEquals(await api.session(older.access_token, older.account_id), 401);

		await checkCollaboratorCap(api, newer);
	});
}

/**
 * settings.limits.collaborators holds when a removed member is reactivated.
 * An inactive member is seeded straight into the throwaway user's account,
 * since inviting one needs email delivery.
 */
async function checkCollaboratorCap(
	api: ReturnType<typeof client>,
	tokens: Json,
) {
	const connection = loadMongodb({
		DATABASE_URL: dotenv.DATABASE_URL,
		DATABASE_NAME: dotenv.DATABASE_NAME,
	});
	await connection.connect();
	try {
		const db = connection.getDb();
		const account = new ObjectId(tokens.account_id);
		const stored = await getAccountCollection(db).findOne(
			{ _id: account },
			{ projection: { app: 1 } },
		);
		assert(stored);
		const member = new ObjectId();
		const now = new Date();
		await getCollaboratorCollection(db).insertOne({
			_id: member,
			app: stored.app,
			user: new ObjectId(),
			account,
			role: 'member',
			isOwner: false,
			isPrimary: false,
			isActive: false,
			attributes: {},
			createdAt: now,
			updatedAt: now,
		});
		const setCap = (collaborators: number) =>
			getAccountCollection(db).updateOne({ _id: account }, {
				$set: { 'settings.limits.collaborators': collaborators },
			});
		const reactivate = () =>
			api.management('PATCH', '/auth/management/collaborators', tokens, {
				id: member.toHexString(),
				isActive: true,
			});

		// The owner already holds the only seat.
		await setCap(1);
		const refused = await reactivate();
		assertEquals(refused.status, 403, JSON.stringify(refused.body));
		assertEquals(
			refused.body.error_description,
			'This account has reached its collaborator limit.',
		);

		await setCap(2);
		const allowed = await reactivate();
		assertEquals(allowed.status, 200, JSON.stringify(allowed.body));
		assertEquals(allowed.body.isActive, true);
	} finally {
		await connection.disconnect();
	}
}
