import { zod as z } from '@codexa/core/providers/zod';

/** Accept a boolean or the string forms an environment file produces. */
export const envBoolean = z.union([
	z.boolean(),
	z.enum(['true', 'false', '1', '0']).transform((value) =>
		value === 'true' || value === '1'
	),
]);

/** A bare public HTTPS origin, without credentials, path, query or fragment. */
export const publicOriginSchema = z.url({ protocol: /^https$/ }).refine(
	(value) => new URL(value).origin === value,
	'Use the public HTTPS origin without credentials, a path, query, or fragment.',
);
