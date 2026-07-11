import Phaser from 'phaser';

import {
	createSplitSignalSession,
	getSplitSignalState,
	joinSplitSignalSession,
	logoutSplitSignalSession,
	sendSplitSignalAction,
} from './relay';
import type { SplitSignalNodeId, SplitSignalState } from './types';

type Variant = 'A' | 'B' | 'C';

const VARIANTS: Array<{ key: Variant; name: string }> = [
	{ key: 'A', name: 'Signal deck' },
	{ key: 'B', name: 'Systems map' },
	{ key: 'C', name: 'Social log' },
];

const NODE_COLORS: Record<SplitSignalNodeId, number> = {
	amber: 0xfbbf24,
	violet: 0xa78bfa,
	cyan: 0x22d3ee,
	rose: 0xfb7185,
};

const NODE_GLOW_COLORS: Record<SplitSignalNodeId, number> = {
	amber: 0x78350f,
	violet: 0x4c1d95,
	cyan: 0x164e63,
	rose: 0x881337,
};

export class SplitSignalScene extends Phaser.Scene {
	private state?: SplitSignalState;
	private roomCode?: string;
	private playerId?: string;
	private pollTimer?: number;
	private errorMessage?: string;
	private variant: Variant = this.getVariant();
	private lastRenderKey = '';

	public constructor() {
		super('split-signal-prototype');
	}

	public create(): void {
		this.scale.on(Phaser.Scale.Events.RESIZE, this.redraw, this);
		this.input.keyboard?.on('keydown-LEFT', () => this.changeVariant(-1));
		this.input.keyboard?.on('keydown-RIGHT', () => this.changeVariant(1));
		this.redraw();
		void this.connectFromUrl();
	}

	public shutdown(): void {
		if (this.pollTimer) {
			window.clearInterval(this.pollTimer);
		}
	}

	private getVariant(): Variant {
		const value = new URLSearchParams(window.location.search).get('variant');
		return value === 'B' || value === 'C' ? value : 'A';
	}

	private getParams(): URLSearchParams {
		return new URLSearchParams(window.location.search);
	}

	private redraw = (): void => {
		this.children.removeAll(true);
		this.lastRenderKey = '';

		if (!this.roomCode || !this.playerId || !this.state) {
			this.drawLanding();
			return;
		}

		this.drawState(this.state);
	};

	private async connectFromUrl(): Promise<void> {
		const params = this.getParams();
		const room = params.get('room')?.toUpperCase();
		const player = params.get('player');
		const name = params.get('name')?.trim() || 'Player';

		if (!room && !params.has('host')) {
			return;
		}

		try {
			if (!room && params.has('host')) {
				const response = await createSplitSignalSession(name);
				this.roomCode = response.state.code;
				this.playerId = response.playerId;
				this.state = response.state;
				this.replaceSessionUrl(response.state.code, response.playerId);
			} else if (room && !player) {
				const response = await joinSplitSignalSession(room, name);
				this.roomCode = room;
				this.playerId = response.playerId;
				this.state = response.state;
				this.replaceSessionUrl(room, response.playerId);
			} else if (room && player) {
				this.roomCode = room;
				this.playerId = player;
				this.state = await getSplitSignalState(room, player);
			}

			this.errorMessage = undefined;
			this.redraw();
			this.startPolling();
		} catch (error) {
			this.errorMessage =
				error instanceof Error
					? error.message
					: 'Could not reach the prototype relay.';
			this.redraw();
		}
	}

