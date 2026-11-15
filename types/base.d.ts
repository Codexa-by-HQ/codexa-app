import type { CodexaAppConfig } from '../config/app.config.ts';

declare module '@codexa/http' {
	interface IPluginConfigMap {
		'codexa-app': {
			requirements: CodexaAppConfig;
		};
	}
}
