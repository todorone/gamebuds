import { describe, expect, it } from 'vitest';

import { buildGameUrl, buildHostUrl, buildInvitationUrl } from './session-url';

describe('Session Invitation URLs', () => {
	it('keeps the Player identity out of the shareable invitation', () => {
		expect(buildInvitationUrl('https://play.gamebuds.test', 'ABC123')).toBe(
			'https://play.gamebuds.test/?room=ABC123',
		);
	});

	it('preserves the Host identity only in the Host return URL', () => {
		expect(buildHostUrl('ABC123', 'player-host')).toBe(
			'/?host=1&room=ABC123&player=player-host',
		);
	});

	it('sends a joined Player straight to the selected Game Session', () => {
		expect(buildGameUrl('ABC123', 'player-2')).toBe(
			'/games/split-signal?room=ABC123&player=player-2',
		);
	});
});