	private replaceSessionUrl(roomCode: string, playerId: string): void {
		const params = this.getParams();
		params.set('room', roomCode);
		params.set('player', playerId);
		params.delete('host');
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}?${params.toString()}`,
		);
	}

	private startPolling(): void {
		if (this.pollTimer) {
			window.clearInterval(this.pollTimer);
		}
		this.pollTimer = window.setInterval(() => void this.refreshState(), 700);
	}

	private async refreshState(): Promise<void> {
		if (!this.roomCode || !this.playerId) {
			return;
		}

		try {
			const nextState = await getSplitSignalState(this.roomCode, this.playerId);
			const nextRenderKey = JSON.stringify(nextState);
			if (nextRenderKey !== this.lastRenderKey) {
				this.state = nextState;
				this.errorMessage = undefined;
				this.redraw();
			}
		} catch (error) {
			this.errorMessage =
				error instanceof Error ? error.message : 'Connection lost.';
			this.redraw();
		}
	}

	private async sendAction(type: 'start' | 'ping' | 'repair'): Promise<void> {
		if (!this.roomCode || !this.playerId) {
			return;
		}

		try {
			this.state = await sendSplitSignalAction(
				this.roomCode,
				this.playerId,
				type,
			);
			this.errorMessage = undefined;
			this.redraw();
		} catch (error) {
			this.errorMessage =
				error instanceof Error ? error.message : 'Action failed.';
			this.redraw();
		}
	}

	private async logout(): Promise<void> {
		if (!this.roomCode || !this.playerId) {
			return;
		}

		try {
			await logoutSplitSignalSession(this.roomCode, this.playerId);
			if (this.pollTimer) {
				window.clearInterval(this.pollTimer);
				this.pollTimer = undefined;
			}
			this.roomCode = undefined;
			this.playerId = undefined;
			this.state = undefined;
			this.errorMessage = undefined;
			this.clearSessionUrl();
			this.redraw();
		} catch (error) {
			this.errorMessage =
				error instanceof Error ? error.message : 'Could not log out.';
			this.redraw();
		}
	}

	private clearSessionUrl(): void {
		const params = this.getParams();
		params.delete('room');
		params.delete('player');
		params.delete('host');
		params.delete('name');
		const query = params.toString();
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}${query ? `?${query}` : ''}`,
		);
	}

	private drawLanding(): void {
		const width = this.scale.width;
		const height = this.scale.height;
		this.add.rectangle(0, 0, width, height, 0x0b1020).setOrigin(0);
		this.add.circle(width * 0.78, height * 0.14, 130, 0x192449, 0.7);
		this.add.circle(width * 0.18, height * 0.8, 170, 0x122b3b, 0.6);

		this.add
			.text(28, 34, 'GAMEBUDS / PROTOTYPE', this.textStyle(15, '#8fa4c7'))
			.setAlpha(0.85);
		this.add.text(28, 82, 'SPLIT SIGNAL', this.textStyle(42, '#f8fafc', true));
		this.add.text(
			28,
			145,
			'Everyone sees one fragment.\nRepair the system by sharing what you know.',
			this.textStyle(21, '#cbd5e1', false, Math.min(500, width - 56)),
		);

		this.add.text(
			28,
			height * 0.5,
			'CHEAPEST NETWORKED TEST\n2–4 Players • no accounts • no speech required',
			this.textStyle(15, '#8fa4c7', true),
		);
		this.makeButton(
			28,
			height - 180,
			Math.min(width - 56, 360),
			56,
			'Host a Game Session',
			() => {
				const name = window.prompt('Your temporary Session Identity', 'Host');
				if (!name) return;
				const params = this.getParams();
				params.set('host', '1');
				params.set('name', name.trim());
				window.location.search = params.toString();
			},
			0x2563eb,
		);
		this.makeButton(
			28,
			height - 110,
			Math.min(width - 56, 360),
			56,
			'Join with a room code',
			() => {
				const code = window.prompt('Room code from the Host');
				const name = window.prompt('Your temporary Session Identity', 'Player');
				if (!code || !name) return;
				const params = this.getParams();
				params.set('room', code.trim().toUpperCase());
				params.set('name', name.trim());
				window.location.search = params.toString();
			},
			0x334155,
		);

		if (this.errorMessage) {
			this.add.text(
				28,
				height - 42,
				this.errorMessage,
				this.textStyle(14, '#fda4af', false, width - 56),
			);
		}
	}

	private drawState(state: SplitSignalState): void {
		const renderKey = JSON.stringify(state);
		this.lastRenderKey = renderKey;
		this.add
			.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1020)
			.setOrigin(0);
		this.drawHeader(state);

		if (this.variant === 'A') this.drawSignalDeck(state);
		if (this.variant === 'B') this.drawSystemsMap(state);
		if (this.variant === 'C') this.drawSocialLog(state);

		this.drawVariantSwitcher();
	}

	private drawHeader(state: SplitSignalState): void {
		const width = this.scale.width;
		this.add.text(24, 18, 'SPLIT SIGNAL', this.textStyle(20, '#f8fafc', true));
		this.add.text(
			24,
			48,
			'PROTOTYPE — throwaway observation build',
			this.textStyle(12, '#64748b'),
		);
		this.add
			.text(
				width - 24,
				22,
				`ROOM ${state.code}`,
				this.textStyle(16, '#fbbf24', true),
			)
			.setOrigin(1, 0);
		this.add
			.text(
				width - 24,
				48,
				`${state.players.length}/${state.maximumPlayers} PLAYERS`,
				this.textStyle(12, '#94a3b8'),
			)
			.setOrigin(1, 0);
	}

	private drawSignalDeck(state: SplitSignalState): void {
		const width = this.scale.width;
		const boardTop = 102;
		this.drawPanel(20, boardTop, width - 40, 150, 0x131d35);
		this.add.text(
			40,
			boardTop + 20,
			'YOUR PRIVATE SIGNAL',
			this.textStyle(12, '#8fa4c7', true),
		);
		this.add.text(
			40,
			boardTop + 48,
			state.you.clue,
			this.textStyle(23, '#f8fafc', true, width - 80),
		);
		this.drawSharedProgress(state, 40, boardTop + 178, width - 80);
		this.drawPlayers(state, 20, boardTop + 280, width - 40);
		this.drawActionPanel(state, 20, this.scale.height - 184, width - 40);
	}

	private drawSystemsMap(state: SplitSignalState): void {
		const width = this.scale.width;
		const height = this.scale.height;
		const centerX = width * 0.49;
		const centerY = Math.min(height * 0.48, 330);

		this.add.text(
			24,
			90,
			'THE SHARED SYSTEM',
			this.textStyle(12, '#8fa4c7', true),
		);
		this.add.text(
			24,
			114,
			'Watch the chain. Someone else holds the next signal.',
			this.textStyle(17, '#cbd5e1', false, width - 48),
		);
		this.drawPanel(20, 150, width - 40, 340, 0x111a2d);
		const radius = Math.min(115, width * 0.28);
		state.nodes.slice(0, state.players.length).forEach((node, index) => {
			const angle = (Math.PI * 2 * index) / state.players.length - Math.PI / 2;
			const x = centerX + Math.cos(angle) * radius;
			const y = centerY + Math.sin(angle) * radius;
			const active = state.progress.includes(node.id);
			this.add
				.circle(
					x,
					y,
					39,
					active ? NODE_COLORS[node.id] : NODE_GLOW_COLORS[node.id],
					1,
				)
				.setStrokeStyle(3, NODE_COLORS[node.id], 0.9);
			this.add
				.text(
					x,
					y - 8,
					`${index + 1}`,
					this.textStyle(18, active ? '#0b1020' : '#f8fafc', true),
				)
				.setOrigin(0.5);
			this.add
				.text(x, y + 52, node.label, this.textStyle(12, '#cbd5e1', true, 100))
				.setOrigin(0.5, 0);
		});
		this.add.text(
			40,
			440,
			`REPAIRED ${state.progress.length}/${state.players.length}`,
			this.textStyle(13, '#8fa4c7', true),
		);
		this.drawActionPanel(state, 20, height - 184, width - 40);
	}

	private drawSocialLog(state: SplitSignalState): void {
		const width = this.scale.width;
		const height = this.scale.height;
		this.add.text(
			24,
			96,
			'KEEP EACH OTHER IN THE LOOP',
			this.textStyle(12, '#8fa4c7', true),
		);
		this.add.text(
			24,
			120,
			'Pings are a nonverbal hint: point, react, ask for attention.',
			this.textStyle(17, '#cbd5e1', false, width - 48),
		);
		this.drawPanel(20, 172, width - 40, 176, 0x17152e);
		this.add.text(
			40,
			194,
			'YOUR FRAGMENT',
			this.textStyle(12, '#f0abfc', true),
		);
		this.add.text(
			40,
			224,
			state.you.clue,
			this.textStyle(24, '#f8fafc', true, width - 80),
		);
		this.drawPanel(20, 368, width - 40, Math.max(160, height - 580), 0x111a2d);
		this.add.text(
			40,
			390,
			'LIVE SOCIAL LOG',
			this.textStyle(12, '#8fa4c7', true),
		);
		state.events.slice(-6).forEach((event, index) => {
			const color =
				event.kind === 'ping'
					? '#f0abfc'
					: event.kind === 'mistake'
						? '#fda4af'
						: '#cbd5e1';
			this.add.text(
				40,
				420 + index * 24,
				`• ${event.message}`,
				this.textStyle(15, color, false, width - 80),
			);
		});
		this.drawActionPanel(state, 20, height - 184, width - 40);
	}

	private drawSharedProgress(
		state: SplitSignalState,
		x: number,
		y: number,
		width: number,
	): void {
		this.add.text(
			x,
			y,
			`SHARED REPAIR CHAIN  ${state.progress.length}/${state.players.length}`,
			this.textStyle(12, '#8fa4c7', true),
		);
		const gap = 8;
		const tileWidth = Math.max(
			56,
			(width - gap * (state.players.length - 1)) / state.players.length,
		);
		state.nodes.slice(0, state.players.length).forEach((node, index) => {
			const repaired = state.progress.includes(node.id);
			const tileX = x + index * (tileWidth + gap);
			this.drawPanel(
				tileX,
				y + 26,
				tileWidth,
				54,
				repaired ? NODE_COLORS[node.id] : NODE_GLOW_COLORS[node.id],
			);
			this.add
				.text(
					tileX + tileWidth / 2,
					y + 42,
					repaired ? '✓' : `${index + 1}`,
					this.textStyle(20, repaired ? '#0b1020' : '#cbd5e1', true),
				)
				.setOrigin(0.5);
			this.add
				.text(
					tileX + tileWidth / 2,
					y + 66,
					repaired ? 'stable' : 'waiting',
					this.textStyle(10, repaired ? '#0b1020' : '#94a3b8'),
				)
				.setOrigin(0.5);
		});
	}

	private drawPlayers(
		state: SplitSignalState,
		x: number,
		y: number,
		width: number,
	): void {
		this.add.text(x, y, 'WHO HOLDS WHAT', this.textStyle(12, '#8fa4c7', true));
		const gap = 8;
		const cardWidth =
			(width - gap * (state.players.length - 1)) / state.players.length;
		state.players.forEach((player, index) => {
			const cardX = x + index * (cardWidth + gap);
			const node = state.nodes.find(
				(item) => item.id === player.controlledNodeId,
			);
			this.drawPanel(
				cardX,
				y + 26,
				cardWidth,
				76,
				player.id === state.you.id ? 0x263554 : 0x172238,
			);
			this.add.circle(
				cardX + 18,
				y + 48,
				6,
				NODE_COLORS[player.controlledNodeId],
			);
			this.add.text(
				cardX + 32,
				y + 37,
				player.name,
				this.textStyle(13, '#f8fafc', true, cardWidth - 42),
			);
			this.add.text(
				cardX + 18,
				y + 62,
				node?.label ?? 'signal',
				this.textStyle(11, '#94a3b8', false, cardWidth - 28),
			);
		});
	}

	private drawActionPanel(
		state: SplitSignalState,
		x: number,
		y: number,
		width: number,
	): void {
		this.drawPanel(x, y, width, 152, 0x131d35);
		const isLobby = state.phase === 'lobby';
		const isComplete = state.phase === 'complete';
		if (isLobby) {
			this.add.text(
				x + 20,
				y + 18,
				`Waiting for ${state.minimumPlayers}–${state.maximumPlayers} Players`,
				this.textStyle(16, '#f8fafc', true),
			);
			this.add.text(
				x + 20,
				y + 46,
				'Share the room code. The Host starts when everyone is ready.',
				this.textStyle(13, '#94a3b8', false, width - 40),
			);
			if (state.you.isHost) {
				this.makeButton(
					x + 20,
					y + 86,
					width - 40,
					46,
					'Start the shared repair',
					() => void this.sendAction('start'),
					state.players.length >= state.minimumPlayers ? 0x2563eb : 0x334155,
				);
			}
			return;
		}

		if (isComplete) {
			this.add.text(
				x + 20,
				y + 18,
				'SYSTEM STABLE',
				this.textStyle(20, '#67e8f9', true),
			);
			this.add.text(
				x + 20,
				y + 50,
				'Who noticed the final signal first? Offer another round without prompting.',
				this.textStyle(14, '#cbd5e1', false, width - 40),
			);
			this.makeButton(
				x + 20,
				y + 86,
				width * 0.48,
				46,
				'Send a celebration ping',
				() => void this.sendAction('ping'),
				0x7c3aed,
			);
			this.makeButton(
				x + width * 0.52,
				y + 86,
				width * 0.48 - 20,
				46,
				'Finish & log out',
				() => void this.logout(),
				0x2563eb,
			);
			return;
		}

		const controlledNode = state.nodes.find(
			(node) => node.id === state.you.controlledNodeId,
		);
		this.add.text(
			x + 20,
			y + 16,
			`YOUR ACTION  •  ${controlledNode?.label ?? 'signal'}`,
			this.textStyle(13, '#8fa4c7', true),
		);
		this.add.text(
			x + 20,
			y + 42,
			`Mistakes ${state.mistakes}  •  every Player repairs one fragment`,
			this.textStyle(13, '#94a3b8'),
		);
		this.makeButton(
			x + 20,
			y + 84,
			width * 0.56,
			48,
			`Repair ${controlledNode?.label ?? 'signal'}`,
			() => void this.sendAction('repair'),
			NODE_COLORS[state.you.controlledNodeId],
		);
		this.makeButton(
			x + width * 0.56 + 32,
			y + 84,
			width * 0.44 - 52,
			48,
			'Ping',
			() => void this.sendAction('ping'),
			0x7c3aed,
		);

		if (this.errorMessage) {
			this.add.text(
				x + 20,
				y - 26,
				this.errorMessage,
				this.textStyle(13, '#fda4af', false, width - 40),
			);
		}
	}

	private drawVariantSwitcher(): void {
		const width = this.scale.width;
		const y = this.scale.height - 26;
		this.drawPanel(width / 2 - 132, y - 17, 264, 34, 0x020617);
		this.makeButton(
			width / 2 - 124,
			y - 13,
			30,
			26,
			'‹',
			() => this.changeVariant(-1),
			0x334155,
			20,
		);
		const current = VARIANTS.find((item) => item.key === this.variant)!;
		this.add
			.text(
				width / 2,
				y - 8,
				`${current.key} — ${current.name}`,
				this.textStyle(12, '#cbd5e1', true),
			)
			.setOrigin(0.5);
		this.makeButton(
			width / 2 + 94,
			y - 13,
			30,
			26,
			'›',
			() => this.changeVariant(1),
			0x334155,
			20,
		);
	}

	private changeVariant(direction: number): void {
		const currentIndex = VARIANTS.findIndex(
			(item) => item.key === this.variant,
		);
		const nextIndex =
			(currentIndex + direction + VARIANTS.length) % VARIANTS.length;
		this.variant = VARIANTS[nextIndex].key;
		const params = this.getParams();
		params.set('variant', this.variant);
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}?${params.toString()}`,
		);
		this.redraw();
	}

	private makeButton(
		x: number,
		y: number,
		width: number,
		height: number,
		label: string,
		onClick: () => void,
		color: number,
		fontSize = 15,
	): void {
		const button = this.add
			.rectangle(x, y, width, height, color, 1)
			.setOrigin(0)
			.setInteractive({ useHandCursor: true });
		button.on(Phaser.Input.Events.POINTER_DOWN, onClick);
		button.on(Phaser.Input.Events.POINTER_OVER, () => button.setAlpha(0.82));
		button.on(Phaser.Input.Events.POINTER_OUT, () => button.setAlpha(1));
		this.add
			.text(
				x + width / 2,
				y + height / 2,
				label,
				this.textStyle(fontSize, '#f8fafc', true, width - 18),
			)
			.setOrigin(0.5);
	}

	private drawPanel(
		x: number,
		y: number,
		width: number,
		height: number,
		color: number,
	): void {
		this.add
			.rectangle(x, y, width, height, color, 1)
			.setOrigin(0)
			.setStrokeStyle(1, 0x334155, 0.8);
	}

	private textStyle(
		fontSize: number,
		color: string,
		bold = false,
		wordWrapWidth?: number,
	): Phaser.Types.GameObjects.Text.TextStyle {
		return {
			color,
			fontFamily: 'system-ui, sans-serif',
			fontSize: `${fontSize}px`,
			fontStyle: bold ? '700' : '400',
			wordWrap: wordWrapWidth ? { width: wordWrapWidth } : undefined,
			lineSpacing: 5,
		};
	}
}
