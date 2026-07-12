import { describe, expect, it, vi } from 'vitest';

describe('logicalViewport', () => {
	it('keeps the Phaser scale dimensions in logical pixels', async () => {
		vi.stubGlobal('window', { devicePixelRatio: 1 });
		const { logicalViewport } = await import('./render-density');

		expect(logicalViewport({ width: 1280, height: 720 })).toEqual({
			width: 1280,
			height: 720,
		});
	});
});
