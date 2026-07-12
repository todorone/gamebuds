import Phaser from 'phaser';

import { SplitSignalScene } from './prototypes/split-signal/split-signal-scene';
import { RENDER_DENSITY } from './render-density';
import './style.css';

const game = new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'game',
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

window.addEventListener('resize', () => {
	game.scale.resize(
		window.innerWidth * RENDER_DENSITY,
		window.innerHeight * RENDER_DENSITY,
	);
});
