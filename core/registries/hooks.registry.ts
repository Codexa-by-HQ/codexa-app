import type { ICodexaHttp } from '@codexa/http';

const NO_STORE = { 'cache-control': 'no-store' } as const;

/** Host wide error and not found responses in the OAuth error shape. */
export function registerHostHooks(app: ICodexaHttp): ICodexaHttp {
	return app
		.onException((error) => {
			console.error('Codexa App request failed.', error);
			return Response.json({
				error: 'server_error',
				error_description: 'The request could not be completed.',
			}, { status: 500, headers: NO_STORE });
		})
		.onNotFound(() =>
			Response.json({
				error: 'not_found',
				error_description: 'The requested route was not found.',
			}, { status: 404, headers: NO_STORE })
		);
}
