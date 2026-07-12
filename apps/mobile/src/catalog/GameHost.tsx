import { useEffect, useRef } from 'react';

import { resolveGame } from './registry';
import type { GameHandle } from './types';

interface GameHostProps {
	gameId: string;
	onExit: () => void;
}

export function GameHost({ gameId, onExit }: GameHostProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const entry = resolveGame(gameId);

	useEffect(() => {
		const container = containerRef.current;
		if (!entry || !container) {
			return;
		}

		let cancelled = false;
		let handle: GameHandle | undefined;

		void entry.load().then((module) => {
			if (cancelled) {
				return;
			}
			handle = module.mount(container, { exit: onExit });
		});

		return () => {
			cancelled = true;
			handle?.destroy();
		};
	}, [entry, onExit]);

	if (!entry) {
		return (
			<main className="catalog">
				<p>This game isn&apos;t available.</p>
				<button type="button" onClick={onExit}>
					Back to Catalog
				</button>
			</main>
		);
	}

	return <div ref={containerRef} className="game-host" />;
}
