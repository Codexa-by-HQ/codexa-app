// The page.evaluate callbacks run in the browser, so they use DOM types.
/// <reference lib="dom" />
import { assert, assertEquals } from '@std/assert';
import type { Page } from 'playwright-core';
import {
	getOAuthAppCollection,
	getOAuthCredentialCollection,
} from '@codexa/oauth/models';
import { loadMongodb } from '../../core/lib/database.ts';
import { E2E_PORT, executablePath, withPage } from '../support/browser.ts';
import { dotenv, withHost } from '../support/host.ts';

/**
 * OAuth App wears the branding OAuth stores on the application, in light and
 * dark mode, under the real CSP. It brands the setup app for the run and
 * restores its original branding afterwards.
 */

const LIGHT_PRIMARY = '#7c3aed';
const DARK_PRIMARY = '#a78bfa';
const SCREENSHOTS = dotenv.E2E_SCREENSHOT_DIR;

Deno.test({
	name: 'OAuth App applies application branding under its CSP',
	ignore: !executablePath || !dotenv.CODEXA_APP_OAUTH_CLIENT_ID,
	sanitizeOps: false,
	sanitizeResources: false,
	async fn() {
		const connection = loadMongodb({
			DATABASE_URL: dotenv.DATABASE_URL,
			DATABASE_NAME: dotenv.DATABASE_NAME,
		});
		await connection.connect();
		const db = connection.getDb();
		const apps = getOAuthAppCollection(db);

		const credential = await getOAuthCredentialCollection(db).findOne(
			{ clientId: dotenv.CODEXA_APP_OAUTH_CLIENT_ID },
			{ projection: { app: 1 } },
		);
		assert(credential, 'The Codexa App client does not exist. Run setup.');
		const app = await apps.findOne(
			{ _id: credential.app },
			{ projection: { name: 1, branding: 1 } },
		);
		assert(app);

		try {
			await apps.updateOne({ _id: app._id }, {
				$set: {
					branding: {
						lightTheme: { primary: LIGHT_PRIMARY, radiusPx: 6 },
						darkTheme: { primary: DARK_PRIMARY },
					},
				},
			});
			await withHost(
				(origin) => withPage((page) => check(page, origin, app.name)),
				E2E_PORT,
			);
		} finally {
			await apps.updateOne(
				{ _id: app._id },
				app.branding ? { $set: { branding: app.branding } } : { $unset: { branding: '' } },
			);
			await connection.disconnect();
		}
	},
});

async function check(page: Page, origin: string, appName: string) {
	const violations: string[] = [];
	page.on('console', (message) => {
		if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
	});
	const token = (name: string) =>
		page.evaluate(
			(variable) => getComputedStyle(document.documentElement).getPropertyValue(variable).trim(),
			name,
		);

	await page.goto(`${origin}/`);
	await page.getByRole('button', { name: 'Sign in' }).click();
	await page.waitForURL(/\/auth\/login\?authTxnId=/);
	await page.getByRole('heading', { level: 1, name: 'Sign in' }).waitFor();

	// The header names the application instead of Codexa OAuth.
	assert(await page.getByText(appName, { exact: true }).first().isVisible());
	assertEquals(await token('--primary'), LIGHT_PRIMARY);
	assertEquals(await token('--primary-foreground'), '#ffffff');
	assertEquals(await token('--radius'), '6px');
	if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/branding-light.png` });

	// Dark mode switches by class alone, with no request or re-render.
	await page.evaluate(() => document.documentElement.classList.replace('light', 'dark'));
	assertEquals(await token('--primary'), DARK_PRIMARY);
	// The radius was branded for light mode only, so dark keeps the theme's own.
	assert(await token('--radius') !== '6px');
	if (SCREENSHOTS) await page.screenshot({ path: `${SCREENSHOTS}/branding-dark.png` });

	assertEquals(violations, []);
}
