export function buildInvitationUrl(origin: string, roomCode: string): string {
	return `${origin}/?room=${encodeURIComponent(roomCode)}`;
}

export function buildHostUrl(roomCode: string, playerId: string): string {
	const params = new URLSearchParams({
		host: '1',
		room: roomCode,
		player: playerId,
	});
	return `/?${params.toString()}`;
}

export function buildGameUrl(roomCode: string, playerId: string): string {
	const params = new URLSearchParams({ room: roomCode, player: playerId });
	return `/games/split-signal?${params.toString()}`;
}
