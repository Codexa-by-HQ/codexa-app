import { assertEquals, assertRejects } from '@std/assert';
import { HostAccessTokenProvider } from '../../core/providers/accessToken.provider.ts';

const config = {
	secret: 'x'.repeat(32),
	issuer: 'http://localhost:8000',
	audience: 'codexa',
};
const provider = new HostAccessTokenProvider(config);
const id = '65f000000000000000000001';
const now = Math.floor(Date.now() / 1_000);
const claims = {
	sub: id,
	jti: 'jti-1',
	sid: id,
	app: id,
	credential: id,
	iat: now,
	exp: now + 900,
};

function base64Url(value: string): string {
	return btoa(value).replace(/\+/g, '-').replace(/\//g, '_')
		.replace(/=+$/, '');
}

Deno.test('a signed token verifies with issuer and audience bound', async () => {
	const verified = await provider.verify(await provider.sign(claims));
	assertEquals(verified.sub, id);
	assertEquals(verified.iss, config.issuer);
	assertEquals(verified.aud, config.audience);
});

Deno.test('a tampered signature is rejected', async () => {
	const token = await provider.sign(claims);
	await assertRejects(
		() => provider.verify(token.slice(0, -2) + 'AA'),
		Error,
		'signature is invalid',
	);
});

Deno.test('a tampered payload is rejected', async () => {
	const [header, , signature] = (await provider.sign(claims)).split('.');
	const payload = base64Url(JSON.stringify({
		...claims,
		sub: '65f000000000000000000002',
		iss: config.issuer,
		aud: config.audience,
	}));
	await assertRejects(
		() => provider.verify(`${header}.${payload}.${signature}`),
		Error,
		'signature is invalid',
	);
});

Deno.test('alg none and malformed tokens are rejected', async () => {
	const [, payload] = (await provider.sign(claims)).split('.');
	const none = base64Url('{"alg":"none","typ":"JWT"}');
	await assertRejects(() => provider.verify(`${none}.${payload}.`));
	await assertRejects(() => provider.verify('a.b.c'), Error, 'malformed');
	await assertRejects(
		() => provider.verify('not-a-token'),
		Error,
		'malformed',
	);
});

Deno.test('a token for another issuer or secret is rejected', async () => {
	const token = await provider.sign(claims);
	const otherIssuer = new HostAccessTokenProvider({
		...config,
		issuer: 'http://other.test',
	});
	const otherSecret = new HostAccessTokenProvider({
		...config,
		secret: 'y'.repeat(32),
	});
	await assertRejects(() => otherIssuer.verify(token), Error, 'not valid');
	await assertRejects(
		() => otherSecret.verify(token),
		Error,
		'signature is invalid',
	);
});

Deno.test('an expired token is rejected', async () => {
	const token = await provider.sign({
		...claims,
		iat: now - 1_000,
		exp: now - 10,
	});
	await assertRejects(() => provider.verify(token), Error, 'expired');
});
