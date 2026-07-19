import { Hono } from 'hono';

import type { AppEnv } from '../env.js';

// PROTOTYPE — throwaway networked relay for issue #9 (Common Pulse). Mirrors the
// Split Signal relay shape on purpose so the two cooperative prototypes can be
// observed side by side in the incomplete-block study (ADR 0002). The mechanic
// is DISTINCT: real-time complementary control. Every Player continuously holds
// ONE complementary channel; the shared Pulse only stays inside the moving
// target band when the group balances those channels together. In memory, no
// auth, no D1, no persistence — it exists to put real phones through the
// mechanic cheaply. The production real-time transport question is issue #7.

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const ROOM_CODE_LENGTH = 6;

// Channels are assigned by slot, so who-controls-what is deterministic and
// every added Player takes on a distinct, load-bearing job (see difficulty
// scaling below). Order matters: slot 0 -> rise, slot 1 -> ease, and so on.
const CHANNEL_DEFINITIONS = [
	{
		id: 'rise',
		label: 'Rise',
		color: '#f97316',
		role: 'Hold to lift the Pulse toward a high target.',
	},
	{
		id: 'ease',
		label: 'Ease',
		color: '#38bdf8',
		role: 'Hold to settle the Pulse toward a low target.',
	},
	{
		id: 'steady',
		label: 'Steady',
		color: '#a3e635',
		role: 'Hold to calm the drift so the others can aim.',
	},
	{
		id: 'surge',
		label: 'Surge',
		color: '#e879f9',
		role: 'Hold in bursts to chase a fast-moving target.',
	},
] as const;

type ChannelId = (typeof CHANNEL_DEFINITIONS)[number]['id'];
type Phase = 'lobby' | 'active' | 'complete';
type EventKind = 'system' | 'emote' | 'milestone';

const EMOTES = ['👏', '💪', '😅', '⚠️', '🎉', '👀'] as const;
type Emote = (typeof EMOTES)[number];

// Simulation constants — deliberately tunable; the point of the prototype is to
// discover the right feel with real groups, not to lock these in.
const GOAL_STABILITY = 100;
const START_LEVEL = 50;
const LEVEL_MIN = 0;
const LEVEL_MAX = 100;
const BAND_MIN = 24;
const BAND_MAX = 76;
const DECAY_PER_SEC = 8; // gravity always pulls the Pulse down
const RISE_PER_SEC = 22;
const EASE_PER_SEC = 16;
const SURGE_PER_SEC = 40;
const STEADY_DECAY_RELIEF = 7; // Steady cancels most of gravity
const STEADY_WOBBLE_RELIEF = 0.75; // Steady damps the wobble
const FILL_PER_SEC = 26; // Stability gained while in band
const DRAIN_PER_SEC = 18; // Stability lost while out of band
const MAX_DT_SECONDS = 0.5; // clamp so a backgrounded tab cannot fast-forward

interface Player {
	id: string;
	name: string;
	slot: number;
}

interface GameEvent {
	id: number;
	kind: EventKind;
	playerId?: string;
	message: string;
}

interface Session {
	code: string;
	phase: Phase;
	players: Player[];
	held: Record<string, boolean>; // playerId -> is the channel currently held
	level: number;
	targetCenter: number;
	targetDirection: 1 | -1;
	stability: number;
	round: number;
	elapsedMs: number; // active-phase time, drives the wobble and the clock
	lastTickAt: number; // wall clock, so the Pulse evolves between polls
	events: GameEvent[];
	nextEventId: number;
}

