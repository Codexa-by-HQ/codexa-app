import type { ICodexaHttp } from '@codexa/http';
import type { OAuthAppConfigInput } from '@codexa/oauth-app';
import type { SessionLocationResolver } from '@codexa/oauth/types';
import type { EmailDeliveryProvider } from '@codexa/oauth/validations';
import type { HostEnvironmentInput } from '../validations/environment.validation.ts';

/**
 * An optional plugin's install config, or why the host leaves it off, such as
 * a missing key. The host logs the reason so a skipped plugin is never silent.
 */
export type OptionalPluginConfig<T> =
	| { readonly config: T }
	| { readonly off: string };

export interface HostRuntimeOptions {
	/** Use this environment instead of loading .env and Deno.env. */
	readonly environment?: HostEnvironmentInput;
	/** Stops the host. Cleanup still runs and its failures are reported. */
	readonly signal?: AbortSignal;
	/** Runs inside app.boot, after every plugin is installed. */
	readonly configure?: (app: ICodexaHttp) => void | Promise<void>;
	/** Called once the server is listening, with the listener origin. */
	readonly onListening?: (origin: string) => void;
	/** Replaces the SMTP provider built from the OAUTH_SMTP variables. */
	readonly emailProvider?: EmailDeliveryProvider;
	readonly sessionLocationResolver?: SessionLocationResolver;
	/**
	 * OAuth App options. The mount path is left out because it comes only from
	 * OAUTH_APP_MOUNT_PATH, which also builds the URLs OAuth Base redirects to.
	 */
	readonly oauthApp?: Omit<OAuthAppConfigInput, 'mountPath'>;
}
