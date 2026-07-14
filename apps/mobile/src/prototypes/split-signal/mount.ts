import Phaser from 'phaser';

import type { GameHandle } from '../../catalog/types';
import { RENDER_DENSITY } from '../../render-density';
import { SplitSignalScene } from './split-signal-scene';

export function mount(container: HTMLElement): GameHandle {
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: container,
		backgroundColor: '#0b1020',
		scale: {
			mode: Phaser.Scale.NONE,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: window.innerWidth * RENDER_DENSITY,
			height: window.innerHeight * RENDER_DENSITY,
			zoom: 1 / RENDER_DENSITY,
		},
		scene: [SplitSignalScene],
	});

	const handleResize = (): void => {
		game.scale.resize(
			window.innerWidth * RENDER_DENSITY,
			window.innerHeight * RENDER_DENSITY,
		);
	};
	window.addEventListener('resize', handleResize);

	return {
		destroy(): void {
			window.removeEventListener('resize', handleResize);
			game.destroy(true);
		},
	};
}
