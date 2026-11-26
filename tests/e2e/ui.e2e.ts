// The page.evaluate callbacks run in the browser, so they use DOM types.
/// <reference lib="dom" />
import { assert, assertEquals } from '@std/assert';
import { type Browser, chromium, type Page } from 'playwright-core';
import { E2E_PORT, executablePath } from '../support/browser.ts';
import { dotenv, withHost } from '../support/host.ts';

/**
 * Every official screen, in light and dark, English and Arabic, on a desktop
 * and a phone. Each screen must have one h1, no sideways scroll, the reading
 * direction of its language, and no console error or CSP violation. With
 * E2E_SCREENSHOT_DIR set, every screen of every variant is saved for review.
 *
 * Selectors use attributes rather than text, so they work in every language.
 * Each variant registers one throwaway user named ui_ followed by random
 * characters.
 */

const SCREENSHOTS = dotenv.E2E_SCREENSHOT_DIR;
const TIMEOUT = 30_000;

type Variant = {
	theme: 'light' | 'dark';
	language: 'en' | 'ar';
	device: 'desktop' | 'phone';
};

const VARIANTS: Variant[] = (['light', 'dark'] as const).flatMap((theme) =>
	(['en', 'ar'] as const).flatMap((language) =>
		(['desktop', 'phone'] as const).map((device) => ({ theme, language, device }))
	)
);

const VIEWPORTS = {
	desktop: { width: 1280, height: 800 },
	phone: { width: 390, height: 844 },
};

Deno.test({
	name: 'every screen holds up in each theme, language and size',
	ignore: !executablePath || !dotenv.CODEXA_APP_OAUTH_CLIENT_ID,
	sanitizeOps: false,
	sanitizeResources: false,
	async fn(t) {
		await withHost(async (origin) => {
			const browser = await chromium.launch({ executablePath, headless: true });
			try {
				for (const variant of VARIANTS) {
					const name = `${variant.theme}-${variant.language}-${variant.device}`;
					await t.step(name, () => journey(browser, origin, variant, name));
				}
			} finally {
				await browser.close();
			}
		}, E2E_PORT, 15 * 60_000);
	},
});

