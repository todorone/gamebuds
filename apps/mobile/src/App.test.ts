import { describe, expect, it } from 'vitest';

import { getGameId } from './App';

describe('getGameId', () => {
	it('leaves a root-level Session Invitation for the Session flow', () => {
		expect(
			getGameId({
				pathname: '/',
				search: '?room=ABC123&name=Guest',
			}),
		).toBeUndefined();
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
