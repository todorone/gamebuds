import Phaser from 'phaser';

import {
	configureCameraForRenderDensity,
	logicalViewport,
	RENDER_DENSITY,
} from '../../render-density';
import {
	createCommonPulseSession,
	getCommonPulseState,
	joinCommonPulseSession,
	logoutCommonPulseSession,
	restartCommonPulse,
	sendCommonPulseEmote,
	setCommonPulseChannel,
	startCommonPulse,
} from './relay';
import type { CommonPulseState } from './types';

// PROTOTYPE scene for issue #9 (Common Pulse). Throwaway. Follows the Split
// Signal precedent: one relay-backed state machine (the logic prototype) plus
// three switchable UI variants (the UI prototype) on a single route, because
// the issue asks for the cheapest networked prototype inside this Capacitor +
// Phaser app and the sibling cooperative prototypes must stay comparable in the
// incomplete-block study (ADR 0002). The state is polled a few times a second;
// the displayed Pulse is animated every frame so the real-time complementary
// control still reads as real-time despite the polling transport.

type Variant = 'A' | 'B' | 'C';

const VARIANTS: Array<{ key: Variant; name: string }> = [
	{ key: 'A', name: 'Pulse orb' },
	{ key: 'B', name: 'Channel mixer' },
	{ key: 'C', name: 'Live waveform' },
];

const EMOTES = ['👏', '💪', '😅', '⚠️', '🎉', '👀'];
const POLL_INTERVAL_MS = 300;
const WAVEFORM_WINDOW_MS = 6000;
const WAVEFORM_SAMPLE_MS = 45;

function hex(value: string): number {
	return Number.parseInt(value.replace('#', ''), 16);
}

interface WaveformSample {
	t: number;
	level: number;
	center: number;
	width: number;
}

export class CommonPulseScene extends Phaser.Scene {
	private state?: CommonPulseState;
	private roomCode?: string;
	private playerId?: string;
	private pollTimer?: number;
	private errorMessage?: string;
	private variant: Variant = this.readVariant();
	private structureKey = '';

	private localHeld = false;
	private displayLevel = 50;
	private displayTarget = 50;
	private lastRound = 0;
	private waveform: WaveformSample[] = [];
	private lastSampleAt = 0;

	private staticGfx?: Phaser.GameObjects.Graphics;
	private dynGfx?: Phaser.GameObjects.Graphics;
	private hintText?: Phaser.GameObjects.Text;
	private timerText?: Phaser.GameObjects.Text;
	private stabilityText?: Phaser.GameObjects.Text;
	private logText?: Phaser.GameObjects.Text;
	private holdButton?: Phaser.GameObjects.Rectangle;

	public constructor() {
		super('common-pulse-prototype');
	}

	public create(): void {
		configureCameraForRenderDensity(this.cameras.main, this.scale);
		this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
		this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
		this.input.keyboard?.on('keydown-LEFT', () => this.changeVariant(-1));
		this.input.keyboard?.on('keydown-RIGHT', () => this.changeVariant(1));
		this.input.on(Phaser.Input.Events.POINTER_UP, this.releaseChannel, this);
		this.input.on(
			Phaser.Input.Events.POINTER_UP_OUTSIDE,
			this.releaseChannel,
			this,
		);
		this.rebuild();
		void this.connectFromUrl();

		if (import.meta.env.DEV) {
			(window as unknown as { __commonPulse?: unknown }).__commonPulse = {
				getState: () => this.state,
			};
		}
	}

	public update(_time: number, delta: number): void {
		if (!this.state || !this.dynGfx) {
			return;
		}

		const k = Math.min(1, delta / 110);
		this.displayLevel += (this.state.level - this.displayLevel) * k;
		this.displayTarget += (this.state.targetCenter - this.displayTarget) * k;

		if (this.state.round !== this.lastRound) {
			this.lastRound = this.state.round;
			this.waveform = [];
		}
		this.sampleWaveform();

		this.dynGfx.clear();
		this.drawSharedDynamic();
		if (this.state.phase === 'active' || this.state.phase === 'complete') {
			if (this.variant === 'A') this.drawOrbDynamic();
			if (this.variant === 'B') this.drawMixerDynamic();
			if (this.variant === 'C') this.drawWaveformDynamic();
		}
		this.updateDynamicText();

		if (this.holdButton) {
			this.holdButton.setAlpha(this.localHeld ? 1 : 0.62);
			this.holdButton.setScale(this.localHeld ? 0.97 : 1);
		}
	}

