import type { SetupEnvironment } from '../validations/environment.validation.ts';

type ListenerConfig = Pick<SetupEnvironment, 'SERVER_HOSTNAME' | 'SERVER_PORT'>;

/** The hostname Deno.serve binds, with IPv6 brackets removed. */
export function getListenerHostname(config: ListenerConfig): string {
	return config.SERVER_HOSTNAME.replace(/^\[(.*)\]$/, '$1');
}

/** The origin a browser on this machine uses to reach the listener. */
export function getListenerOrigin(config: ListenerConfig): string {
	const hostname = getListenerHostname(config);
	const browserHostname = hostname === '0.0.0.0'
		? '127.0.0.1'
		: hostname === '::'
		? '[::1]'
		: hostname.includes(':')
		? `[${hostname}]`
		: hostname;
	return new URL(`http://${browserHostname}:${config.SERVER_PORT}`).origin;
}
