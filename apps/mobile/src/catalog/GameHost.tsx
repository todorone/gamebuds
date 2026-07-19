import { useEffect, useRef, useState } from 'react';

import { resolveGame } from './registry';
import type { GameHandle } from './types';

interface GameHostProps {
	gameId: string;
	onExit: () => void;
}

export function GameHost({ gameId, onExit }: GameHostProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [loadError, setLoadError] = useState<string>();
	const [isLoading, setIsLoading] = useState(true);
	const entry = resolveGame(gameId);

	useEffect(() => {
		const container = containerRef.current;
		if (!entry || !container) {
			return;
		}

		let cancelled = false;
		let handle: GameHandle | undefined;
		setIsLoading(true);
		setLoadError(undefined);

		void entry
			.load()
			.then((module) => {
				if (cancelled) return;
				handle = module.mount(container, { exit: onExit });
				setIsLoading(false);
			})
			.catch(() => {
				if (cancelled) return;
				setLoadError(
					'Could not open this Game Session. Check your connection and try again.',
				);
				setIsLoading(false);
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

	if (loadError) {
		return (
			<main className="catalog">
				<p role="alert">{loadError}</p>
				<button type="button" onClick={() => window.location.reload()}>
					Try again
				</button>
				<button type="button" onClick={onExit}>
					Back to Catalog
				</button>
			</main>
		);
	}

	return (
		<div className="game-host">
			{isLoading && <p className="game-host-loading">Opening Game Session…</p>}
			<div ref={containerRef} />
		</div>
	);
}
