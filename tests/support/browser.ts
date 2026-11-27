import { type Browser, chromium, type Page } from 'playwright-core';
import { dotenv } from './host.ts';

/** E2E_BROWSER_PATH, or an installed Chrome or Edge. Undefined skips browser tests. */
export const executablePath = [
	dotenv.E2E_BROWSER_PATH,
	'C:/Program Files/Google/Chrome/Application/chrome.exe',
	'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
	'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
	'/usr/bin/google-chrome',
	'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((path) => {
	if (!path) return false;
	try {
		return Deno.statSync(path).isFile;
	} catch {
		return false;
	}
});

/** Browser tests run on SERVER_PORT, because the client only allows that origin. */
export const E2E_PORT = dotenv.SERVER_PORT ?? '8000';
const TIMEOUT = 30_000;

/** Run `steps` in a fresh headless page, closing the browser afterwards. */
export async function withPage(
	steps: (page: Page) => Promise<void>,
): Promise<void> {
	let browser: Browser | undefined;
	try {
		browser = await chromium.launch({ executablePath, headless: true });
		const context = await browser.newContext({ locale: 'en-US' });
		const page = await context.newPage();
		page.setDefaultTimeout(TIMEOUT);
		await steps(page);
	} finally {
		await browser?.close();
	}
}
