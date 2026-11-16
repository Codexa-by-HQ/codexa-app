import { createRouter, type ICodexaHttpRouter } from '@codexa/http';
import type { z } from '@codexa/core/providers/zod';
import type { CodexaAppOAuthSchema } from '../config/app.config.ts';

type CodexaAppOAuth = z.infer<typeof CodexaAppOAuthSchema>;

/**
 * Routes the Codexa App frontend needs beside its static files. The root
 * redirects to the app, and config.json tells the frontend which OAuth client
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

	router.route({
		method: ['GET', 'HEAD'],
		path: '/',
		handler: (ctx) => ctx.redirect(`${mountPath}/`, 302),
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
