import type {
	SplitSignalActionType,
	SplitSignalJoinResponse,
	SplitSignalLogoutResponse,
	SplitSignalPingTarget,
	SplitSignalResponse,
	SplitSignalState,
} from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
const route = `${apiUrl}/prototype/split-signal`;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(`${route}${path}`, {
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
	const body = (await response.json()) as T & { error?: string };
	if (!response.ok) {
		throw new Error(
			body.error ?? `Prototype relay returned ${response.status}`,
		);
	}
	return body;
}

export async function createSplitSignalSession(
	name: string,
): Promise<SplitSignalJoinResponse> {
	return request<SplitSignalJoinResponse>('/sessions', {
		method: 'POST',
		body: JSON.stringify({ name }),
	});
}

export async function joinSplitSignalSession(
	code: string,
	name: string,
): Promise<SplitSignalJoinResponse> {
	return request<SplitSignalJoinResponse>(
		`/sessions/${encodeURIComponent(code)}/players`,
		{
			method: 'POST',
			body: JSON.stringify({ name }),
		},
	);
}

export async function getSplitSignalState(
	code: string,
	playerId: string,
): Promise<SplitSignalState> {
	const response = await request<SplitSignalResponse>(
		`/sessions/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`,
	);
	return response.state;
}

export async function sendSplitSignalAction(
	code: string,
	playerId: string,
	type: SplitSignalActionType,
	target?: SplitSignalPingTarget,
): Promise<SplitSignalState> {
	const response = await request<SplitSignalResponse>(
		`/sessions/${encodeURIComponent(code)}/actions`,
		{
			method: 'POST',
			body: JSON.stringify({ playerId, type, ...target }),
		},
	);
	return response.state;
}

export async function logoutSplitSignalSession(
	code: string,
	playerId: string,
): Promise<void> {
	await request<SplitSignalLogoutResponse>(
		`/sessions/${encodeURIComponent(code)}/actions`,
		{
			method: 'POST',
			body: JSON.stringify({ playerId, type: 'logout' }),
		},
	);
}
