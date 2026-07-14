import { splitSignalManifest } from '../prototypes/split-signal/manifest';
import type { CatalogEntry } from './types';

export const catalogEntries: CatalogEntry[] = [
	{
		manifest: splitSignalManifest,
		load: () => import('../prototypes/split-signal/mount'),
	},
];

export function listEntries(
	entries: CatalogEntry[],
	isDevelopment: boolean,
): CatalogEntry[] {
	return entries.filter(
		(entry) =>
			entry.manifest.status === 'catalog' ||
			(entry.manifest.status === 'prototype' && isDevelopment),
	);
}

export function resolveEntry(
	entries: CatalogEntry[],
	id: string,
): CatalogEntry | undefined {
	return entries.find((entry) => entry.manifest.id === id);
}

export function listCatalog(): CatalogEntry[] {
	return listEntries(catalogEntries, import.meta.env.DEV);
}

export function resolveGame(id: string): CatalogEntry | undefined {
	return resolveEntry(catalogEntries, id);
}