	public shutdown(): void {
		this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
		if (this.pollTimer) {
			window.clearInterval(this.pollTimer);
		}
		const holder = window as unknown as { __commonPulse?: unknown };
		if (holder.__commonPulse) {
			delete holder.__commonPulse;
		}
	}

	private handleResize = (): void => {
		configureCameraForRenderDensity(this.cameras.main, this.scale);
		this.rebuild();
	};

	// ---- connection & polling -------------------------------------------------

	private params(): URLSearchParams {
		return new URLSearchParams(window.location.search);
	}

	private readVariant(): Variant {
		const value = new URLSearchParams(window.location.search).get('variant');
		return value === 'B' || value === 'C' ? value : 'A';
	}

	private async connectFromUrl(): Promise<void> {
		const params = this.params();
		const room = params.get('room')?.toUpperCase();
		const player = params.get('player');
		const name = params.get('name')?.trim() || 'Player';

		if (!room && !params.has('host')) {
			return;
		}

		try {
			if (!room && params.has('host')) {
				const response = await createCommonPulseSession(name);
				this.roomCode = response.state.code;
				this.playerId = response.playerId;
				this.state = response.state;
				this.replaceSessionUrl(response.state.code, response.playerId);
			} else if (room && !player) {
				const response = await joinCommonPulseSession(room, name);
				this.roomCode = room;
				this.playerId = response.playerId;
				this.state = response.state;
				this.replaceSessionUrl(room, response.playerId);
			} else if (room && player) {
				this.roomCode = room;
				this.playerId = player;
				this.state = await getCommonPulseState(room, player);
			}

			this.errorMessage = undefined;
			this.rebuild();
			this.startPolling();
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Could not reach the relay.');
			this.rebuild();
		}
	}

