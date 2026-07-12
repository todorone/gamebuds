import { describe, expect, it } from 'vitest';

import { listEntries, resolveEntry } from './registry';
import type { CatalogEntry, GameModule } from './types';

const load = (): Promise<GameModule> =>
	Promise.resolve({ mount: () => ({ destroy: () => {} }) });

const catalogGame: CatalogEntry = {
	manifest: {
		id: 'catalog-game',
		name: 'Catalog Game',
		tagline: 'A shipped game.',
		minPlayers: 2,
		maxPlayers: 4,
		status: 'catalog',
	},
	load,
};

const prototypeGame: CatalogEntry = {
	manifest: {
		id: 'prototype-game',
		name: 'Prototype Game',
		tagline: 'A throwaway learning vehicle.',
		minPlayers: 2,
		maxPlayers: 4,
		status: 'prototype',
	},
	load,
};

const entries = [catalogGame, prototypeGame];

describe('listEntries', () => {
	it('lists catalog games in every build', () => {
		expect(listEntries(entries, false)).toEqual([catalogGame]);
		expect(listEntries(entries, true)).toContainEqual(catalogGame);
	});

	it('lists prototypes only in a development build', () => {
		expect(listEntries(entries, false)).not.toContainEqual(prototypeGame);
		expect(listEntries(entries, true)).toContainEqual(prototypeGame);
	});
});

describe('resolveEntry', () => {
	it('resolves a catalog game by id', () => {
		expect(resolveEntry(entries, 'catalog-game')).toBe(catalogGame);
	});

	it('resolves a prototype by id regardless of build', () => {
		expect(resolveEntry(entries, 'prototype-game')).toBe(prototypeGame);
	});

	it('returns nothing for an unknown id', () => {
		expect(resolveEntry(entries, 'unknown-game')).toBeUndefined();
	});
});
