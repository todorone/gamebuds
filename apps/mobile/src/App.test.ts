import { describe, expect, it } from 'vitest';

import { getGameId } from './App';

describe('getGameId', () => {
	it('opens Split Signal for a root-level Session Invitation', () => {
		expect(
			getGameId({
				pathname: '/',
				search: '?room=ABC123&name=Guest',
			}),
		).toBe('split-signal');
	});

	it('opens the requested game for a catalog game path', () => {
		expect(getGameId({ pathname: '/games/split-signal', search: '' })).toBe(
			'split-signal',
		);
	});

	it('leaves the Catalog at the root without an invitation', () => {
		expect(getGameId({ pathname: '/', search: '' })).toBeUndefined();
	});
});
