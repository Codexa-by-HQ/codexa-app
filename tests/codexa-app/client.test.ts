import { assert, assertEquals } from '@std/assert';
import { dotenv, withHost } from '../support/host.ts';
import { CODEXA_APP_REQUIRED_SCOPES } from '../../core/config/codexaApp.config.ts';
import { PRODUCT_CATALOG } from '../../config/app.config.ts';

/**
 * What the Codexa App frontend relies on from its plugin: the root redirect,
 * the runtime config that names its OAuth client, and its security headers.
 */
Deno.test({
	name: 'Codexa App serves its frontend runtime contract',
	sanitizeOps: false,
	sanitizeResources: false,
	async fn(t) {
		await withHost(async (origin) => {
			await t.step('root redirects to the app', async () => {
				const response = await fetch(`${origin}/`, {
					redirect: 'manual',
				});
				await response.body?.cancel();
				assertEquals(response.status, 302);
				assertEquals(response.headers.get('location'), '/app/');
			});

			await t.step('config.json names the sign in client', async () => {
				const response = await fetch(`${origin}/app/config.json`);
				assertEquals(response.status, 200);
				// Must not be swallowed by the SPA fallback route.
				assert(
					response.headers.get('content-type')?.includes(
						'application/json',
					),
				);
				const body = await response.json();
				assertEquals(
					body.oauth.clientId,
					dotenv.CODEXA_APP_OAUTH_CLIENT_ID ?? null,
				);
				// Core's required scopes always come first, then the product's.
				assertEquals(body.oauth.scopes, [
					...new Set([
						...CODEXA_APP_REQUIRED_SCOPES,
						...(PRODUCT_CATALOG.scopes ?? []).map(({ name }) =>
							name
						),
					]),
				]);
			});

			await t.step('the app sends its security headers', async () => {
				const response = await fetch(`${origin}/app/`);
				await response.body?.cancel();
				assertEquals(response.status, 200);
				const csp = response.headers.get('content-security-policy');
				assert(csp?.includes("default-src 'self'"));
				assert(csp?.includes("frame-ancestors 'none'"));
				assertEquals(
					response.headers.get('x-content-type-options'),
					'nosniff',
				);
			});

			await t.step('the callback path serves the app', async () => {
				// The SPA fallback only answers HTML navigations, as a browser makes.
				const response = await fetch(
					`${origin}/app/callback?code=x&state=y`,
					{ headers: { accept: 'text/html' } },
				);
				const html = await response.text();
				assertEquals(response.status, 200);
				assert(html.includes('<div id="root">'));
			});
		});
	},
});
