import type {
	CommonPulseJoinResponse,
	CommonPulseLogoutResponse,
	CommonPulseResponse,
	CommonPulseState,
} from './types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';
const route = `${apiUrl}/prototype/common-pulse`;

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

export async function createCommonPulseSession(
	name: string,
): Promise<CommonPulseJoinResponse> {
	return request<CommonPulseJoinResponse>('/sessions', {
		method: 'POST',
		body: JSON.stringify({ name }),
	});
}

export async function joinCommonPulseSession(
	code: string,
	name: string,
): Promise<CommonPulseJoinResponse> {
	return request<CommonPulseJoinResponse>(
		`/sessions/${encodeURIComponent(code)}/players`,
		{
			method: 'POST',
			body: JSON.stringify({ name }),
		},
	);
}

export async function getCommonPulseState(
	code: string,
	playerId: string,
): Promise<CommonPulseState> {
	const response = await request<CommonPulseResponse>(
		`/sessions/${encodeURIComponent(code)}?playerId=${encodeURIComponent(playerId)}`,
	);
	return response.state;
}

export async function startCommonPulse(
	code: string,
	playerId: string,
): Promise<CommonPulseState> {
	return sendCommonPulseAction(code, { playerId, type: 'start' });
}

export async function setCommonPulseChannel(
	code: string,
	playerId: string,
	held: boolean,
): Promise<CommonPulseState> {
	return sendCommonPulseAction(code, { playerId, type: 'channel', held });
}

export async function sendCommonPulseEmote(
	code: string,
	playerId: string,
	emote: string,
): Promise<CommonPulseState> {
	return sendCommonPulseAction(code, { playerId, type: 'emote', emote });
}

export async function restartCommonPulse(
	code: string,
	playerId: string,
): Promise<CommonPulseState> {
	return sendCommonPulseAction(code, { playerId, type: 'again' });
}

export async function logoutCommonPulseSession(
	code: string,
	playerId: string,
): Promise<void> {
	await request<CommonPulseLogoutResponse>(
		`/sessions/${encodeURIComponent(code)}/actions`,
		{
			method: 'POST',
			body: JSON.stringify({ playerId, type: 'logout' }),
		},
	);
}

async function sendCommonPulseAction(
	code: string,
	payload: {
		playerId: string;
		type: 'start' | 'channel' | 'emote' | 'again';
		held?: boolean;
		emote?: string;
	},
): Promise<CommonPulseState> {
	const response = await request<CommonPulseResponse>(
		`/sessions/${encodeURIComponent(code)}/actions`,
		{
			method: 'POST',
			body: JSON.stringify(payload),
		},
	);
	return response.state;
}
