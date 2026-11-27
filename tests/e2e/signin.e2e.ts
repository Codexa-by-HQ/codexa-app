import { assert } from '@std/assert';
import type { Page } from 'playwright-core';
import { E2E_PORT, executablePath, withPage } from '../support/browser.ts';
import { dotenv } from '../support/host.ts';
import { withOwners } from '../support/oauth.ts';

/**
 * Sign in through a real browser, clicking the actual screens: Codexa App
 * starts OAuth, OAuth App registers and asks for consent, and Codexa App
 * finishes the callback.
 *
 * It runs on SERVER_PORT, because the app derives its redirect URI from the
 * page origin and the client only allows that origin. Stop the dev host first.
 * Each run registers one throwaway user named e2e_ followed by random characters.
 */

/** When set, every screen is saved here as a PNG for a design review. */
const SCREENSHOTS = dotenv.E2E_SCREENSHOT_DIR;

Deno.test({
	name: 'browser sign in through Codexa App and OAuth App',
	ignore: !executablePath || !dotenv.CODEXA_APP_OAUTH_CLIENT_ID,
	sanitizeOps: false,
	sanitizeResources: false,
	async fn(t) {
		const username = 'e2e_' + crypto.randomUUID().slice(0, 8);
		const password = 'E2eTest' + crypto.randomUUID().slice(0, 6) + '9';
		await withOwners(
			(origin) =>
				withPage((page) => run(t, page, origin, username, password)),
			E2E_PORT,
		);
	},
});

async function run(
	t: Deno.TestContext,
	page: Page,
	origin: string,
	username: string,
	password: string,
) {
	/** The dashboard is up: its user menu shows in the sidebar. */
	const signedIn = () =>
		page.getByRole('button', { name: 'Account menu' }).waitFor();
	/** The dashboard root of the signed in account, /app/<accountId>/. */
	const atDashboardRoot = () =>
		/^\/app\/[a-f\d]{24}\/?$/.test(new URL(page.url()).pathname);

	let shots = 0;
	/** Save the current screen when E2E_SCREENSHOT_DIR is set. */
	const capture = async (name: string) => {
		if (!SCREENSHOTS) return;
		await Deno.mkdir(SCREENSHOTS, { recursive: true });
		// Let the entrance animations settle, so the capture shows the layout.
		await page.waitForTimeout(800);
		const file = `${String(++shots).padStart(2, '0')}-${name}.png`;
		await page.screenshot({ path: `${SCREENSHOTS}/${file}` });
	};

	await t.step('/app opens the app signed out', async () => {
		await page.goto(`${origin}/app/`);
		assert(new URL(page.url()).pathname === '/app/');
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.waitFor();
		await capture('app-signed-out');
	});

	await t.step('Sign in hands over to OAuth App', async () => {
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.click();
		await page.waitForURL(/\/auth\/login\?authTxnId=/);
		await page.getByRole('heading', { name: 'Sign in', exact: true })
			.waitFor();
		await capture('oauth-sign-in');
	});

	await t.step('register a new account', async () => {
		await page.getByRole('link', { name: 'Create account' }).click();
		await page.waitForURL(/\/auth\/signup\?authTxnId=/);
		await capture('oauth-register');
		await page.getByLabel('Username').fill(username);
		await page.getByLabel('Password', { exact: true }).fill(password);
		await page.getByLabel('Confirm password').fill(password);
		await page.getByRole('button', { name: 'Create account' }).click();
	});

	await t.step('consent returns to the app signed in', async () => {
		await page.getByRole('heading', {
			level: 1,
			// The client and application are named by whoever ran setup.
			name: /wants to access your .+ account/,
		}).waitFor();
		await capture('oauth-consent');
		await page.getByRole('button', { name: 'Allow' }).click();
		await signedIn();
		// The callback replaced its URL, so the one time code left history.
		assert(atDashboardRoot(), page.url());
		await page.getByRole('heading', { level: 1, name: 'Overview' })
			.waitFor();
		await page.getByText(/^You are signed in to .+.$/).waitFor();
		assert(
			(await page.title()).startsWith('Overview · '),
			await page.title(),
		);
		await capture('app-overview');
	});

	await t.step('the Settings section opens the session page', async () => {
		await page.getByRole('link', { name: 'Settings' }).first().click();
		await page.waitForURL((url) =>
			/^\/app\/[a-f\d]{24}\/account$/.test(url.pathname)
		);
		await page.getByRole('heading', { level: 1, name: 'Session' })
			.waitFor();
		await capture('app-account');
	});

	await t.step('an unknown path shows the not found page', async () => {
		await page.goto(`${origin}/app/missing-page`);
		await signedIn();
		await page.getByRole('heading', { level: 1, name: 'Page not found' })
			.waitFor();
		await capture('app-not-found');
		await page.getByRole('link', { name: 'Back to overview' }).click();
		await page.getByRole('heading', { level: 1, name: 'Overview' })
			.waitFor();
	});

	await t.step('a reload keeps the session', async () => {
		await page.reload();
		await signedIn();
	});

	await t.step('sign out asks first, then returns to sign in', async () => {
		await page.getByRole('button', { name: 'Account menu' }).click();
		await page.getByRole('menuitem', { name: 'Sign out' }).click();
		const dialog = page.getByRole('alertdialog', {
			name: 'Sign out of Codexa App?',
		});
		await capture('app-sign-out-confirm');
		await dialog.getByRole('button', { name: 'Sign out' }).click();
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.waitFor();
		await dialog.waitFor({ state: 'hidden' });
	});

	await t.step('a wrong password shows an error', async () => {
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.click();
		await page.waitForURL(/\/auth\/login\?authTxnId=/);
		await page.getByLabel('Username').fill(username);
		await page.getByLabel('Password', { exact: true }).fill(password + 'x');
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.click();
		await page.getByText('Username or password is incorrect.').waitFor();
		await capture('oauth-wrong-password');
	});

	await t.step('signing in again skips the remembered consent', async () => {
		await page.getByLabel('Password', { exact: true }).fill(password);
		await page.getByRole('button', { name: 'Sign in', exact: true })
			.click();
		await signedIn();
		assert(atDashboardRoot(), page.url());
		await page.getByText(/^You are signed in to .+.$/).waitFor();
	});
}
