export interface GameManifest {
	id: string;
	name: string;
	tagline: string;
	minPlayers: number;
	maxPlayers: number;
	status: 'catalog' | 'prototype';
}

export interface GameContext {
	exit(): void;
}

export interface GameHandle {
	destroy(): void;
}

export interface GameModule {
	mount(container: HTMLElement, ctx: GameContext): GameHandle;
}

export interface CatalogEntry {
	manifest: GameManifest;
	load: () => Promise<GameModule>;
}
