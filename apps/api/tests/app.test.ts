import { describe, expect, it } from 'vitest';

import { createApiClient } from '@gamebuds/api/client';

import { app } from '../src/app.js';
import { DEFAULT_CLIENT_ORIGINS } from '../src/cors.js';

const env = {
	DB: {} as D1Database,
};

const appFetch: typeof fetch = async (input, init) =>
	app.fetch(new Request(input, init), env);

describe('API', () => {
	it('serves the health endpoint through the typed client boundary', async () => {
		const client = createApiClient('https://api.test', { fetch: appFetch });
		const response = await client.health.$get();

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: 'ok' });
	});

	it('allows configured development origins', async () => {
		const response = await app.request(
			'/health',
			{
				headers: { Origin: DEFAULT_CLIENT_ORIGINS[0] },
			},
			env,
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
			DEFAULT_CLIENT_ORIGINS[0],
		);
	});

	it('rejects origins outside the allowlist', async () => {
		const response = await app.request(
			'/health',
			{
				headers: { Origin: 'https://arbitrary.example' },
			},
			env,
		);

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ error: 'Origin not allowed' });
	});

	it('uses an explicit configured allowlist', async () => {
		const response = await app.request(
			'/health',
			{
				headers: { Origin: 'https://staging.example' },
			},
			{ ...env, CORS_ORIGINS: 'https://staging.example' },
		);

		expect(response.status).toBe(200);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
			'https://staging.example',
		);
	});
});
