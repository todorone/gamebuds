import { hc } from 'hono/client';
import type { ClientRequestOptions } from 'hono/client';

import type { AppType } from './app.js';

export function createApiClient(
	baseUrl: string,
	options?: ClientRequestOptions,
) {
	return hc<AppType>(baseUrl, options);
}
