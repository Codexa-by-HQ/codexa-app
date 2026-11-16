import { env } from "./env";

/**
 * Transport for every request Codexa App core makes. Each endpoint in
 * api.ts goes through `request`, which owns the timeout, the body and a
 * single read of the response.
 */

/** A request OAuth or the host answered with an error status. */
export class ApiError extends Error {
  /** The endpoint id that failed, as in api.ts. */
  readonly endpoint: string;
  readonly status: number;
  /** The OAuth error code, such as `invalid_grant`, when the body had one. */
  readonly code?: string;

  constructor(endpoint: string, status: number, code: string | undefined, message: string) {
    super(message);
    this.endpoint = endpoint;
    this.status = status;
    this.code = code;
  }
}

export type RequestOptions = Omit<RequestInit, "body"> & {
  url: string;
  /** Sent as application/x-www-form-urlencoded, as the OAuth endpoints expect. */
  form?: Record<string, string>;
};

type OAuthErrorBody = { error?: unknown; error_description?: unknown };

/**
 * One fetch with a timeout and an optional form body. A failed status becomes
 * an ApiError carrying OAuth's own error. An empty success body, as from
 * revocation, resolves to null.
 */
export async function request<T>(
  endpoint: string,
  { url, form, headers, ...init }: RequestOptions,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: form
      ? { "content-type": "application/x-www-form-urlencoded", ...headers }
      : headers,
    body: form && new URLSearchParams(form),
    signal: init.signal ?? AbortSignal.timeout(env.requestTimeoutMs),
  });
  const text = await response.text();
  const body: unknown = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const { error, error_description } = (body ?? {}) as OAuthErrorBody;
    throw new ApiError(
      endpoint,
      response.status,
      typeof error === "string" ? error : undefined,
      typeof error_description === "string" ? error_description : response.statusText,
    );
  }
  return body as T;
}

/** Sends one request on behalf of an endpoint. */
export type Send = <T>(options: RequestOptions) => Promise<T>;

/**
 * Declares an endpoint as `{ id, execute }`. `execute` receives a `send`
 * already bound to the id, so the id is written once and every failure
 * names the endpoint it came from.
 */
export function endpoint<const Id extends string, Args extends unknown[], Result>(
  id: Id,
  execute: (send: Send, ...args: Args) => Promise<Result>,
) {
  const send: Send = (options) => request(id, options);
  return { id, execute: (...args: Args) => execute(send, ...args) } as const;
}
