import { Catalog } from './catalog/Catalog';
import { GameHost } from './catalog/GameHost';
import { navigate, useLocation } from './router';

const GAME_PATH = /^\/games\/([^/]+)\/?$/;

export function App() {
	const location = useLocation();
	const match = GAME_PATH.exec(location.pathname);

	if (match) {
		return (
			<GameHost
				gameId={decodeURIComponent(match[1])}
				onExit={() => navigate('/')}
			/>
		);
	}

	return <Catalog onSelect={(gameId) => navigate(`/games/${gameId}`)} />;
}
