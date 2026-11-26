import { createRouter, type ICodexaHttpRouter } from '@codexa/http';
import type { z } from '@codexa/core/providers/zod';
import type { CodexaAppOAuthSchema } from '../config/app.config.ts';

type CodexaAppOAuth = z.infer<typeof CodexaAppOAuthSchema>;

/** Text placed in HTML, so a configured path can never become markup. */
function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) =>
		({
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		})[character] ?? character);
}

/**
 * Routes the Codexa App frontend needs beside its static files. The root only
 * says the server is running and where the app is, so nothing opens the app
 * unless its path is typed. config.json tells the frontend which OAuth client
 * to start sign in with, so one build works on every deployment.
 */
export function createClientRouter(
	mountPath: string,
	oauth: CodexaAppOAuth,
): ICodexaHttpRouter {
	const router = createRouter('codexa-app-client-router');
	const config = Object.freeze({
		oauth: {
			clientId: oauth.clientId ?? null,
			scopes: [...oauth.scopes],
		},
	});
	const appPath = escapeHtml(`${mountPath}/`);
	// No inline style or script, so it fits the strictest Content Security Policy.
	const welcome = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Codexa</title>
</head>
<body>
<h1>Welcome back</h1>
<p>The server is running.</p>
<p>Visit <a href="${appPath}">${appPath}</a> for the app.</p>
</body>
</html>
`;

	router.route({
		method: ['GET', 'HEAD'],
		path: '/',
		handler: () =>
			new Response(welcome, {
				status: 200,
				headers: {
					'content-type': 'text/html; charset=utf-8',
					'cache-control': 'no-store',
				},
			}),
		options: { name: 'codexa-app.root', openapi: { exclude: true } },
	});

	router.route({
		method: 'GET',
		path: `${mountPath}/config.json`,
		handler: (ctx) =>
			ctx.json(config, { headers: { 'cache-control': 'no-store' } }),
		options: { name: 'codexa-app.config', openapi: { exclude: true } },
	});

	return router;
}
