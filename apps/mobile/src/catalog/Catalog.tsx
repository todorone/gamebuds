import { listCatalog } from './registry';

interface CatalogProps {
	onSelect: (gameId: string) => void;
}

export function Catalog({ onSelect }: CatalogProps) {
	const entries = listCatalog();

	return (
		<main className="catalog">
			<h1>Gamebuds</h1>
			{entries.length === 0 ? (
				<p className="catalog-empty">No games yet. Check back soon.</p>
			) : (
				<ul className="catalog-list">
					{entries.map(({ manifest }) => (
						<li key={manifest.id}>
							<button
								type="button"
								className="catalog-entry"
								onClick={() => onSelect(manifest.id)}
							>
								<span className="catalog-entry-name">
									{manifest.name}
									{manifest.status === 'prototype' && (
										<span className="catalog-entry-badge">Prototype</span>
									)}
								</span>
								<span className="catalog-entry-tagline">
									{manifest.tagline}
								</span>
								<span className="catalog-entry-players">
									{manifest.minPlayers}–{manifest.maxPlayers} Players
								</span>
							</button>
						</li>
					))}
				</ul>
			)}
		</main>
	);
}
