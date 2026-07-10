import Phaser from 'phaser';

const TARGET_RADIUS = 42;
const TARGET_COLORS = [0x22d3ee, 0xa78bfa, 0xf472b6, 0xfbbf24];

export class GameScene extends Phaser.Scene {
	private score = 0;
	private scoreLabel?: Phaser.GameObjects.Text;
	private promptLabel?: Phaser.GameObjects.Text;
	private target?: Phaser.GameObjects.Arc;

	public constructor() {
		super('game');
	}

	public create(): void {
		this.add
			.text(24, 32, 'GAMEBUDS2', {
				color: '#f9fafb',
				fontFamily: 'system-ui, sans-serif',
				fontSize: '24px',
				fontStyle: '700',
			})
			.setScrollFactor(0);

		this.scoreLabel = this.add
			.text(24, 68, 'Score 0', {
				color: '#cbd5e1',
				fontFamily: 'system-ui, sans-serif',
				fontSize: '18px',
			})
			.setScrollFactor(0);

		this.promptLabel = this.add
			.text(this.scale.width / 2, this.scale.height - 48, 'Tap the glowing bud', {
				color: '#e2e8f0',
				fontFamily: 'system-ui, sans-serif',
				fontSize: '18px',
			})
			.setOrigin(0.5);

		this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
		this.spawnTarget();
	}

	private readonly layout = (gameSize: Phaser.Structs.Size): void => {
		this.promptLabel?.setPosition(gameSize.width / 2, gameSize.height - 48);
	};

	private spawnTarget(): void {
		this.target?.destroy();

		const margin = TARGET_RADIUS + 20;
		const x = Phaser.Math.Between(margin, Math.max(margin, this.scale.width - margin));
		const y = Phaser.Math.Between(130, Math.max(130, this.scale.height - margin - 80));
		const color = Phaser.Utils.Array.GetRandom(TARGET_COLORS);

		this.target = this.add.circle(x, y, TARGET_RADIUS, color).setInteractive({ useHandCursor: true });
		this.tweens.add({
			targets: this.target,
			scale: { from: 0.85, to: 1.12 },
			duration: 650,
			yoyo: true,
			repeat: -1,
		});
		this.target.on(Phaser.Input.Events.POINTER_DOWN, this.hitTarget, this);
	}

	private hitTarget(): void {
		this.score += 1;
		this.scoreLabel?.setText(`Score ${this.score}`);
		this.cameras.main.flash(100, 255, 255, 255);
		this.spawnTarget();
	}
}
