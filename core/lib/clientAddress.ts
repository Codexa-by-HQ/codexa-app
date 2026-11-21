/**
 * The network address of each request, as the listener saw it. Codexa HTTP
 * does not expose it, so the host records it when Deno accepts the request
 * and OAuth reads it back through its `clientAddress` requirement.
 */
const addresses = new WeakMap<Request, string>();

export function rememberClientAddress(
	request: Request,
	info: Deno.ServeHandlerInfo,
): void {
	const address = info.remoteAddr;
	if ('hostname' in address) addresses.set(request, address.hostname);
}

/**
 * Resolve a request's client address. Behind a proxy the host trusts, the
 * first X-Forwarded-For entry is the client. Otherwise that header is ignored,
 * because any caller can send it.
 */
export function createClientAddressResolver(trustProxy: boolean) {
	return (request: Request): string | undefined => {
		if (trustProxy) {
			const forwarded = request.headers.get('x-forwarded-for')?.split(
				',',
			)[0]
				?.trim();
			if (forwarded) return forwarded;
		}
		return addresses.get(request);
	};
}
