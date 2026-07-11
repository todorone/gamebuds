import Phaser from 'phaser';

import { SplitSignalScene } from './prototypes/split-signal/split-signal-scene';
import './style.css';

new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'game',
	backgroundColor: '#0b1020',
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: window.innerWidth,
		height: window.innerHeight,
	},
	scene: [SplitSignalScene],
});
