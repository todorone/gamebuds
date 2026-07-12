import Phaser from 'phaser';

import type { GameHandle } from '../../catalog/types';
import { SplitSignalScene } from './split-signal-scene';

export function mount(container: HTMLElement): GameHandle {
	const game = new Phaser.Game({
		type: Phaser.AUTO,
		parent: container,
		backgroundColor: '#0b1020',
		scale: {
			mode: Phaser.Scale.RESIZE,
			autoCenter: Phaser.Scale.CENTER_BOTH,
			width: window.innerWidth,
			height: window.innerHeight,
		},
		scene: [SplitSignalScene],
	});

	const handleResize = (): void => {
		game.scale.resize(window.innerWidth, window.innerHeight);
	};
	window.addEventListener('resize', handleResize);

	return {
		destroy(): void {
			window.removeEventListener('resize', handleResize);
			game.destroy(true);
		},
	};
}
