import { Catalog } from './catalog/Catalog';
import { GameHost } from './catalog/GameHost';
import { navigate, useLocation } from './router';

const GAME_PATH = /^\/games\/([^/]+)\/?$/;

export function getGameId(location: {
	pathname: string;
	search: string;
}): string | undefined {
	const match = GAME_PATH.exec(location.pathname);
	if (match) {
		return decodeURIComponent(match[1]);
	}

	const invitation = new URLSearchParams(location.search);
	if (
		location.pathname === '/' &&
		(invitation.has('room') || invitation.has('host'))
	) {
		return 'split-signal';
	}
}

export function App() {
	const location = useLocation();
	const gameId = getGameId(location);

	if (gameId) {
		return <GameHost gameId={gameId} onExit={() => navigate('/')} />;
	}

	return <Catalog onSelect={(gameId) => navigate(`/games/${gameId}`)} />;
}
