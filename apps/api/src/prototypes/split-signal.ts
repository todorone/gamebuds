import { Hono } from 'hono';

import type { AppEnv } from '../env.js';

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 4;
const TOTAL_ROUNDS = 3;
const MAX_STABILITY = 3;
const ROOM_CODE_LENGTH = 6;
const NODE_DEFINITIONS = [
	{ id: 'amber', label: 'Amber relay', color: '#fbbf24' },
	{ id: 'violet', label: 'Violet coil', color: '#a78bfa' },
	{ id: 'cyan', label: 'Cyan gate', color: '#22d3ee' },
	{ id: 'rose', label: 'Rose shield', color: '#fb7185' },
] as const;

type NodeId = (typeof NODE_DEFINITIONS)[number]['id'];
type Phase = 'lobby' | 'active' | 'round-reveal' | 'complete' | 'stopped';
type EventKind =
	'system' | 'ping' | 'repair' | 'mistake' | 'reveal' | 'collapse';

interface Player {
	id: string;
	name: string;
	slot: number;
}

interface GameEvent {
	id: number;
	kind: EventKind;
	playerId?: string;
	targetPlayerId?: string;
	targetNodeId?: NodeId;
	message: string;
}

interface Session {
	code: string;
	phase: Phase;
	players: Player[];
	targetOrder: NodeId[];
	progress: NodeId[];
	round: number;
	stability: number;
	reveal?: {
		round: number;
		order: NodeId[];
	};
	mistakes: number;
	events: GameEvent[];
	nextEventId: number;
}

export interface SplitSignalState {
	code: string;
	phase: Phase;
	minimumPlayers: number;
	maximumPlayers: number;
	players: Array<{
		id: string;
		name: string;
		slot: number;
		isHost: boolean;
		controlledNodeId?: NodeId;
	}>;
	nodes: typeof NODE_DEFINITIONS;
	round: number;
	totalRounds: number;
	stability: number;
	maximumStability: number;
	progress: NodeId[];
	reveal?: {
		round: number;
		order: NodeId[];
	};
	mistakes: number;
	events: GameEvent[];
	you: {
		id: string;
		name: string;
		isHost: boolean;
		controlledNodeId: NodeId;
		clue: string;
	};
}

const sessions = new Map<string, Session>();

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

function getNode(nodeId: NodeId) {
	return NODE_DEFINITIONS.find((node) => node.id === nodeId)!;
}

function isNodeId(value: string): value is NodeId {
	return NODE_DEFINITIONS.some((node) => node.id === value);
}

function getTargetOrder(session: Session): NodeId[] {
	const nodes = NODE_DEFINITIONS.slice(0, session.players.length).map(
		(node) => node.id,
	);
	let order: NodeId[];

	do {
		order = [...nodes];
		for (let index = order.length - 1; index > 0; index -= 1) {
			const swapIndex = Math.floor(Math.random() * (index + 1));
			[order[index], order[swapIndex]] = [order[swapIndex], order[index]];
		}
	} while (
		order.every((nodeId, index) => nodeId === session.targetOrder[index])
	);

	return order;
}

function getClue(session: Session, player: Player): string {
	if (session.phase === 'lobby') {
		return 'The Host will reveal your private signal when the Game starts.';
	}

	const controlledNodeId = NODE_DEFINITIONS[player.slot].id;
	if (session.targetOrder.length === 2) {
		const startNodeId = session.targetOrder[0];
		const fragment =
			controlledNodeId === startNodeId
				? 'A teammate has the start fragment. Ask which signal begins the repair chain.'
				: `The repair chain begins at ${getNode(startNodeId).label}. Ask who holds it.`;

		return `Round ${session.round} private fragment: ${fragment}`;
	}

	const controlledNodeIndex = session.targetOrder.indexOf(controlledNodeId);
	const clueIndex =
		(controlledNodeIndex - 1 + session.targetOrder.length) %
		session.targetOrder.length;
	const fragment =
		clueIndex === 0
			? `The repair chain begins at ${getNode(session.targetOrder[0]).label}.`
			: `${getNode(session.targetOrder[clueIndex]).label} responds immediately after ${getNode(session.targetOrder[clueIndex - 1]).label}.`;

	return `Round ${session.round} private fragment: ${fragment} Ask the Play Group how it connects to their fragments.`;
}

