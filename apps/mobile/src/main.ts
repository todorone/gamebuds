import Phaser from 'phaser';

import { GameScene } from './scenes/game-scene';
import './style.css';

new Phaser.Game({
	type: Phaser.AUTO,
	parent: 'game',
	backgroundColor: '#111827',
	scale: {
		mode: Phaser.Scale.RESIZE,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: window.innerWidth,
		height: window.innerHeight,
	},
	scene: [GameScene],
});