export interface CommonPulseState {
	code: string;
	phase: Phase;
	minimumPlayers: number;
	maximumPlayers: number;
	round: number;
	level: number;
	targetCenter: number;
	targetWidth: number;
	bandMin: number;
	bandMax: number;
	levelMin: number;
	levelMax: number;
	inBand: boolean;
	stability: number;
	goalStability: number;
	elapsedSeconds: number;
	players: Array<{
		id: string;
		name: string;
		slot: number;
		isHost: boolean;
		channelId: ChannelId;
		channelLabel: string;
		channelColor: string;
		held: boolean;
	}>;
	channels: Array<{
		id: ChannelId;
		label: string;
		color: string;
		role: string;
	}>;
	events: GameEvent[];
	you: {
		id: string;
		name: string;
		isHost: boolean;
		channelId: ChannelId;
		channelLabel: string;
		channelColor: string;
		channelRole: string;
		held: boolean;
		hint: string;
	};
}

const sessions = new Map<string, Session>();

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function makeId(prefix: string): string {
	return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

function makeRoomCode(): string {
	const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	let code = '';

	while (!code || sessions.has(code)) {
		code = Array.from({ length: ROOM_CODE_LENGTH }, () =>
			alphabet.charAt(Math.floor(Math.random() * alphabet.length)),
		).join('');
	}

	return code;
}

function channelOf(player: Player): (typeof CHANNEL_DEFINITIONS)[number] {
	return CHANNEL_DEFINITIONS[player.slot];
}

// Difficulty scales with group size so every channel stays load-bearing: with
// more Players the target moves faster, the band narrows, and the wobble grows,
// which is exactly what the added Steady and Surge channels exist to tame. This
// is how the 2–4 floor (ADR 0005) is respected — the core Rise/Ease pair works
// at two, and three and four are not passengers.
function targetSpeed(count: number): number {
	return 5 + count * 3;
}

function targetWidth(count: number): number {
	return 30 - count * 2;
}

function wobbleAmplitude(count: number): number {
	return count * 1.2;
}

function isHeld(session: Session, channelId: ChannelId): boolean {
	const player = session.players.find(
		(member) => channelOf(member).id === channelId,
	);
	return Boolean(player && session.held[player.id]);
}

function addEvent(
	session: Session,
	kind: EventKind,
	message: string,
	playerId?: string,
): void {
	session.events.push({
		id: session.nextEventId++,
		kind,
		message,
		playerId,
	});
	session.events = session.events.slice(-12);
}

function getPlayer(session: Session, playerId: string): Player | undefined {
	return session.players.find((player) => player.id === playerId);
}

function startRound(session: Session, now: number): void {
	session.phase = 'active';
	session.level = START_LEVEL;
	session.targetCenter = START_LEVEL;
	session.targetDirection = 1;
	session.stability = 0;
	session.elapsedMs = 0;
	session.lastTickAt = now;
	session.held = {};
}

// Advance the shared simulation by real elapsed time. It runs lazily on every
// read and action rather than on a background timer, which keeps the relay a
// plain stateless-between-requests Worker while still feeling real-time as long
// as someone is polling (the client polls a few times a second).
function advance(session: Session, now: number): void {
	if (session.phase !== 'active') {
		session.lastTickAt = now;
		return;
	}

	const dt = Math.min((now - session.lastTickAt) / 1000, MAX_DT_SECONDS);
	session.lastTickAt = now;
	if (dt <= 0) {
		return;
	}
	session.elapsedMs += dt * 1000;

	const count = session.players.length;
	const steadyHeld = isHeld(session, 'steady');

	let rate = -DECAY_PER_SEC;
	if (isHeld(session, 'rise')) rate += RISE_PER_SEC;
	if (isHeld(session, 'ease')) rate -= EASE_PER_SEC;
	if (isHeld(session, 'surge')) rate += SURGE_PER_SEC;
	if (steadyHeld) rate += STEADY_DECAY_RELIEF;

	const amplitude =
		wobbleAmplitude(count) * (steadyHeld ? 1 - STEADY_WOBBLE_RELIEF : 1);
	rate += amplitude * Math.sin(session.elapsedMs / 900);
	session.level = clamp(session.level + rate * dt, LEVEL_MIN, LEVEL_MAX);

	const speed = targetSpeed(count);
	session.targetCenter += session.targetDirection * speed * dt;
	if (session.targetCenter >= BAND_MAX) {
		session.targetCenter = BAND_MAX;
		session.targetDirection = -1;
	} else if (session.targetCenter <= BAND_MIN) {
		session.targetCenter = BAND_MIN;
		session.targetDirection = 1;
	}

	const width = targetWidth(count);
	const inBand = Math.abs(session.level - session.targetCenter) <= width / 2;
	session.stability = clamp(
		session.stability + (inBand ? FILL_PER_SEC : -DRAIN_PER_SEC) * dt,
		0,
		GOAL_STABILITY,
	);

	if (session.stability >= GOAL_STABILITY) {
		session.phase = 'complete';
		addEvent(
			session,
			'milestone',
			'The Play Group locked the Common Pulse together.',
		);
	}
}

function hintFor(session: Session, player: Player): string {
	if (session.phase === 'lobby') {
		return 'The Host starts the Pulse once everyone has a channel.';
	}
	if (session.phase === 'complete') {
		return 'Locked it. Offer another round — or finish and log out.';
	}

	const channel = channelOf(player);
	const width = targetWidth(session.players.length);
	const gap = session.level - session.targetCenter;
	if (Math.abs(gap) <= width / 2) {
		return `In the band — ${channel.label}, help hold it here.`;
	}
	return gap < 0
		? `Pulse is BELOW the target. ${channel.role}`
		: `Pulse is ABOVE the target. ${channel.role}`;
}

function serialize(session: Session, playerId: string): CommonPulseState {
	const player = getPlayer(session, playerId);
	if (!player) {
		throw new Error('Player is not in this Game Session');
	}

	const count = session.players.length;
	const width = targetWidth(count);
	const inBand = Math.abs(session.level - session.targetCenter) <= width / 2;

	return {
		code: session.code,
		phase: session.phase,
		minimumPlayers: MIN_PLAYERS,
		maximumPlayers: MAX_PLAYERS,
		round: session.round,
		level: session.level,
		targetCenter: session.targetCenter,
		targetWidth: width,
		bandMin: BAND_MIN,
		bandMax: BAND_MAX,
		levelMin: LEVEL_MIN,
		levelMax: LEVEL_MAX,
		inBand,
		stability: session.stability,
		goalStability: GOAL_STABILITY,
		elapsedSeconds: Math.floor(session.elapsedMs / 1000),
		players: session.players.map((member) => {
			const channel = channelOf(member);
			return {
				id: member.id,
				name: member.name,
				slot: member.slot,
				isHost: member.slot === 0,
				channelId: channel.id,
				channelLabel: channel.label,
				channelColor: channel.color,
				held: Boolean(session.held[member.id]),
			};
		}),
		channels: CHANNEL_DEFINITIONS.slice(0, count).map((channel) => ({
			id: channel.id,
			label: channel.label,
			color: channel.color,
			role: channel.role,
		})),
		events: session.events,
		you: {
			id: player.id,
			name: player.name,
			isHost: player.slot === 0,
			channelId: channelOf(player).id,
			channelLabel: channelOf(player).label,
			channelColor: channelOf(player).color,
			channelRole: channelOf(player).role,
			held: Boolean(session.held[player.id]),
			hint: hintFor(session, player),
		},
	};
}

const routes = new Hono<AppEnv>()
	.post('/sessions', async (context) => {
		const body = await context.req.json<{ name?: string }>();
		const code = makeRoomCode();
		const host: Player = {
			id: makeId('player'),
			name: body.name?.trim() || 'Host',
			slot: 0,
		};
		const session: Session = {
			code,
			phase: 'lobby',
			players: [host],
			held: {},
			level: START_LEVEL,
			targetCenter: START_LEVEL,
			targetDirection: 1,
			stability: 0,
			round: 1,
			elapsedMs: 0,
			lastTickAt: Date.now(),
			events: [],
			nextEventId: 1,
		};

		sessions.set(code, session);
		addEvent(session, 'system', `${host.name} opened the Pulse chamber.`);

		return context.json(
			{ playerId: host.id, state: serialize(session, host.id) },
			201,
		);
	})
	.post('/sessions/:code/players', async (context) => {
		const code = context.req.param('code').toUpperCase();
		const session = sessions.get(code);
		if (!session) {
			return context.json({ error: 'Game Session not found' }, 404);
		}
		if (session.phase !== 'lobby') {
			return context.json({ error: 'This Game Session already started' }, 409);
		}
		if (session.players.length >= MAX_PLAYERS) {
			return context.json({ error: 'This Game Session is full' }, 409);
		}

		const body = await context.req.json<{ name?: string }>();
		const player: Player = {
			id: makeId('player'),
			name: body.name?.trim() || `Player ${session.players.length + 1}`,
			slot: session.players.length,
		};
		session.players.push(player);
		addEvent(
			session,
			'system',
			`${player.name} took the ${channelOf(player).label} channel.`,
		);

		return context.json(
			{ playerId: player.id, state: serialize(session, player.id) },
			201,
		);
	})
	.get('/sessions/:code', (context) => {
		const code = context.req.param('code').toUpperCase();
		const playerId = context.req.query('playerId');
		const session = sessions.get(code);
		if (!session) {
			return context.json({ error: 'Game Session not found' }, 404);
		}
		if (!playerId || !getPlayer(session, playerId)) {
			return context.json({ error: 'Player identity required' }, 401);
		}

		advance(session, Date.now());
		return context.json({ state: serialize(session, playerId) });
	})
	.post('/sessions/:code/actions', async (context) => {
		const code = context.req.param('code').toUpperCase();
		const session = sessions.get(code);
		if (!session) {
			return context.json({ error: 'Game Session not found' }, 404);
		}

		const body = await context.req.json<{
			playerId?: string;
			type?: 'start' | 'channel' | 'emote' | 'again' | 'logout';
			held?: boolean;
			emote?: string;
		}>();
		const player = body.playerId
			? getPlayer(session, body.playerId)
			: undefined;
		if (!player || !body.type) {
			return context.json({ error: 'Player and action are required' }, 400);
		}

		const now = Date.now();
		// Settle the running integral up to this instant with the OLD held state
		// before any held state changes, so no time is mis-attributed.
		advance(session, now);

		if (body.type === 'start') {
			if (player.slot !== 0) {
				return context.json({ error: 'Only the Host can start' }, 403);
			}
			if (session.players.length < MIN_PLAYERS) {
				return context.json({ error: 'At least two Players are needed' }, 409);
			}
			startRound(session, now);
			addEvent(
				session,
				'system',
				'The Pulse is live. Keep it inside the moving band together.',
			);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'channel') {
			if (session.phase !== 'active') {
				return context.json({ error: 'The Pulse is not live' }, 409);
			}
			session.held[player.id] = Boolean(body.held);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'emote') {
			const emote = body.emote as Emote | undefined;
			if (!emote || !EMOTES.includes(emote)) {
				return context.json({ error: 'Unknown reaction' }, 400);
			}
			addEvent(session, 'emote', `${player.name} reacted ${emote}`, player.id);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'again') {
			if (session.phase !== 'complete') {
				return context.json(
					{ error: 'Finish the current round before restarting' },
					409,
				);
			}
			session.round += 1;
			startRound(session, now);
			addEvent(
				session,
				'system',
				`${player.name} restarted the Pulse for round ${session.round}.`,
			);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'logout') {
			if (session.phase !== 'complete') {
				return context.json(
					{ error: 'Complete the round before logging out' },
					409,
				);
			}

			addEvent(
				session,
				'system',
				`${player.name} logged out of the Game Session.`,
				player.id,
			);
			delete session.held[player.id];
			session.players = session.players.filter(
				(member) => member.id !== player.id,
			);
			if (session.players.length === 0) {
				sessions.delete(code);
			}

			return context.json({ loggedOut: true as const });
		}

		return context.json({ error: 'Unknown action' }, 400);
	});

export const commonPulseRoutes = routes;