function addEvent(
	session: Session,
	kind: EventKind,
	message: string,
	playerId?: string,
	target?: Pick<GameEvent, 'targetPlayerId' | 'targetNodeId'>,
): void {
	session.events.push({
		id: session.nextEventId++,
		kind,
		message,
		playerId,
		...target,
	});
	session.events = session.events.slice(-12);
}

function getPlayer(session: Session, playerId: string): Player | undefined {
	return session.players.find((player) => player.id === playerId);
}

function serialize(session: Session, playerId: string): SplitSignalState {
	const player = getPlayer(session, playerId);
	if (!player) {
		throw new Error('Player is not in this Game Session');
	}

	return {
		code: session.code,
		phase: session.phase,
		minimumPlayers: MIN_PLAYERS,
		maximumPlayers: MAX_PLAYERS,
		players: session.players.map((member) => ({
			id: member.id,
			name: member.name,
			slot: member.slot,
			isHost: member.slot === 0,
			controlledNodeId:
				member.id === player.id ? NODE_DEFINITIONS[member.slot].id : undefined,
		})),
		nodes: NODE_DEFINITIONS,
		round: session.round,
		totalRounds: TOTAL_ROUNDS,
		stability: session.stability,
		maximumStability: MAX_STABILITY,
		progress: session.progress,
		reveal: session.reveal,
		mistakes: session.mistakes,
		events: session.events,
		you: {
			id: player.id,
			name: player.name,
			isHost: player.slot === 0,
			controlledNodeId: NODE_DEFINITIONS[player.slot].id,
			clue: getClue(session, player),
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
			targetOrder: [],
			progress: [],
			round: 0,
			stability: MAX_STABILITY,
			reveal: undefined,
			mistakes: 0,
			events: [],
			nextEventId: 1,
		};

		sessions.set(code, session);
		addEvent(session, 'system', `${host.name} opened the Game Session.`);

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
		addEvent(session, 'system', `${player.name} joined the Game Session.`);

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
			type?:
				| 'start'
				| 'next-round'
				| 'play-again'
				| 'stop'
				| 'ping'
				| 'repair'
				| 'logout';
			targetPlayerId?: string;
			targetNodeId?: string;
		}>();
		const player = body.playerId
			? getPlayer(session, body.playerId)
			: undefined;
		if (!player || !body.type) {
			return context.json({ error: 'Player and action are required' }, 400);
		}

		if (body.type === 'start') {
			if (player.slot !== 0) {
				return context.json({ error: 'Only the Host can start' }, 403);
			}
			if (session.players.length < MIN_PLAYERS) {
				return context.json({ error: 'At least two Players are needed' }, 409);
			}
			session.phase = 'active';
			session.round = 1;
			session.stability = MAX_STABILITY;
			session.reveal = undefined;
			session.targetOrder = getTargetOrder(session);
			addEvent(
				session,
				'system',
				'The system is unstable. Combine your private signals.',
			);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'ping') {
			if (body.targetPlayerId && body.targetNodeId) {
				return context.json({ error: 'Choose one ping target' }, 400);
			}

			const targetPlayer = body.targetPlayerId
				? getPlayer(session, body.targetPlayerId)
				: undefined;
			if (body.targetPlayerId && !targetPlayer) {
				return context.json(
					{ error: 'Ping target is not in this Game Session' },
					404,
				);
			}
			const targetNodeId = body.targetNodeId;
			if (targetNodeId && !isNodeId(targetNodeId)) {
				return context.json({ error: 'Signal target is not available' }, 404);
			}

			const targetNode =
				targetNodeId && isNodeId(targetNodeId)
					? getNode(targetNodeId)
					: undefined;
			addEvent(
				session,
				'ping',
				targetPlayer
					? `${player.name} pinged ${targetPlayer.name}.`
					: targetNode
						? `${player.name} pinged the ${targetNode.label}.`
						: `${player.name} sent a signal ping.`,
				player.id,
				{
					targetPlayerId: targetPlayer?.id,
					targetNodeId: targetNode?.id,
				},
			);
			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'next-round') {
			if (player.slot !== 0) {
				return context.json({ error: 'Only the Host can continue' }, 403);
			}
			if (session.phase !== 'round-reveal') {
				return context.json({ error: 'Reveal the current round first' }, 409);
			}

			session.round += 1;
			session.targetOrder = getTargetOrder(session);
			session.progress = [];
			session.stability = MAX_STABILITY;
			session.reveal = undefined;
			session.phase = 'active';
			addEvent(
				session,
				'system',
				`Round ${session.round}: compare your private signal fragments.`,
			);

			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'play-again') {
			if (player.slot !== 0) {
				return context.json(
					{ error: 'Only the Host can start another round set' },
					403,
				);
			}
			if (session.phase !== 'complete') {
				return context.json(
					{ error: 'Finish the current round set first' },
					409,
				);
			}

			session.round = 1;
			session.targetOrder = getTargetOrder(session);
			session.progress = [];
			session.stability = MAX_STABILITY;
			session.reveal = undefined;
			session.mistakes = 0;
			session.phase = 'active';
			addEvent(
				session,
				'system',
				`${player.name} chose another three-round repair. Compare your fresh fragments.`,
				player.id,
			);

			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'stop') {
			if (player.slot !== 0) {
				return context.json(
					{ error: 'Only the Host can end the Game Session' },
					403,
				);
			}
			if (session.phase !== 'complete') {
				return context.json(
					{ error: 'Finish the current round set first' },
					409,
				);
			}

			session.phase = 'stopped';
			addEvent(
				session,
				'system',
				`${player.name} chose to stop after the clean ending.`,
				player.id,
			);

			return context.json({ state: serialize(session, player.id) });
		}

		if (body.type === 'logout') {
			if (session.phase !== 'complete' && session.phase !== 'stopped') {
				return context.json(
					{ error: 'Complete the Game Session before logging out' },
					409,
				);
			}

			addEvent(
				session,
				'system',
				`${player.name} logged out of the Game Session.`,
				player.id,
			);
			session.players = session.players.filter(
				(member) => member.id !== player.id,
			);
			if (session.players.length === 0) {
				sessions.delete(code);
			}

			return context.json({ loggedOut: true as const });
		}

		if (session.phase !== 'active') {
			return context.json({ error: 'The Game is not active' }, 409);
		}

		const nodeId = NODE_DEFINITIONS[player.slot].id;
		const expectedNodeId = session.targetOrder[session.progress.length];
		if (nodeId !== expectedNodeId) {
			session.mistakes += 1;
			session.stability -= 1;
			addEvent(
				session,
				'mistake',
				`${player.name} tried their signal too early.`,
				player.id,
			);
			if (session.stability === 0) {
				session.progress = [];
				session.stability = MAX_STABILITY;
				addEvent(
					session,
					'collapse',
					`The system buckled. Round ${session.round} restarts with a fresh charge.`,
				);
			}
			return context.json({ state: serialize(session, player.id) });
		}

		session.progress.push(nodeId);
		addEvent(
			session,
			'repair',
			`${player.name} repaired the ${getNode(nodeId).label}.`,
			player.id,
		);
		if (session.progress.length === session.targetOrder.length) {
			session.reveal = {
				round: session.round,
				order: [...session.targetOrder],
			};
			session.phase =
				session.round === TOTAL_ROUNDS ? 'complete' : 'round-reveal';
			addEvent(
				session,
				'reveal',
				`Round ${session.round} restored. The shared sequence is revealed.`,
			);
			if (session.phase === 'complete') {
				addEvent(
					session,
					'system',
					'The system is stable. The Play Group solved all three rounds together.',
				);
			}
		}

		return context.json({ state: serialize(session, player.id) });
	});

export const splitSignalRoutes = routes;
