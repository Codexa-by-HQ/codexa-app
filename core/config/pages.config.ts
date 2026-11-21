/**
 * The pages OAuth App and Codexa App serve that OAuth and its plugins send
 * browsers to. This is the one place their names live, so every redirect and
 * every route agrees.
 *
 * OAuth App shares the /auth prefix with OAuth's versioned API, and a versioned
 * GET route shadows any page on the same path. Consent therefore lives at
 * /auth/approve, because /auth/consent is OAuth's own consent API.
 */
export const OAUTH_APP_PAGES = Object.freeze({
	login: 'login',
	register: 'signup',
	consent: 'approve',
	mfa: 'mfa',
	magicLink: 'magic-link',
	logout: 'logout',
	/** The personal account area, opened from the product by a management handoff. */
	account: 'account',
});

/** Codexa App pages a plugin links to, under the Codexa App mount path. */
export const CODEXA_APP_PAGES = Object.freeze({
	/** Device code entry, which needs the signed in user's token. */
	device: 'device',
});
