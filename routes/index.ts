import {
	createRouter,
	type ICodexaHttpRouter,
	serveStatic,
} from '@codexa/http';
import { CODEXA_APP_PATH } from '../config/app.config.ts';

export function serveStaticApp(
	assetsDirectory: URL,
	mountPath = CODEXA_APP_PATH,
): ICodexaHttpRouter {
	const router = createRouter('codexa-app-static-router');
	const paths = [mountPath, mountPath + '/:path*'];

	for (const path of paths) {
		router.route({
			method: ['GET', 'HEAD'],
			path,
			handler: (ctx) =>
				serveStatic(ctx, {
					root: assetsDirectory,
					spaFallback: true,
				}),
			options: { name: 'codexa-app.static', openapi: { exclude: true } },
		});
	}

	return router;
}