async function journey(browser: Browser, origin: string, variant: Variant, name: string) {
	const context = await browser.newContext({
		viewport: VIEWPORTS[variant.device],
		locale: variant.language,
		isMobile: variant.device === 'phone',
		hasTouch: variant.device === 'phone',
	});
	// Both apps read these before their first paint.
	await context.addInitScript(([theme, language]) => {
		localStorage.setItem('codexa-theme', theme);
		localStorage.setItem('i18nextLng', language);
	}, [variant.theme, variant.language]);
	const page = await context.newPage();
	page.setDefaultTimeout(TIMEOUT);

	const problems: string[] = [];
	page.on('console', (message) => {
		if (message.type() === 'error') problems.push(`${page.url()} ${message.text()}`);
	});
	page.on('pageerror', (error) => problems.push(`${page.url()} ${error.message}`));

	let shot = 0;
	const check = async (screen: string) => {
		// Let entrance animations settle before measuring and capturing.
		await page.waitForTimeout(700);
		const layout = await page.evaluate(() => ({
			h1: document.querySelectorAll('h1').length,
			overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
			dir: document.documentElement.dir,
			theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
		}));
		assertEquals(layout.h1, 1, `${name} ${screen}: one h1`);
		assert(layout.overflow <= 1, `${name} ${screen}: scrolls sideways by ${layout.overflow}px`);
		assertEquals(layout.dir, variant.language === 'ar' ? 'rtl' : 'ltr', `${name} ${screen}: dir`);
		assertEquals(layout.theme, variant.theme, `${name} ${screen}: theme`);
		if (SCREENSHOTS) {
			const directory = `${SCREENSHOTS}/ui/${name}`;
			await Deno.mkdir(directory, { recursive: true });
			const file = `${String(++shot).padStart(2, '0')}-${screen}.png`;
			await page.screenshot({ path: `${directory}/${file}` });
		}
	};
	const phone = variant.device === 'phone';
	// A desktop sheet slides in from the side. A phone's rises as a drawer.
	const overlay = page.locator('[data-slot="sheet-content"], [data-slot="drawer-content"]').first();
	// The profile menu is a dropdown on a desktop and a drawer on a phone.
	const openProfile = async () => {
		await page.locator('[data-shell="profile"]:visible').click();
		await (phone
			? page.locator('[data-slot="drawer-content"] [data-slot="item"]').first()
			: page.locator('[data-slot="dropdown-menu-item"]').first()).waitFor();
	};

	const username = 'ui_' + crypto.randomUUID().slice(0, 8);
	const password = 'UiTest' + crypto.randomUUID().slice(0, 6) + '9';

	await page.goto(`${origin}/`);
	await page.locator('[data-shell="sign-in"]').waitFor();
	await check('app-sign-in');

	await page.locator('[data-shell="sign-in"]').click();
	await page.waitForURL(/\/auth\/login\?authTxnId=/);
	await page.locator('input[name="username"]').waitFor();
	await check('oauth-login');

	await page.locator('a[href*="/signup"]').click();
	await page.waitForURL(/\/auth\/signup\?authTxnId=/);
	await page.locator('input[name="confirmPassword"]').waitFor();
	await check('oauth-register');
	await page.locator('input[name="username"]').fill(username);
	await page.locator('input[name="password"]').fill(password);
	await page.locator('input[name="confirmPassword"]').fill(password);
	await check('oauth-register-filled');
	await page.locator('button[type="submit"]').click();

	await page.waitForURL(/\/auth\/approve\?authTxnId=/);
	await page.locator('button[value="allow"]').waitFor();
	await check('oauth-consent');
	await page.locator('button[value="allow"]').click();

	await page.waitForURL((url) => /^\/app\/[a-f\d]{24}\/?$/.test(url.pathname));
	await page.locator('main h1:not(.sr-only)').waitFor();
	await check('app-overview');

	await page.goto(`${origin}/app/account`);
	await page.locator('main h1:not(.sr-only)').waitFor();
	await check('app-account');

	await page.goto(`${origin}/app/missing-page`);
	await page.locator('main h1:not(.sr-only)').waitFor();
	await check('app-not-found');

	await openProfile();
	await check('app-user-menu');
	if (!phone) {
		await page.locator('[data-slot="dropdown-menu-sub-trigger"]').last().hover();
		await page.locator('[data-slot="dropdown-menu-sub-content"]').waitFor();
		await check('app-user-menu-appearance');
		await page.keyboard.press('Escape');
		await page.locator('[data-slot="dropdown-menu-sub-content"]').waitFor({ state: 'hidden' });
	}
	await page.keyboard.press('Escape');
	await overlay.waitFor({ state: 'hidden' });
	await page.locator('[data-slot="dropdown-menu-content"]').waitFor({ state: 'hidden' });

	await page.goto(`${origin}/app/settings/users`);
	await page.locator('main h1:not(.sr-only)').waitFor();
	await check('app-settings-users');

	await page.keyboard.press('Control+k');
	await page.locator('[data-slot="command-input"]').waitFor();
	await check('app-search');
	await page.keyboard.press('Escape');
	await page.locator('[data-slot="command-input"]').waitFor({ state: 'hidden' });

	if (phone) {
		await page.locator('[data-shell="menu"]').click();
		// The menu is the shadcn sidebar, which a phone shows as its sheet.
		const menu = page.locator('[data-slot="sidebar"][data-mobile="true"]');
		await menu.waitFor();
		await check('app-mobile-nav');
		await page.keyboard.press('Escape');
		await menu.waitFor({ state: 'hidden' });
	}

	await openProfile();
	await (phone
		? page.locator('[data-slot="drawer-content"] [data-slot="button"]').last()
		: page.locator('[data-slot="dropdown-menu-item"][data-variant="destructive"]')).click();
	await page.locator('[role="alertdialog"]').waitFor();
	await check('app-sign-out-confirm');
	await page.locator('[role="alertdialog"] [data-slot="button"]').last().click();
	await page.locator('[data-shell="sign-in"]').waitFor();
	await check('app-signed-out');

	await context.close();
	assertEquals(problems, [], `${name}: console errors`);
}
