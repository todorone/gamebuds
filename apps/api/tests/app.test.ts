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

	it('allows any localhost port for local Vite preflight requests', async () => {
		const response = await app.request(
			'/prototype/split-signal/sessions',
			{
				method: 'OPTIONS',
				headers: {
					Origin: 'http://localhost:5174',
					'Access-Control-Request-Method': 'POST',
					'Access-Control-Request-Headers': 'content-type',
				},
			},
			env,
		);

		expect(response.status).toBe(204);
		expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
			'http://localhost:5174',
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

	it('allows a celebration ping after the Game Session completes', async () => {
		const jsonHeaders = { 'Content-Type': 'application/json' };
		const createResponse = await app.request(
			'/prototype/split-signal/sessions',
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ name: 'Host' }),
			},
			env,
		);
		const created = (await createResponse.json()) as {
			playerId: string;
			state: { code: string };
		};
		const joinResponse = await app.request(
			`/prototype/split-signal/sessions/${created.state.code}/players`,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ name: 'Buddy' }),
			},
			env,
		);
		const joined = (await joinResponse.json()) as { playerId: string };
		const actionPath = `/prototype/split-signal/sessions/${created.state.code}/actions`;

		await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'start' }),
			},
			env,
		);

		let progress = 0;
		for (let attempt = 0; attempt < 6 && progress < 2; attempt += 1) {
			for (const playerId of [created.playerId, joined.playerId]) {
				const repairResponse = await app.request(
					actionPath,
					{
						method: 'POST',
						headers: jsonHeaders,
						body: JSON.stringify({ playerId, type: 'repair' }),
					},
					env,
				);
				const repaired = (await repairResponse.json()) as {
					state: { progress: string[] };
				};
				if (repaired.state.progress.length > progress) {
					progress = repaired.state.progress.length;
					break;
				}
			}
		}

		expect(progress).toBe(2);
		const pingResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'ping' }),
			},
			env,
		);

		expect(pingResponse.status).toBe(200);
	});

	it('lets a Player finish and log out after the Game Session completes', async () => {
		const jsonHeaders = { 'Content-Type': 'application/json' };
		const createResponse = await app.request(
			'/prototype/split-signal/sessions',
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ name: 'Host' }),
			},
			env,
		);
		const created = (await createResponse.json()) as {
			playerId: string;
			state: { code: string };
		};
		const joinResponse = await app.request(
			`/prototype/split-signal/sessions/${created.state.code}/players`,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ name: 'Buddy' }),
			},
			env,
		);
		const joined = (await joinResponse.json()) as { playerId: string };
		const actionPath = `/prototype/split-signal/sessions/${created.state.code}/actions`;

		await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'start' }),
			},
			env,
		);
		let progress = 0;
		for (let attempt = 0; attempt < 6 && progress < 2; attempt += 1) {
			for (const playerId of [created.playerId, joined.playerId]) {
				const repairResponse = await app.request(
					actionPath,
					{
						method: 'POST',
						headers: jsonHeaders,
						body: JSON.stringify({ playerId, type: 'repair' }),
					},
					env,
				);
				const repaired = (await repairResponse.json()) as {
					state: { progress: string[] };
				};
				if (repaired.state.progress.length > progress) {
					progress = repaired.state.progress.length;
					break;
				}
			}
		}
		expect(progress).toBe(2);

		const logoutResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: joined.playerId, type: 'logout' }),
			},
			env,
		);

		expect(logoutResponse.status).toBe(200);
		expect(await logoutResponse.json()).toEqual({ loggedOut: true });

		const loggedOutStateResponse = await app.request(
			`/prototype/split-signal/sessions/${created.state.code}?playerId=${joined.playerId}`,
			undefined,
			env,
		);
		expect(loggedOutStateResponse.status).toBe(401);

		const hostStateResponse = await app.request(
			`/prototype/split-signal/sessions/${created.state.code}?playerId=${created.playerId}`,
			undefined,
			env,
		);
		const hostState = (await hostStateResponse.json()) as {
			state: {
				players: Array<{ id: string }>;
				events: Array<{ message: string }>;
			};
		};
		expect(hostState.state.players).toHaveLength(1);
		expect(hostState.state.events.at(-1)?.message).toContain('logged out');
	});
});