	private replaceSessionUrl(roomCode: string, playerId: string): void {
		const params = this.params();
		params.set('room', roomCode);
		params.set('player', playerId);
		params.delete('host');
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}?${params.toString()}`,
		);
	}

	private clearSessionUrl(): void {
		const params = this.params();
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

	private startPolling(): void {
		if (this.pollTimer) {
			window.clearInterval(this.pollTimer);
		}
		this.pollTimer = window.setInterval(
			() => void this.refreshState(),
			POLL_INTERVAL_MS,
		);
	}

	private async refreshState(): Promise<void> {
		if (!this.roomCode || !this.playerId) {
			return;
		}
		try {
			this.state = await getCommonPulseState(this.roomCode, this.playerId);
			this.errorMessage = undefined;
			this.rebuildIfStructureChanged();
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Connection lost.');
		}
	}

	private async startGame(): Promise<void> {
		if (!this.roomCode || !this.playerId) return;
		try {
			this.state = await startCommonPulse(this.roomCode, this.playerId);
			this.rebuildIfStructureChanged();
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Could not start.');
		}
	}

	private async restart(): Promise<void> {
		if (!this.roomCode || !this.playerId) return;
		try {
			this.state = await restartCommonPulse(this.roomCode, this.playerId);
			this.rebuildIfStructureChanged();
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Could not restart.');
		}
	}

	private async emote(value: string): Promise<void> {
		if (!this.roomCode || !this.playerId) return;
		try {
			this.state = await sendCommonPulseEmote(
				this.roomCode,
				this.playerId,
				value,
			);
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Reaction failed.');
		}
	}

	private pressChannel(): void {
		if (!this.roomCode || !this.playerId || this.state?.phase !== 'active')
			return;
		if (this.localHeld) return;
		this.localHeld = true;
		void setCommonPulseChannel(this.roomCode, this.playerId, true).catch(
			() => {},
		);
	}

	private releaseChannel(): void {
		if (!this.localHeld) return;
		this.localHeld = false;
		if (!this.roomCode || !this.playerId || this.state?.phase !== 'active')
			return;
		void setCommonPulseChannel(this.roomCode, this.playerId, false).catch(
			() => {},
		);
	}

	private async logout(): Promise<void> {
		if (!this.roomCode || !this.playerId) return;
		try {
			await logoutCommonPulseSession(this.roomCode, this.playerId);
			if (this.pollTimer) {
				window.clearInterval(this.pollTimer);
				this.pollTimer = undefined;
			}
			this.roomCode = undefined;
			this.playerId = undefined;
			this.state = undefined;
			this.errorMessage = undefined;
			this.clearSessionUrl();
			this.rebuild();
		} catch (error) {
			this.errorMessage = this.messageFrom(error, 'Could not log out.');
			this.rebuild();
		}
	}

	private messageFrom(error: unknown, fallback: string): string {
		return error instanceof Error ? error.message : fallback;
	}

	// ---- structure (rebuilt only when the layout changes) ---------------------

	private currentStructureKey(): string {
		if (!this.state || !this.roomCode) {
			return `landing|${this.errorMessage ? 'err' : ''}`;
		}
		return `game|${this.state.phase}|${this.variant}|${this.state.players.length}`;
	}

	private rebuildIfStructureChanged(): void {
		if (this.currentStructureKey() !== this.structureKey) {
			this.rebuild();
		}
	}

	private rebuild(): void {
		this.children.removeAll(true);
		this.staticGfx = undefined;
		this.dynGfx = undefined;
		this.hintText = undefined;
		this.timerText = undefined;
		this.stabilityText = undefined;
		this.logText = undefined;
		this.holdButton = undefined;
		this.structureKey = this.currentStructureKey();

		const { width, height } = logicalViewport(this.scale);
		this.add.rectangle(0, 0, width, height, 0x0b1020).setOrigin(0);

		if (!this.state || !this.roomCode || !this.playerId) {
			this.buildLanding();
			return;
		}

		this.buildGame();
	}

	private buildLanding(): void {
		const { width, height } = logicalViewport(this.scale);
		this.add.circle(width * 0.8, height * 0.16, 130, 0x1f2a4d, 0.7);
		this.add.circle(width * 0.16, height * 0.82, 170, 0x11314a, 0.6);

		this.add
			.text(28, 34, 'GAMEBUDS / PROTOTYPE', this.textStyle(15, '#8fa4c7'))
			.setAlpha(0.85);
		this.add.text(28, 80, 'COMMON PULSE', this.textStyle(42, '#f8fafc', true));
		this.add.text(
			28,
			142,
			'One shared Pulse. Everyone holds a different channel.\nKeep it inside the moving band together.',
			this.textStyle(21, '#cbd5e1', false, Math.min(500, width - 56)),
		);
		this.add.text(
			28,
			height * 0.5,
			'REAL-TIME COMPLEMENTARY CONTROL\n2–4 Players • no accounts • no speech required',
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
				const params = this.params();
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
				const params = this.params();
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

	private buildGame(): void {
		const state = this.state!;
		const { width, height } = logicalViewport(this.scale);
		this.staticGfx = this.add.graphics();
		this.dynGfx = this.add.graphics();

		this.buildHeader(state);
		this.buildStabilityMeter();

		this.hintText = this.add.text(
			this.colX(),
			height - 236,
			'',
			this.textStyle(15, '#cbd5e1', false, this.colW()),
		);
		this.logText = this.add
			.text(width - 24, 118, '', {
				...this.textStyle(12, '#94a3b8', false, Math.min(240, width - 48)),
				align: 'right',
			})
			.setOrigin(1, 0);

		if (state.phase === 'lobby') this.buildLobby(state);
		if (state.phase === 'active') this.buildActiveControls(state);
		if (state.phase === 'complete') this.buildCompleteControls(state);

		this.buildVariantSwitcher();

		this.displayLevel = state.level;
		this.displayTarget = state.targetCenter;
		this.lastRound = state.round;
	}

	private buildHeader(state: CommonPulseState): void {
		const { width } = logicalViewport(this.scale);
		this.add.text(24, 18, 'COMMON PULSE', this.textStyle(20, '#f8fafc', true));
		this.add.text(
			24,
			48,
			'PROTOTYPE — throwaway observation build',
			this.textStyle(12, '#64748b'),
		);
		this.add
			.text(
				width - 24,
				20,
				`ROOM ${state.code}`,
				this.textStyle(16, '#a3e635', true),
			)
			.setOrigin(1, 0);
		this.add
			.text(
				width - 24,
				46,
				`${state.players.length}/${state.maximumPlayers} · round ${state.round}`,
				this.textStyle(12, '#94a3b8'),
			)
			.setOrigin(1, 0);
		this.timerText = this.add.text(24, 74, '', this.textStyle(12, '#64748b'));
	}

	private buildStabilityMeter(): void {
		const x = this.colX();
		const w = this.colW();
		const y = 96;
		this.staticGfx!.fillStyle(0x131d35, 1).fillRoundedRect(x, y, w, 22, 8);
		this.staticGfx!.lineStyle(1, 0x334155, 0.8).strokeRoundedRect(
			x,
			y,
			w,
			22,
			8,
		);
		this.add.text(
			x,
			y - 20,
			'SHARED STABILITY',
			this.textStyle(11, '#8fa4c7', true),
		);
		this.stabilityText = this.add
			.text(x + w, y - 20, '', this.textStyle(11, '#cbd5e1', true))
			.setOrigin(1, 0);
	}

	private buildLobby(state: CommonPulseState): void {
		const { height } = logicalViewport(this.scale);
		const x = this.colX();
		const w = this.colW();
		const top = 150;
		this.panel(x, top, w, 120);
		this.add.text(
			x + 18,
			top + 16,
			`ROOM ${state.code}`,
			this.textStyle(30, '#f8fafc', true),
		);
		this.add.text(
			x + 18,
			top + 58,
			`Share the code. Every Player gets one channel.\nWaiting for ${state.minimumPlayers}–${state.maximumPlayers} Players.`,
			this.textStyle(14, '#94a3b8', false, w - 36),
		);

		this.buildChannelRoster(state, x, top + 140, w);

		if (state.you.isHost) {
			const ready = state.players.length >= state.minimumPlayers;
			this.makeButton(
				x,
				height - 176,
				w,
				66,
				ready ? 'Start the Pulse' : 'Need at least 2 Players',
				() => void this.startGame(),
				ready ? 0x2563eb : 0x334155,
			);
		} else {
			this.panel(x, height - 176, w, 66);
			this.add
				.text(
					x + w / 2,
					height - 143,
					'Waiting for the Host to start…',
					this.textStyle(15, '#cbd5e1', true),
				)
				.setOrigin(0.5);
		}
	}

	private buildChannelRoster(
		state: CommonPulseState,
		x: number,
		y: number,
		w: number,
	): void {
		this.add.text(
			x,
			y,
			'CHANNELS IN PLAY',
			this.textStyle(11, '#8fa4c7', true),
		);
		const gap = 8;
		const rowH = 52;
		state.players.forEach((player, index) => {
			const rowY = y + 24 + index * (rowH + gap);
			const mine = player.id === state.you.id;
			this.panel(x, rowY, w, rowH, mine ? 0x263554 : 0x172238);
			this.staticGfx!.fillStyle(hex(player.channelColor), 1).fillRoundedRect(
				x + 12,
				rowY + 12,
				10,
				rowH - 24,
				4,
			);
			this.add.text(
				x + 32,
				rowY + 9,
				`${player.channelLabel}${mine ? '  (you)' : ''}`,
				this.textStyle(15, '#f8fafc', true),
			);
			this.add.text(
				x + 32,
				rowY + 30,
				player.name,
				this.textStyle(12, '#94a3b8'),
			);
		});
	}

	private buildActiveControls(state: CommonPulseState): void {
		const { height } = logicalViewport(this.scale);
		const x = this.colX();
		const w = this.colW();

		this.holdButton = this.add
			.rectangle(x, height - 200, w, 78, hex(state.you.channelColor), 1)
			.setOrigin(0)
			.setInteractive({ useHandCursor: true });
		this.holdButton.on(Phaser.Input.Events.POINTER_DOWN, () =>
			this.pressChannel(),
		);
		this.add
			.text(
				x + w / 2,
				height - 176,
				`HOLD — ${state.you.channelLabel}`,
				this.textStyle(20, '#0b1020', true),
			)
			.setOrigin(0.5);
		this.add
			.text(
				x + w / 2,
				height - 150,
				'press and hold to feed your channel',
				this.textStyle(11, '#0b1020', false),
			)
			.setOrigin(0.5)
			.setAlpha(0.75);

		this.buildEmoteRow(height - 96);
	}

	private buildCompleteControls(state: CommonPulseState): void {
		const { height } = logicalViewport(this.scale);
		const x = this.colX();
		const w = this.colW();
		const top = 150;
		this.panel(x, top, w, 128, 0x11302a);
		this.add.text(
			x + 18,
			top + 16,
			'PULSE LOCKED',
			this.textStyle(26, '#86efac', true),
		);
		this.add.text(
			x + 18,
			top + 54,
			`Round ${state.round} • held for ${state.elapsedSeconds}s\nWho called the moves? Offer another round without prompting.`,
			this.textStyle(14, '#cbd5e1', false, w - 36),
		);

		this.makeButton(
			x,
			height - 200,
			w * 0.56 - 6,
			66,
			'Pulse again',
			() => void this.restart(),
			0x2563eb,
		);
		this.makeButton(
			x + w * 0.56 + 6,
			height - 200,
			w * 0.44 - 6,
			66,
			'Finish & log out',
			() => void this.logout(),
			0x334155,
		);

		this.buildEmoteRow(height - 96);
	}

	private buildEmoteRow(y: number): void {
		const x = this.colX();
		const w = this.colW();
		const gap = 8;
		const size = (w - gap * (EMOTES.length - 1)) / EMOTES.length;
		EMOTES.forEach((emote, index) => {
			const bx = x + index * (size + gap);
			const button = this.add
				.rectangle(bx, y, size, 40, 0x1e293b, 1)
				.setOrigin(0)
				.setInteractive({ useHandCursor: true });
			button.on(Phaser.Input.Events.POINTER_DOWN, () => void this.emote(emote));
			button.on(Phaser.Input.Events.POINTER_OVER, () => button.setAlpha(0.8));
			button.on(Phaser.Input.Events.POINTER_OUT, () => button.setAlpha(1));
			this.add
				.text(bx + size / 2, y + 20, emote, this.textStyle(18, '#f8fafc'))
				.setOrigin(0.5);
		});
	}

	private buildVariantSwitcher(): void {
		const { width, height } = logicalViewport(this.scale);
		const y = height - 26;
		this.panel(width / 2 - 132, y - 17, 264, 34, 0x020617);
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
		const params = this.params();
		params.set('variant', this.variant);
		window.history.replaceState(
			{},
			'',
			`${window.location.pathname}?${params.toString()}`,
		);
		this.rebuild();
	}

	// ---- dynamic drawing (every frame) ----------------------------------------

	private contentArea(): { x: number; y: number; w: number; h: number } {
		const { height } = logicalViewport(this.scale);
		const x = this.colX();
		return { x, y: 138, w: this.colW(), h: height - 138 - 250 };
	}

	private drawSharedDynamic(): void {
		const state = this.state!;
		const x = this.colX();
		const w = this.colW();
		const y = 96;
		const pct = state.stability / state.goalStability;
		const good = state.phase === 'complete' || state.inBand;
		this.dynGfx!.fillStyle(good ? 0x34d399 : 0xf59e0b, 1).fillRoundedRect(
			x + 2,
			y + 2,
			Math.max(0, (w - 4) * pct),
			18,
			6,
		);
	}

	private drawOrbDynamic(): void {
		const state = this.state!;
		const area = this.contentArea();
		const cx = area.x + area.w / 2;
		const top = area.y + 20;
		const bottom = area.y + area.h - 20;
		const span = bottom - top;
		const toY = (level: number): number => bottom - (level / 100) * span;

		// vertical guide
		this.dynGfx!.lineStyle(2, 0x1e293b, 1);
		this.dynGfx!.beginPath();
		this.dynGfx!.moveTo(cx, top);
		this.dynGfx!.lineTo(cx, bottom);
		this.dynGfx!.strokePath();

		// target band
		const halfPix = (state.targetWidth / 2 / 100) * span;
		const bandTop = toY(this.displayTarget) - halfPix;
		const bandColor = state.inBand ? 0x14532d : 0x3f2d0a;
		const edgeColor = state.inBand ? 0x34d399 : 0xf59e0b;
		this.dynGfx!.fillStyle(bandColor, 0.55).fillRoundedRect(
			cx - 96,
			bandTop,
			192,
			halfPix * 2,
			10,
		);
		this.dynGfx!.lineStyle(2, edgeColor, 0.9).strokeRoundedRect(
			cx - 96,
			bandTop,
			192,
			halfPix * 2,
			10,
		);

		// orb (heartbeat)
		const beat = 1 + Math.sin(this.time.now / 260) * 0.06;
		const orbY = toY(this.displayLevel);
		const orbColor = hex(state.you.channelColor);
		this.dynGfx!.fillStyle(edgeColor, 0.18).fillCircle(cx, orbY, 46 * beat);
		this.dynGfx!.fillStyle(orbColor, 1).fillCircle(cx, orbY, 26 * beat);
		this.dynGfx!.lineStyle(3, 0xf8fafc, 0.85).strokeCircle(cx, orbY, 26 * beat);
	}

	private drawMixerDynamic(): void {
		const state = this.state!;
		const area = this.contentArea();
		const trackY = area.y + 30;
		const trackX = area.x + 12;
		const trackW = area.w - 24;
		const toX = (level: number): number => trackX + (level / 100) * trackW;

		// value axis
		this.dynGfx!.fillStyle(0x1e293b, 1).fillRoundedRect(
			trackX,
			trackY,
			trackW,
			12,
			6,
		);
		// target band on the axis
		const halfPix = (state.targetWidth / 2 / 100) * trackW;
		const edgeColor = state.inBand ? 0x34d399 : 0xf59e0b;
		this.dynGfx!.fillStyle(edgeColor, 0.3).fillRoundedRect(
			toX(this.displayTarget) - halfPix,
			trackY - 6,
			halfPix * 2,
			24,
			6,
		);
		// current level marker
		this.dynGfx!.fillStyle(0xf8fafc, 1).fillCircle(
			toX(this.displayLevel),
			trackY + 6,
			10,
		);
		this.dynGfx!.fillStyle(hex(state.you.channelColor), 1).fillCircle(
			toX(this.displayLevel),
			trackY + 6,
			6,
		);

		// per-player channel tiles that light when held
		const tilesTop = trackY + 46;
		const count = state.players.length;
		const gap = 8;
		const tileW = (area.w - gap * (count - 1)) / count;
		const tileH = Math.min(150, area.h - 90);
		state.players.forEach((player, index) => {
			const tx = area.x + index * (tileW + gap);
			const color = hex(player.channelColor);
			const held = player.id === state.you.id ? this.localHeld : player.held;
			this.dynGfx!.fillStyle(color, held ? 0.92 : 0.14).fillRoundedRect(
				tx,
				tilesTop,
				tileW,
				tileH,
				10,
			);
			this.dynGfx!.lineStyle(2, color, held ? 1 : 0.4).strokeRoundedRect(
				tx,
				tilesTop,
				tileW,
				tileH,
				10,
			);
			// held-level fill rising from the bottom of the tile
			if (held) {
				this.dynGfx!.fillStyle(0xf8fafc, 0.18).fillRoundedRect(
					tx + 6,
					tilesTop + tileH - 26,
					tileW - 12,
					20,
					6,
				);
			}
		});
	}

	private drawWaveformDynamic(): void {
		const area = this.contentArea();
		const now = this.time.now;
		const toY = (level: number): number =>
			area.y + area.h - 10 - (level / 100) * (area.h - 20);
		const toX = (t: number): number =>
			area.x + area.w - ((now - t) / WAVEFORM_WINDOW_MS) * area.w;

		// frame
		this.dynGfx!.lineStyle(1, 0x1e293b, 1).strokeRoundedRect(
			area.x,
			area.y,
			area.w,
			area.h,
			10,
		);

		const visible = this.waveform.filter(
			(s) => now - s.t <= WAVEFORM_WINDOW_MS,
		);
		if (visible.length < 2) return;

		// band ribbon
		this.dynGfx!.fillStyle(0x34d399, 0.12);
		this.dynGfx!.beginPath();
		this.dynGfx!.moveTo(
			toX(visible[0].t),
			toY(visible[0].center + visible[0].width / 2),
		);
		visible.forEach((s) =>
			this.dynGfx!.lineTo(toX(s.t), toY(s.center + s.width / 2)),
		);
		for (let i = visible.length - 1; i >= 0; i -= 1) {
			const s = visible[i];
			this.dynGfx!.lineTo(toX(s.t), toY(s.center - s.width / 2));
		}
		this.dynGfx!.closePath();
		this.dynGfx!.fillPath();

		// band centre line
		this.dynGfx!.lineStyle(1, 0x34d399, 0.5).beginPath();
		this.dynGfx!.moveTo(toX(visible[0].t), toY(visible[0].center));
		visible.forEach((s) => this.dynGfx!.lineTo(toX(s.t), toY(s.center)));
		this.dynGfx!.strokePath();

		// level trace
		const color = hex(this.state!.you.channelColor);
		this.dynGfx!.lineStyle(3, color, 1).beginPath();
		this.dynGfx!.moveTo(toX(visible[0].t), toY(visible[0].level));
		visible.forEach((s) => this.dynGfx!.lineTo(toX(s.t), toY(s.level)));
		this.dynGfx!.strokePath();

		const last = visible[visible.length - 1];
		this.dynGfx!.fillStyle(0xf8fafc, 1).fillCircle(
			toX(last.t),
			toY(last.level),
			5,
		);
	}

	private sampleWaveform(): void {
		const state = this.state;
		if (!state || state.phase !== 'active') return;
		const now = this.time.now;
		if (now - this.lastSampleAt < WAVEFORM_SAMPLE_MS) return;
		this.lastSampleAt = now;
		this.waveform.push({
			t: now,
			level: this.displayLevel,
			center: this.displayTarget,
			width: state.targetWidth,
		});
		this.waveform = this.waveform.filter(
			(s) => now - s.t <= WAVEFORM_WINDOW_MS + 500,
		);
	}

	private updateDynamicText(): void {
		const state = this.state;
		if (!state) return;
		this.hintText?.setText(this.errorMessage ?? state.you.hint);
		this.hintText?.setColor(this.errorMessage ? '#fda4af' : '#cbd5e1');
		this.stabilityText?.setText(
			`${Math.round(state.stability)}% ${state.phase === 'active' ? (state.inBand ? '· in band' : '· drifting') : ''}`,
		);
		if (this.timerText) {
			this.timerText.setText(
				state.phase === 'active'
					? `live · ${state.elapsedSeconds}s`
					: state.phase.toUpperCase(),
			);
		}
		if (this.logText) {
			const lines = state.events
				.slice(-3)
				.map((event) => event.message)
				.join('\n');
			this.logText.setText(lines);
		}
	}

	// ---- small drawing helpers ------------------------------------------------

	private colW(): number {
		const { width } = logicalViewport(this.scale);
		return Math.min(width - 40, 460);
	}

	private colX(): number {
		const { width } = logicalViewport(this.scale);
		return (width - this.colW()) / 2;
	}

	private panel(
		x: number,
		y: number,
		w: number,
		h: number,
		color = 0x131d35,
	): void {
		this.staticGfx!.fillStyle(color, 1).fillRoundedRect(x, y, w, h, 10);
		this.staticGfx!.lineStyle(1, 0x334155, 0.8).strokeRoundedRect(
			x,
			y,
			w,
			h,
			10,
		);
	}

	private makeButton(
		x: number,
		y: number,
		width: number,
		height: number,
		label: string,
		onClick: () => void,
		color: number,
		fontSize = 16,
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
			resolution: RENDER_DENSITY,
			wordWrap: wordWrapWidth ? { width: wordWrapWidth } : undefined,
			lineSpacing: 5,
		};
	}
}
