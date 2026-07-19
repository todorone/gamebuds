import { describe, expect, it } from 'vitest';

import { createApiClient } from '@gamebuds/api/client';

import { app } from '../src/app.js';
import { DEFAULT_CLIENT_ORIGINS } from '../src/cors.js';

const env = {
	DB: {} as D1Database,
};

const appFetch: typeof fetch = async (input, init) =>
	app.fetch(new Request(input, init), env);

async function completeSplitSignalRoundSet(
	actionPath: string,
	headers: HeadersInit,
	hostId: string,
	playerIds: string[],
): Promise<{ phase: string; round: number; progress: string[] }> {
	const sendAction = async (playerId: string, type: string) => {
		const response = await app.request(
			actionPath,
			{
				method: 'POST',
				headers,
				body: JSON.stringify({ playerId, type }),
			},
			env,
		);
		return (await response.json()) as {
			state: { phase: string; round: number; progress: string[] };
		};
	};

	await sendAction(hostId, 'start');
	let state: { phase: string; round: number; progress: string[] } | undefined;
	for (let round = 1; round <= 3; round += 1) {
		for (let attempt = 0; attempt < playerIds.length * 2; attempt += 1) {
			state = (
				await sendAction(playerIds[attempt % playerIds.length], 'repair')
			).state;
			if (state.phase !== 'active') break;
		}
		if (round < 3) {
			state = (await sendAction(hostId, 'next-round')).state;
		}
	}

	return state!;
}

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

		const finalState = await completeSplitSignalRoundSet(
			actionPath,
			jsonHeaders,
			created.playerId,
			[created.playerId, joined.playerId],
		);
		expect(finalState).toMatchObject({ phase: 'complete', round: 3 });
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

		const finalState = await completeSplitSignalRoundSet(
			actionPath,
			jsonHeaders,
			created.playerId,
			[created.playerId, joined.playerId],
		);
		expect(finalState).toMatchObject({ phase: 'complete', round: 3 });

		const stopResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'stop' }),
			},
			env,
		);
		const stopped = (await stopResponse.json()) as {
			state: { phase: string };
		};
		expect(stopped.state.phase).toBe('stopped');

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

	it('starts a three-round repair with complementary private clues', async () => {
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

		const startResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'start' }),
			},
			env,
		);
		const started = (await startResponse.json()) as {
			state: {
				phase: string;
				round: number;
				totalRounds: number;
				stability: number;
				maximumStability: number;
				players: Array<{
					id: string;
					controlledNodeId?: string;
				}>;
				you: { clue: string; controlledNodeId: string };
			};
		};
		const buddyStateResponse = await app.request(
			`/prototype/split-signal/sessions/${created.state.code}?playerId=${joined.playerId}`,
			undefined,
			env,
		);
		const buddyState = (await buddyStateResponse.json()) as {
			state: {
				players: Array<{
					id: string;
					controlledNodeId?: string;
				}>;
				you: { clue: string; controlledNodeId: string };
			};
		};

		expect(started.state).toMatchObject({
			phase: 'active',
			round: 1,
			totalRounds: 3,
			stability: 3,
			maximumStability: 3,
		});
		expect(started.state.you.clue).toContain('Round 1');
		expect(started.state.you.clue).toContain('private fragment');
		expect(started.state.you.clue).toContain('Ask');
		expect(buddyState.state.you.clue).toContain('Ask');
		expect(buddyState.state.you.clue).not.toEqual(started.state.you.clue);
		expect(
			started.state.players.find((player) => player.id === created.playerId),
		).toMatchObject({ controlledNodeId: started.state.you.controlledNodeId });
		expect(
			started.state.players.find((player) => player.id === joined.playerId)
				?.controlledNodeId,
		).toBeUndefined();
		expect(
			buddyState.state.players.find((player) => player.id === joined.playerId),
		).toMatchObject({
			controlledNodeId: buddyState.state.you.controlledNodeId,
		});
		expect(
			buddyState.state.players.find((player) => player.id === created.playerId)
				?.controlledNodeId,
		).toBeUndefined();
	});

	it('uses limited stability before revealing the first repaired round', async () => {
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
		const requestAction = async (playerId: string) => {
			const response = await app.request(
				actionPath,
				{
					method: 'POST',
					headers: jsonHeaders,
					body: JSON.stringify({ playerId, type: 'repair' }),
				},
				env,
			);
			return (await response.json()) as {
				state: {
					phase: string;
					progress: string[];
					stability: number;
					reveal?: { round: number; order: string[] };
				};
			};
		};

		await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({ playerId: created.playerId, type: 'start' }),
			},
			env,
		);

		const playerIds = [created.playerId, joined.playerId];
		const hostAttempt = await requestAction(created.playerId);
		let firstRepairer: string;
		if (hostAttempt.state.progress.length === 1) {
			firstRepairer = created.playerId;
			const wrongRepair = await requestAction(firstRepairer);
			expect(wrongRepair.state).toMatchObject({
				progress: expect.any(Array),
				stability: 2,
			});
		} else {
			expect(hostAttempt.state).toMatchObject({
				progress: [],
				stability: 2,
			});
			const buddyRepair = await requestAction(joined.playerId);
			expect(buddyRepair.state.progress).toHaveLength(1);
			firstRepairer = joined.playerId;
		}

		const finalRepair = await requestAction(
			playerIds.find((playerId) => playerId !== firstRepairer)!,
		);
		expect(finalRepair.state).toMatchObject({
			phase: 'round-reveal',
			reveal: { round: 1, order: expect.any(Array) },
		});
	});

	it('runs three short repaired rounds before the clean ending', async () => {
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
		const requestAction = async (playerId: string, type: string) => {
			const response = await app.request(
				actionPath,
				{
					method: 'POST',
					headers: jsonHeaders,
					body: JSON.stringify({ playerId, type }),
				},
				env,
			);
			return (await response.json()) as {
				state: { phase: string; round: number; progress: string[] };
			};
		};
		const playerIds = [created.playerId, joined.playerId];
		const repairRound = async () => {
			let state:
				{ phase: string; round: number; progress: string[] } | undefined;
			for (let attempt = 0; attempt < 4; attempt += 1) {
				const repaired = await requestAction(
					playerIds[attempt % playerIds.length],
					'repair',
				);
				state = repaired.state;
				if (state.phase !== 'active') break;
			}
			return state!;
		};

		await requestAction(created.playerId, 'start');
		const firstReveal = await repairRound();
		expect(firstReveal).toMatchObject({ phase: 'round-reveal', round: 1 });

		const secondRound = await requestAction(created.playerId, 'next-round');
		expect(secondRound.state).toMatchObject({
			phase: 'active',
			round: 2,
			progress: [],
		});
		const secondReveal = await repairRound();
		expect(secondReveal).toMatchObject({ phase: 'round-reveal', round: 2 });

		await requestAction(created.playerId, 'next-round');
		const finalState = await repairRound();
		expect(finalState).toMatchObject({ phase: 'complete', round: 3 });

		const replayState = await requestAction(created.playerId, 'play-again');
		expect(replayState.state).toMatchObject({
			phase: 'active',
			round: 1,
			progress: [],
		});
	});

	it('sends pings that focus a teammate or signal', async () => {
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
		const teammatePingResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({
					playerId: created.playerId,
					type: 'ping',
					targetPlayerId: joined.playerId,
				}),
			},
			env,
		);
		const teammatePing = (await teammatePingResponse.json()) as {
			state: { events: Array<{ kind: string; message: string }> };
		};
		expect(teammatePing.state.events.at(-1)).toMatchObject({
			kind: 'ping',
			message: 'Host pinged Buddy.',
		});

		const signalPingResponse = await app.request(
			actionPath,
			{
				method: 'POST',
				headers: jsonHeaders,
				body: JSON.stringify({
					playerId: created.playerId,
					type: 'ping',
					targetNodeId: 'violet',
				}),
			},
			env,
		);
		const signalPing = (await signalPingResponse.json()) as {
			state: { events: Array<{ kind: string; message: string }> };
		};
		expect(signalPing.state.events.at(-1)).toMatchObject({
			kind: 'ping',
			message: 'Host pinged the Violet coil.',
		});
	});
});
