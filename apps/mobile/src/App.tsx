import { Catalog } from './catalog/Catalog';
import { GameHost } from './catalog/GameHost';
import { navigate, useLocation } from './router';
import { SessionFlow } from './session/SessionFlow';

const GAME_PATH = /^\/games\/([^/]+)\/?$/;

export function getGameId(location: {
	pathname: string;
	search: string;
}): string | undefined {
	const match = GAME_PATH.exec(location.pathname);
	if (match) {
		return decodeURIComponent(match[1]);
	}
}

export function App() {
	const location = useLocation();
	const gameId = getGameId(location);
	const invitation = new URLSearchParams(location.search);
	const roomCode = invitation.get('room')?.toUpperCase();
	const playerId = invitation.get('player') ?? undefined;
	const isHosting = invitation.has('host');

	if (gameId) {
		return <GameHost gameId={gameId} onExit={() => navigate('/')} />;
	}

	if (roomCode && playerId && !isHosting) {
		return <GameHost gameId="split-signal" onExit={() => navigate('/')} />;
	}

	if (roomCode || isHosting) {
		return (
			<SessionFlow
				roomCode={roomCode}
				playerId={playerId}
				isHosting={isHosting}
			/>
		);
	}

	return (
		<Catalog
			onHost={() => navigate('/?host=1')}
			onSelect={(selectedGameId) => navigate(`/games/${selectedGameId}`)}
		/>
	);
}
